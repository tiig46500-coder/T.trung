import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Since we are using ESM and compiling to CommonJS in production, handle __dirname safely
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Increase request size limit for image uploads
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Initialize Gemini client on the server side
let ai: GoogleGenAI | null = null;
try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Gemini API initialized successfully.");
  } else {
    console.warn("GEMINI_API_KEY is not defined in the environment. Gemini OCR/parsing will be simulated or fail gracefully.");
  }
} catch (error) {
  console.error("Failed to initialize Gemini API client:", error);
}

// API endpoint to parse documents or photos containing vocabulary
app.post("/api/parse-document", async (req, res) => {
  const { imageBase64, mimeType, pastedText } = req.body;

  if (!ai) {
    return res.status(500).json({
      error: "Gemini API client is not initialized on the server. Please configure GEMINI_API_KEY in Settings > Secrets.",
    });
  }

  try {
    let contents: any[] = [];
    let systemPrompt = `You are an expert Chinese Language Teacher. Your task is to analyze the provided material (either an uploaded photo/document or pasted text/vocabulary list) and extract or generate exactly 5 to 10 high-quality vocabulary words/phrases for learning.
For each word/phrase, you MUST provide:
1. The simplified Chinese character(s) (character).
2. The correct Pinyin with tone marks (pinyin).
3. The precise Vietnamese translation/meaning (meaning).
4. The part of speech (type) in Vietnamese (e.g., Danh từ, Động từ, Tính từ, Phó từ, Lượng từ, Giới từ, Đại từ).
5. A simple, useful example sentence in Chinese (exampleCn).
6. The Vietnamese translation of that example sentence (exampleVi).

Return the data STRICTLY as a JSON array of objects conforming to the requested schema. Ensure the character and pinyin are correct. If the provided input doesn't contain readable Chinese or enough words, fallback to generating useful, practical daily Chinese communication vocabulary.`;

    if (imageBase64 && mimeType) {
      contents = [
        {
          inlineData: {
            mimeType: mimeType,
            data: imageBase64,
          },
        },
        {
          text: "Hãy phân tích hình ảnh này, quét toàn bộ chữ Hán, dịch nghĩa sang tiếng Việt, cung cấp phiên âm pinyin, từ loại, ví dụ câu tiếng Trung và bản dịch ví dụ tiếng Việt tương ứng. Trả về đúng định dạng JSON theo schema yêu cầu."
        }
      ];
    } else if (pastedText) {
      contents = [
        {
          text: `Hãy phân tích danh sách từ vựng/văn bản sau đây và trích xuất/bổ sung thành danh sách tối đa 10 từ học tập hoàn chỉnh:\n\n${pastedText}`
        }
      ];
    } else {
      return res.status(400).json({ error: "Please provide either an image base64 or pasted text." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "Danh sách từ vựng tiếng Trung trích xuất được",
          items: {
            type: Type.OBJECT,
            properties: {
              character: {
                type: Type.STRING,
                description: "Chữ Hán giản thể",
              },
              pinyin: {
                type: Type.STRING,
                description: "Phiên âm Pinyin kèm dấu thanh điệu",
              },
              meaning: {
                type: Type.STRING,
                description: "Nghĩa tiếng Việt",
              },
              type: {
                type: Type.STRING,
                description: "Từ loại tiếng Việt (ví dụ: Danh từ, Động từ)",
              },
              exampleCn: {
                type: Type.STRING,
                description: "Câu ví dụ tiếng Trung ngắn gọn dễ hiểu",
              },
              exampleVi: {
                type: Type.STRING,
                description: "Dịch nghĩa câu ví dụ sang tiếng Việt",
              },
            },
            required: ["character", "pinyin", "meaning", "type", "exampleCn", "exampleVi"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response text received from Gemini API");
    }

    const words = JSON.parse(text);
    return res.json({ success: true, topicName: "Tài liệu tải lên", words });
  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    return res.status(500).json({
      error: "Có lỗi xảy ra khi xử lý tài liệu bằng Gemini AI.",
      details: error.message || error,
    });
  }
});

// Configure Vite or Static server based on environment
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production files from /dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT} under ${process.env.NODE_ENV || "development"} mode.`);
  });
}

initServer().catch((err) => {
  console.error("Failed to start server:", err);
});
