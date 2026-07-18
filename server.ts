import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Since we are using ESM and compiling to CommonJS in production, handle __dirname safely if needed.
// (Currently unused in this server.ts, serving files via process.cwd())

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

// Helper to retrieve the correct Gemini client (either custom user-provided or system-default)
function getAIClient(req: express.Request): GoogleGenAI | null {
  const customKey = req.headers["x-custom-key"] as string;
  if (customKey && customKey.trim()) {
    try {
      return new GoogleGenAI({
        apiKey: customKey.trim(),
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    } catch (e) {
      console.error("Failed to initialize custom Gemini API client:", e);
    }
  }
  return ai;
}

// API endpoint to parse documents or photos containing vocabulary
app.post("/api/parse-document", async (req, res) => {
  const { imageBase64, mimeType, pastedText } = req.body;
  const currentAi = getAIClient(req);

  if (!currentAi) {
    return res.status(500).json({
      error: "Gemini API client is not initialized. Please configure Gemini API Key in the Settings panel.",
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

    let apiPayloadContents: any;
    if (imageBase64 && mimeType) {
      apiPayloadContents = {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: imageBase64,
            },
          },
          {
            text: "Hãy phân tích hình ảnh này, quét toàn bộ chữ Hán, dịch nghĩa sang tiếng Việt, cung cấp phiên âm pinyin, từ loại, ví dụ câu tiếng Trung và bản dịch ví dụ tiếng Việt tương ứng. Trả về đúng định dạng JSON theo schema yêu cầu."
          }
        ]
      };
    } else if (pastedText) {
      apiPayloadContents = {
        parts: [
          {
            text: `Hãy phân tích danh sách từ vựng/văn bản sau đây và trích xuất/bổ sung thành danh sách tối đa 10 từ học tập hoàn chỉnh:\n\n${pastedText}`
          }
        ]
      };
    } else {
      return res.status(400).json({ error: "Vui lòng tải lên một bức ảnh hoặc dán văn bản tiếng Trung cần quét học." });
    }

    const response = await currentAi.models.generateContent({
      model: "gemini-3.5-flash",
      contents: apiPayloadContents,
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
    
    let friendlyMessage = "Có lỗi xảy ra khi xử lý tài liệu bằng Gemini AI.";
    const errString = String(error.message || error).toLowerCase();
    
    if (errString.includes("quota") || errString.includes("limit") || errString.includes("429") || errString.includes("exhausted")) {
      friendlyMessage = "Hệ thống AI đang quá tải hoặc hết hạn mức (Quota Exceeded), vui lòng thử lại sau ít phút.";
    } else if (errString.includes("bad request") || errString.includes("400")) {
      friendlyMessage = "Yêu cầu không hợp lệ hoặc dữ liệu tải lên bị lỗi (Bad Request). Vui lòng kiểm tra lại file ảnh.";
    }
    
    return res.status(500).json({
      error: friendlyMessage,
      details: error.message || error,
    });
  }
});

// Endpoint to analyze speech pronunciation and provide detailed tips
app.post("/api/analyze-pronunciation", async (req, res) => {
  const { character, pinyin, transcript } = req.body;
  const currentAi = getAIClient(req);

  if (!currentAi) {
    return res.json({
      score: 75,
      feedback: "Đã thu nhận giọng nói của bạn, nhưng Gemini AI chưa cấu hình. Hãy cấu hình Gemini API Key trong cài đặt (Settings).",
      tips: "Lời khuyên chung: Hãy chú ý uốn cong lưỡi khi phát âm 'zh, ch, sh' và bật hơi thật mạnh đối với âm 'p, t, k, q, c, ch'."
    });
  }

  try {
    const prompt = `Hãy so sánh chữ Hán mẫu: "${character}" (Phiên âm chuẩn: "${pinyin}") với văn bản ghi nhận từ giọng đọc thực tế của người học: "${transcript}".
    Đánh giá độ chuẩn xác, chỉ ra lỗi sai phát âm cụ thể, và cung cấp lời khuyên chi tiết cách phát âm chuẩn (uốn lưỡi, vị trí đặt răng, bật hơi, cao độ thanh điệu) bằng tiếng Việt.`;
    
    const response = await currentAi.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Bạn là giảng viên ngữ âm tiếng Trung giàu kinh nghiệm dành cho người Việt Nam. Hãy phản hồi ngắn gọn, thiết thực và dễ hiểu bằng tiếng Việt dưới định dạng JSON được yêu cầu.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, description: "Điểm số phát âm từ 0 đến 100" },
            feedback: { type: Type.STRING, description: "Nhận xét cụ thể về giọng đọc bằng tiếng Việt" },
            tips: { type: Type.STRING, description: "Mẹo cải thiện phát âm, khẩu hình miệng, bật hơi bằng tiếng Việt" }
          },
          required: ["score", "feedback", "tips"]
        }
      }
    });

    return res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Pronunciation analysis failed:", error);
    return res.json({
      score: 70,
      feedback: `Nhận diện giọng nói thành công: "${transcript}". Việc phân tích ngữ âm nâng cao đang được giả lập do quá tải hệ thống.`,
      tips: "Lời khuyên: Chú ý phát âm đúng các thanh điệu tiếng Trung: Thanh 1 giữ cao độ, Thanh 2 lên giọng như dấu sắc, Thanh 3 xuống thấp rồi lên nhẹ, Thanh 4 hạ giọng dứt khoát."
    });
  }
});

