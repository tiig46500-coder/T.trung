import React, { useState, useRef } from "react";
import { Topic, Word } from "../types";
import { sfx } from "../utils/audio";
import { Upload, FileText, Camera, AlertCircle, RefreshCw, FileCode, CheckCircle, Plus, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface UploadDocProps {
  onAddCustomTopic: (topic: Topic) => void;
}

export const UploadDoc: React.FC<UploadDocProps> = ({ onAddCustomTopic }) => {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("");
  const [pastedText, setPastedText] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successParsedWords, setSuccessParsedWords] = useState<Word[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // File to base64 converter
  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Chỉ hỗ trợ tải lên các tệp tin hình ảnh (JPEG, PNG, WEBP).");
      return;
    }

    setErrorMessage(null);
    setMimeType(file.type);
    
    // Preview URL
    const readerForPreview = new FileReader();
    readerForPreview.onloadend = () => {
      setImagePreviewUrl(readerForPreview.result as string);
    };
    readerForPreview.readAsDataURL(file);

    // Raw Base64 string for API payload
    const readerForBase64 = new FileReader();
    readerForBase64.onload = () => {
      if (typeof readerForBase64.result === "string") {
        const base64Str = readerForBase64.result.split(",")[1];
        setImageBase64(base64Str);
      }
    };
    readerForBase64.readAsDataURL(file);

    sfx.playClick();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleReset = () => {
    setImageBase64(null);
    setImagePreviewUrl(null);
    setPastedText("");
    setSuccessParsedWords([]);
    setErrorMessage(null);
    sfx.playClick();
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
    sfx.playClick();
  };

  // Submit base64 or text to Express server backend (which proxies to Gemini)
  const handleParseDocument = async () => {
    if (!imageBase64 && !pastedText.trim()) {
      setErrorMessage("Vui lòng tải lên một bức ảnh hoặc dán danh sách từ vựng bằng chữ trước.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage("Đang gửi dữ liệu đến máy chủ Express...");

    try {
      setStatusMessage("Gemini AI đang nhận diện chữ viết & biên dịch cấu trúc...");
      const response = await fetch("/api/parse-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          pastedText: pastedText.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Không thể phân tích dữ liệu bằng AI.");
      }

      if (data.words && data.words.length > 0) {
        setSuccessParsedWords(data.words);
        sfx.playSuccess();
        
        // Auto-compile into custom topic and notify parent
        const customTopic: Topic = {
          id: `custom-topic-${Date.now()}`,
          name: "Tài liệu nạp AI " + new Date().toLocaleDateString("vi-VN"),
          description: "Chủ điểm tự tạo từ tài liệu nạp bởi Gemini OCR.",
          icon: "Sparkles",
          words: data.words,
          isCustom: true
        };

        onAddCustomTopic(customTopic);
      } else {
        throw new Error("Không trích xuất được từ vựng nào hợp lệ. Vui lòng thử lại với tài liệu khác.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Đã xảy ra sự cố kết nối máy chủ.");
      sfx.playError();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white border border-teal-50 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col gap-6">
      
      {/* Description header */}
      <div className="text-center">
        <h2 className="text-xl font-extrabold text-slate-800 flex items-center justify-center gap-2">
          <Sparkles className="w-5.5 h-5.5 text-teal-600 animate-pulse" />
          <span>Trích Xuất Từ Vựng OCR bằng AI</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
          Chụp ảnh sách giáo khoa, bảng chữ viết tay, tệp ảnh màn hình chứa tiếng Trung, hoặc dán chữ thô để AI quét dịch và đồng bộ hóa thành bài học Flashcard/Quiz lập tức.
        </p>
      </div>

      <AnimatePresence mode="wait">
        
        {/* PARSING LOADING SCREEN */}
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12 gap-4 text-center"
          >
            <div className="relative flex items-center justify-center">
              <RefreshCw className="w-12 h-12 text-teal-600 animate-spin" />
              <Sparkles className="absolute w-5 h-5 text-yellow-500 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-slate-700">Đang quét tài liệu học tập...</h3>
              <p className="text-xs text-slate-400 mt-1.5 animate-pulse max-w-xs mx-auto">
                {statusMessage}
              </p>
            </div>
          </motion.div>
        )}

        {/* PARSED RESULTS OVERVIEW */}
        {!isLoading && successParsedWords.length > 0 && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-5"
          >
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3 text-emerald-800">
              <CheckCircle className="w-7 h-7 text-emerald-600 shrink-0" />
              <div>
                <h3 className="font-bold text-sm">Nạp bài học OCR thành công!</h3>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Đã quét thành công <span className="font-bold">{successParsedWords.length} từ vựng</span> mới. Hệ thống bài tập Quiz & Flashcard đã tự động đồng bộ hóa.
                </p>
              </div>
            </div>

            {/* List of generated words */}
            <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 flex flex-col gap-2 max-h-60 overflow-y-auto">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Danh sách từ đã quét:</span>
              {successParsedWords.map((word, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg font-sans font-bold text-teal-700">{word.character}</span>
                    <span className="text-xs font-mono text-emerald-600 font-semibold">({word.pinyin})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-700 font-medium block">{word.meaning}</span>
                    <span className="text-[9px] text-slate-400">{word.type}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleReset}
              className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold rounded-2xl shadow transition"
            >
              Tiếp tục nạp thêm tài liệu khác
            </button>
          </motion.div>
        )}

        {/* INPUT UPLOAD PANEL */}
        {!isLoading && successParsedWords.length === 0 && (
          <motion.div
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-5"
          >
            {/* Input Selection Tabs */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* Image Upload Zone */}
              <div className="flex flex-col gap-2 col-span-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Cách 1: Tải ảnh hoặc chụp hình</span>
                
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleTriggerUpload}
                  className={`border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer select-none transition-all duration-300 ${
                    dragOver 
                      ? "border-teal-500 bg-teal-50/30 scale-[0.99]" 
                      : "border-slate-200 hover:border-teal-400 hover:bg-slate-50/50"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />

                  {imagePreviewUrl ? (
                    <div className="relative w-full max-h-40 rounded-2xl overflow-hidden shadow-sm flex items-center justify-center bg-black/5">
                      <img
                        src={imagePreviewUrl}
                        alt="Preview"
                        className="max-h-40 object-contain rounded-2xl"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 hover:bg-black/60 transition flex items-center justify-center text-white text-xs font-semibold">
                        <Camera className="w-5 h-5 mr-1.5" /> Đổi ảnh khác
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center border border-teal-100">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-700">Kéo thả ảnh hoặc chạm để tải lên</p>
                        <p className="text-[11px] text-slate-400 mt-1">Hỗ trợ PNG, JPG, JPEG từ thiết bị hoặc camera</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Paste Text Area */}
              <div className="flex flex-col gap-2 col-span-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Cách 2: Nhập danh sách chữ hoặc dán văn bản</span>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Ví dụ dán: 
你好 nǐ hǎo: xin chào
谢谢 xièxie: cảm ơn
Hoặc dán bất kỳ đoạn văn tiếng Trung nào chứa chữ Hán cần học..."
                  rows={4}
                  className="w-full p-4 border border-slate-200 rounded-2xl text-xs font-sans focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-inner resize-none"
                />
              </div>

            </div>

            {/* Error notifications */}
            {errorMessage && (
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-2 text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submission triggers */}
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                disabled={!imagePreviewUrl && !pastedText.trim()}
                className="px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-2xl text-xs transition disabled:opacity-50"
              >
                Nhập lại
              </button>
              
              <button
                onClick={handleParseDocument}
                disabled={!imageBase64 && !pastedText.trim()}
                className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold rounded-2xl text-xs shadow-md transition disabled:opacity-50 disabled:pointer-events-none"
              >
                AI Phân Tích & Tạo Thẻ Học (Extract)
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
};
export default UploadDoc;
