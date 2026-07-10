import React, { useState } from "react";
import { Word } from "../types";
import { speakChinese, speakVietnamese } from "../utils/speech";
import { sfx } from "../utils/audio";
import { Volume2, Star, RefreshCw, BookOpen, Layers } from "lucide-react";
import { motion } from "motion/react";

interface FlashcardProps {
  word: Word;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export const Flashcard: React.FC<FlashcardProps> = ({ word, isFavorite, onToggleFavorite }) => {
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => {
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
            <p className="text-xs font-bold text-teal-600 tracking-widest bg-teal-50/50 px-4 py-1.5 rounded-full font-mono">
              {word.pinyin}
            </p>
          </div>

          {/* Bottom guidelines row */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              onClick={handleSpeech}
              className="p-2.5 rounded-[14px] bg-teal-50 hover:bg-teal-100 text-teal-600 transition flex items-center gap-1.5"
              title="Phát âm từ vựng"
            >
              <Volume2 className="w-4 h-4" />
              <span className="text-xs font-bold">Nghe phát âm</span>
            </button>

            <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
              <RefreshCw className="w-3.5 h-3.5 text-slate-300 animate-spin-slow" />
              <span>Chạm để lật mặt sau</span>
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