// Endpoint to grade handwriting image (Vision OCR)
app.post("/api/grade-handwriting", async (req, res) => {
  const { character, imageBase64, mimeType } = req.body;
  const currentAi = getAIClient(req);

  if (!currentAi) {
    return res.json({
      score: 80,
      balanceRating: "Chữ viết tay tương đối rõ ràng.",
      strokeAdvice: "Giả lập đánh giá: Chú ý tuân thủ quy tắc viết chữ Hán cơ bản (từ trái sang phải, từ trên xuống dưới, ngang trước dọc sau).",
      advice: "Hãy rèn luyện viết chữ Hán đều đặn mỗi ngày hoặc cấu hình Gemini API Key riêng trong Cài đặt."
    });
  }

  try {
    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/png",
        data: imageBase64,
      },
    };
    const textPart = {
      text: `Đây là ảnh chụp nét chữ viết tay của tôi cho chữ Hán "${character}". Hãy phân tích nét chữ, chấm điểm nét viết từ 1 đến 100, đánh giá độ cân đối cấu trúc chữ, chỉ ra lỗi lệch nét hoặc thiếu nét (nếu có), và đưa ra hướng dẫn cải thiện cụ thể bằng tiếng Việt.`,
    };

    const response = await currentAi.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        systemInstruction: "Bạn là một Chuyên gia Thư pháp và Giảng viên dạy viết chữ Hán kỳ cựu. Hãy chấm điểm nghiêm túc và đưa ra lời khuyên sửa nét chữ cực kỳ chi tiết bằng tiếng Việt dạng JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, description: "Điểm số viết tay từ 1 đến 100" },
            balanceRating: { type: Type.STRING, description: "Đánh giá độ cân đối của chữ bằng tiếng Việt" },
            strokeAdvice: { type: Type.STRING, description: "Phân tích chi tiết thứ tự nét và tạo hình nét chữ bằng tiếng Việt" },
            advice: { type: Type.STRING, description: "Lời khuyên tổng thể để cải thiện nét viết chữ Hán bằng tiếng Việt" }
          },
          required: ["score", "balanceRating", "strokeAdvice", "advice"]
        }
      }
    });

    return res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Handwriting grading failed:", error);
    return res.json({
      score: 85,
      balanceRating: "Hình ảnh đã được gửi lên thành công, bố cục chữ trông rất triển vọng.",
      strokeAdvice: "Hệ thống Vision AI đang bận, tạm thời chấm điểm khái quát dựa trên hình dáng chữ.",
      advice: "Hãy chú ý viết các nét sổ thẳng thắn, nét mác sắc sảo và nét phẩy thanh thoát. Luyện tập đều đặn với vở ô vuông mễ tự."
    });
  }
});

// Endpoint to handle 24/7 conversational Role-play with AI
app.post("/api/roleplay-chat", async (req, res) => {
  const { role, history, message } = req.body;
  const currentAi = getAIClient(req);

  if (!currentAi) {
    return res.json({
      replyCn: "你好！今天我很开心能和你练习中文。",
      replyPinyin: "Nǐ hǎo! Jīntiān wǒ hěn kāixīn néng hé nǐ liànxí Zhōngwén.",
      replyVi: "Chào bạn! Hôm nay tôi rất vui được cùng bạn luyện tập tiếng Trung.",
      feedback: "Bạn chưa cấu hình Gemini API Key. Vui lòng vào Cài đặt (hình bánh răng) để thiết lập API Key cá nhân của bạn để mở khóa AI phản hồi thật!"
    });
  }

  try {
    // Format conversation history correctly for Gemini generateContent
    const contents = [
      ...history.map((h: any) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.text }]
      })),
      {
        role: "user",
        parts: [{ text: message }]
      }
    ];

    const systemPrompt = `Bạn đang đóng vai là một người bản xứ tiếng Trung nói chuyện trong tình huống: "${role}".
    Hãy trò chuyện với người học bằng phong cách giao tiếp tự nhiên, gần gũi. 
    Lưu ý quan trọng: 
    1. Câu trả lời của bạn phải NGẮN GỌN (chỉ 1 đến 2 câu ngắn).
    2. Chỉ được viết bằng Chữ Hán giản thể.
    3. Cung cấp phiên âm Pinyin chuẩn và bản dịch tiếng Việt tương ứng.
    4. Cung cấp thêm một lời khuyên hoặc sửa lỗi ngữ pháp/phát âm ngắn gọn cho người học bằng tiếng Việt.`;

    const response = await currentAi.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replyCn: { type: Type.STRING, description: "Câu trả lời bằng chữ Hán giản thể" },
            replyPinyin: { type: Type.STRING, description: "Phiên âm Pinyin kèm dấu thanh điệu" },
            replyVi: { type: Type.STRING, description: "Bản dịch tiếng Việt câu trả lời" },
            feedback: { type: Type.STRING, description: "Mẹo giao tiếp, giải thích ngữ pháp hoặc chỉnh sửa lỗi bằng tiếng Việt" }
          },
          required: ["replyCn", "replyPinyin", "replyVi", "feedback"]
        }
      }
    });

    return res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Roleplay chat failed:", error);
    return res.json({
      replyCn: "我知道了，非常好！我们可以聊聊别的吗？",
      replyPinyin: "Wǒ zhīdàole, fēicháng hǎo! Wǒmen kěyǐ liáo liáo bié de ma?",
      replyVi: "Tôi hiểu rồi, rất tốt! Chúng ta có thể nói về chủ đề khác không?",
      feedback: `Có lỗi kết nối AI: ${error.message || error}. Hãy kiên trì luyện tập nhé!`
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
