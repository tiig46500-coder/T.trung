import React, { useState, useEffect } from "react";
import { Word } from "../types";
import { speakChinese, speakVietnamese } from "../utils/speech";
import { sfx } from "../utils/audio";
import { renderToneColoredPinyin } from "../utils/pinyin";
import { Volume2, Star, RefreshCw, BookOpen, Layers, Mic, CheckCircle, XCircle, AlertCircle, Smile, Sparkles, Send, Keyboard } from "lucide-react";
import { motion } from "motion/react";
import { Waveform } from "./Waveform";

interface FlashcardProps {
  word: Word;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export const Flashcard: React.FC<FlashcardProps> = ({ word, isFavorite, onToggleFavorite }) => {
  const [flipped, setFlipped] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [spokenText, setSpokenText] = useState<string>("");
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(true);
  const [manualText, setManualText] = useState<string>("");
  const [showPracticeOverlay, setShowPracticeOverlay] = useState<boolean>(false);

  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSpeechSupported(!!SpeechRecognitionAPI);
  }, []);

  const handleFlip = () => {
    // Only allow flipping the card if we are not actively practicing
    if (showPracticeOverlay || isListening || spokenText || recognitionError) return;
    setFlipped(!flipped);
    sfx.playClick();
  };

  const handleSpeech = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card flip
    speakChinese(word.character);
    sfx.playClick();
  };

  const handleExampleSpeech = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card flip
    speakChinese(word.exampleCn);
    sfx.playClick();
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card flip
    onToggleFavorite();
    sfx.playClick();
  };

  const cleanPinyin = (str: string) => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  };

  const comparePronunciation = (transcript: string) => {
    const cleanTarget = word.character.replace(/[\s\p{P}]/gu, "");
    const cleanSpoken = transcript.trim().replace(/[\s\p{P}]/gu, "");

    if (!cleanSpoken) {
      setMatchScore(0);
      setFeedbackMessage("Không nhận diện được nội dung. Hãy nhập hoặc nói lại!");
      sfx.playError();
      return;
    }

    const cleanPinyinTarget = cleanPinyin(word.pinyin);
    const cleanPinyinSpoken = cleanPinyin(transcript);

    // Matches characters directly or matches plain pinyin typing
    if (cleanSpoken === cleanTarget || (cleanPinyinSpoken && cleanPinyinSpoken === cleanPinyinTarget)) {
      setMatchScore(100);
      setFeedbackMessage("Chính xác 100%! Phát âm/Mặt chữ hoàn hảo.");
      sfx.playSuccess();
    } else if (
      cleanSpoken.includes(cleanTarget) ||
      cleanTarget.includes(cleanSpoken) ||
      (cleanPinyinSpoken && (cleanPinyinTarget.includes(cleanPinyinSpoken) || cleanPinyinSpoken.includes(cleanPinyinTarget)))
    ) {
      setMatchScore(80);
      setFeedbackMessage("Rất gần chính xác! Bạn làm rất tốt.");
      sfx.playSuccess();
    } else {
      // Character-by-character matches
      let matchCount = 0;
      for (const char of cleanTarget) {
        if (cleanSpoken.includes(char)) {
          matchCount++;
        }
      }
      const score = Math.round((matchCount / cleanTarget.length) * 100);
      if (score >= 50) {
        setMatchScore(score);
        setFeedbackMessage(`Khá tốt (${score}%)! Bạn làm đúng một phần.`);
        sfx.playClick();
      } else {
        setMatchScore(0);
        setFeedbackMessage("Chưa chính xác lắm. Hãy nghe lại audio mẫu và luyện thêm!");
        sfx.playError();
      }
    }
  };

  const startListeningSession = () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setRecognitionError("Trình duyệt không hỗ trợ nhận diện giọng nói.");
      return;
    }

    setRecognitionError(null);
    setSpokenText("");
    setMatchScore(null);
    setFeedbackMessage("");
    setIsListening(true);

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "zh-CN";

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition library warning:", event);
        if (event.error === "not-allowed") {
          setRecognitionError("Quyền truy cập Micro bị chặn. Vui lòng gõ chữ hoặc kiểm tra cài đặt trình duyệt.");
        } else {
          setRecognitionError(`Lỗi ghi âm: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript || "";
        setSpokenText(transcript);
        comparePronunciation(transcript);
      };

      recognition.start();
    } catch (err: any) {
      console.warn("Speech start exception:", err);
      setRecognitionError("Không thể kích hoạt Micro. Hãy thử gõ văn bản.");
      setIsListening(false);
    }
  };

  const handleSpeechRecognition = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card flip
    sfx.playClick();
    setShowPracticeOverlay(true);
    startListeningSession();
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;

    sfx.playClick();
    const typedText = manualText;
    setSpokenText(typedText);
    setManualText("");

    // Stop active speech recognition if typing instead
    setIsListening(false);
    comparePronunciation(typedText);
  };

  const handleWaveformPermissionError = (errorMsg: string) => {
    // Graceful error notification inside the card overlay
    setRecognitionError(errorMsg);
  };

  return (
    <div className="w-full max-w-sm h-[380px] perspective-1000 mx-auto cursor-pointer select-none">
      <div
        onClick={handleFlip}
        className={`relative w-full h-full duration-700 transform-style-3d ${
          flipped ? "rotate-y-180" : ""
        }`}
      >
        {/* FRONT SIDE */}
        <div className="absolute inset-0 w-full h-full backface-hidden bg-white border border-teal-50 rounded-[24px] p-6 flex flex-col justify-between shadow-[0_8px_30px_rgb(13,148,136,0.03)] hover:shadow-[0_12px_40px_rgb(13,148,136,0.06)] transition-all duration-300">
          {/* Top row */}
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-teal-50 text-teal-600 px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Thẻ học từ mới</span>
            </span>
            <button
              onClick={handleFavoriteClick}
              className={`p-2 rounded-xl transition ${
                isFavorite 
                  ? "text-yellow-500 bg-yellow-50 hover:bg-yellow-100" 
                  : "text-slate-300 hover:text-slate-500 hover:bg-slate-50"
              }`}
              title="Yêu thích từ này"
            >
              <Star className={`w-5 h-5 ${isFavorite ? "fill-yellow-400" : ""}`} />
            </button>
          </div>

          {/* Core word rendering */}
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <motion.h2 
              className="text-7xl font-sans font-bold text-slate-800 tracking-tight text-center"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {word.character}
            </motion.h2>
            <div className="bg-teal-50/50 px-5 py-2 rounded-2xl flex items-center justify-center shadow-inner">
              {renderToneColoredPinyin(word.pinyin)}
            </div>
          </div>

          {/* PRONUNCIATION PRACTICE OVERLAY */}
          {(showPracticeOverlay || isListening || spokenText || recognitionError) && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()} // Stop flip when interacting with feedback
              className="absolute inset-x-4 bottom-18 top-18 bg-white/98 backdrop-blur-sm border border-teal-100 rounded-[20px] p-4 flex flex-col justify-between z-10 shadow-lg"
            >
              <div className="flex flex-col items-center justify-center flex-1 text-center gap-2">
                {/* Real-time Waveform Display */}
                <div className="w-full mb-1">
                  <Waveform isListening={isListening} onPermissionError={handleWaveformPermissionError} />
                </div>

                {isListening ? (
                  <>
                    <p className="text-xs font-extrabold text-rose-600 mt-1 animate-pulse">🎤 Đang nghe giọng của bạn...</p>
                    <p className="text-[10px] text-slate-500">Đọc to chữ Hán ở trên hoặc gõ văn bản bên dưới</p>
                  </>
                ) : recognitionError ? (
                  <>
                    <XCircle className="w-8 h-8 text-rose-500" />
                    <p className="text-[11px] font-semibold text-rose-600 leading-tight">{recognitionError}</p>
                  </>
                ) : (
                  <>
                    {matchScore === 100 ? (
                      <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                    ) : matchScore && matchScore >= 50 ? (
                      <div className="w-8 h-8 bg-amber-400 text-white rounded-full flex items-center justify-center shadow-md">
                        <Smile className="w-5 h-5" />
                      </div>
                    ) : matchScore !== null ? (
                      <div className="w-8 h-8 bg-slate-400 text-white rounded-full flex items-center justify-center shadow-md">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-teal-500 text-white rounded-full flex items-center justify-center shadow-md animate-bounce">
                        <Keyboard className="w-5 h-5" />
                      </div>
                    )}
                    
                    {spokenText && (
                      <div className="mt-0.5">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Nhập / Nói:</p>
                        <p className="text-sm font-extrabold text-teal-700 font-sans">"{spokenText}"</p>
                        <p className="text-xs font-bold text-slate-700 mt-1 leading-relaxed">
                          {feedbackMessage}
                        </p>
                      </div>
                    )}

                    {!spokenText && !recognitionError && (
                      <p className="text-xs text-slate-500 font-medium px-4">Hãy nói qua Micro hoặc nhập câu tiếng Trung/pinyin của bạn vào ô dưới đây!</p>
                    )}
                  </>
                )}
              </div>

              {/* Text Fallback Input Container */}
              <form onSubmit={handleTextSubmit} className="flex gap-1.5 mt-2 pt-2 border-t border-slate-100">
                <input
                  type="text"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Gõ tiếng Trung hoặc Pinyin..."
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white text-slate-800"
                />
                <button
                  type="submit"
                  disabled={!manualText.trim()}
                  className="p-1.5 bg-teal-600 hover:bg-teal-700 text-white disabled:bg-slate-200 disabled:text-slate-400 rounded-xl transition duration-150 flex items-center justify-center"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Reset/Done button */}
              <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-100">
                {isSpeechSupported && !isListening && (
                  <button
                    onClick={startListeningSession}
                    className="flex items-center gap-1 text-[11px] font-bold text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition"
                  >
                    <Mic className="w-3 h-3" />
                    <span>Nói lại</span>
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsListening(false);
                    setSpokenText("");
                    setMatchScore(null);
                    setFeedbackMessage("");
                    setRecognitionError(null);
                    setManualText("");
                    setShowPracticeOverlay(false);
                    sfx.playClick();
                  }}
                  className="ml-auto px-4 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          )}

          {/* Bottom guidelines row */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSpeech}
                className="p-2.5 rounded-[14px] bg-teal-50 hover:bg-teal-100 text-teal-600 transition flex items-center gap-1.5"
                title="Phát âm từ vựng"
              >
                <Volume2 className="w-4 h-4" />
                <span className="text-xs font-bold">Nghe</span>
              </button>

              {isSpeechSupported ? (
                <button
                  onClick={handleSpeechRecognition}
                  className={`p-2.5 rounded-[14px] transition flex items-center gap-1.5 ${
                    isListening 
                      ? "bg-rose-500 text-white animate-pulse" 
                      : "bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
                  }`}
                  title="Luyện nói phát âm"
                >
                  <Mic className="w-4 h-4" />
                  <span className="text-xs font-bold">{isListening ? "Đang nghe" : "Luyện nói"}</span>
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    sfx.playClick();
                    setShowPracticeOverlay(true);
                  }}
                  className="p-2.5 rounded-[14px] bg-sky-50 hover:bg-sky-100 text-sky-600 transition flex items-center gap-1.5"
                  title="Gõ phím thay thế"
                >
                  <Keyboard className="w-4 h-4" />
                  <span className="text-xs font-bold">Luyện viết</span>
                </button>
              )}
            </div>

            <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
              <RefreshCw className="w-3.5 h-3.5 text-slate-300 animate-spin-slow" />
              <span>Chạm lật thẻ</span>
            </span>
          </div>
        </div>


        {/* BACK SIDE */}
        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-gradient-to-b from-white to-[#F0F9F9]/30 border border-teal-50 rounded-[24px] p-6 flex flex-col justify-between shadow-[0_8px_30px_rgb(13,148,136,0.03)]">
          {/* Top Row */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-600 px-3.5 py-1.5 rounded-full flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Ý nghĩa &amp; Loại từ</span>
            </span>
            <button
              onClick={handleFavoriteClick}
              className={`p-2 rounded-xl transition ${
                isFavorite 
                  ? "text-yellow-500 bg-yellow-50 hover:bg-yellow-100" 
                  : "text-slate-300 hover:text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Star className={`w-5 h-5 ${isFavorite ? "fill-yellow-400" : ""}`} />
            </button>
          </div>

          {/* Contents definitions */}
          <div className="flex-1 flex flex-col justify-center gap-3 py-2">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Từ loại</span>
              <p className="text-xs text-slate-500 font-bold mt-0.5">{word.type || "Từ vựng"}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nghĩa tiếng Việt</span>
              <h3 className="text-2xl font-black text-teal-700 mt-0.5">{word.meaning}</h3>
            </div>

            {/* Example sentence */}
            {word.exampleCn && (
              <div className="bg-white/80 border border-teal-50/50 rounded-2xl p-3.5 mt-2 shadow-sm">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ví dụ minh họa</span>
                <div className="flex items-start justify-between gap-1">
                  <p className="text-sm font-sans text-slate-700 font-bold leading-relaxed flex-1">
                    {word.exampleCn}
                  </p>
                  <button
                    onClick={handleExampleSpeech}
                    className="p-1 rounded bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition shrink-0 ml-1"
                    title="Nghe câu ví dụ"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1 italic font-sans font-medium">{word.exampleVi}</p>
              </div>
            )}
          </div>

          {/* Bottom Flip back trigger */}
          <div className="flex justify-center border-t border-slate-100 pt-4">
            <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
              <RefreshCw className="w-3.5 h-3.5 text-slate-300" />
              <span>Chạm để quay lại mặt trước</span>
            </span>
          </div>
        </div>
      </div>

      {/* Tailwind Flip animations css */}
      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        .animate-spin-slow {
          animation: spin 6s linear infinite;
        }
      `}</style>
    </div>
  );
};
export default Flashcard;
