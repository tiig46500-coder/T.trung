import React, { useState } from "react";
import { Word, Topic } from "../types";
import { Flashcard } from "./Flashcard";
import { StrokeWriter } from "./StrokeWriter";
import { sfx } from "../utils/audio";
import { Layers, Calendar, RefreshCw, Star, ArrowRight, BrainCircuit, Check, ThumbsUp, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ReviewProps {
  allTopics: Topic[];
  favoriteWords: string[];
  errorWordPool: string[]; // Chinese character strings of words that have been failed
  onToggleFavorite: (character: string) => void;
  onUpdateErrorPool: (character: string, remove: boolean) => void;
}

export const Review: React.FC<ReviewProps> = ({
  allTopics,
  favoriteWords,
  errorWordPool,
  onToggleFavorite,
  onUpdateErrorPool,
}) => {
  const [reviewMode, setReviewMode] = useState<"all" | "spaced" | "favorites">("spaced");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isPracticingWriting, setIsPracticingWriting] = useState(false);

  // Compile words list based on current active tab
  const getReviewWords = (): Word[] => {
    // Flatten all words across all topics
    const allWords = allTopics.flatMap((t) => t.words);
    
    // Remove duplicates
    const uniqueWordsMap = new Map<string, Word>();
    allWords.forEach((w) => uniqueWordsMap.set(w.character, w));
    const uniqueWords = Array.from(uniqueWordsMap.values());

    if (reviewMode === "favorites") {
      return uniqueWords.filter((w) => favoriteWords.includes(w.character));
    }

    if (reviewMode === "spaced") {
      // Spaced repetition words are those that are inside the errorWordPool (highest fail rate)
      // If pool is empty, backfill with some words to help user review
      const fails = uniqueWords.filter((w) => errorWordPool.includes(w.character));
      if (fails.length > 0) return fails;
      
      // Fallback: take first 4 words of each topic
      return uniqueWords.slice(0, 5);
    }

    // Default: "all"
    return uniqueWords;
  };

  const reviewWords = getReviewWords();
  const currentWord = reviewWords[currentWordIndex];

  const handleNext = () => {
    sfx.playClick();
    if (currentWordIndex < reviewWords.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    } else {
      setCurrentWordIndex(0); // Wrap around
    }
    setIsPracticingWriting(false);
  };

  const handleMarkMemorized = () => {
    if (!currentWord) return;
    sfx.playCorrect();
    // Remove from error/spaced repetition pool as it is learned!
    onUpdateErrorPool(currentWord.character, true);
    handleNext();
  };

  const handleMarkForgotten = () => {
    if (!currentWord) return;
    sfx.playError();
    // Add to error/spaced repetition pool to reinforce frequency
    onUpdateErrorPool(currentWord.character, false);
    handleNext();
  };

  const handleTabChange = (mode: "all" | "spaced" | "favorites") => {
    setReviewMode(mode);
    setCurrentWordIndex(0);
    setIsPracticingWriting(false);
    sfx.playClick();
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-6">
      {/* Tab navigation headers */}
      <div className="flex bg-slate-50 p-1 rounded-[20px] border border-slate-200/60 gap-1.5 shadow-sm">
        <button
          onClick={() => handleTabChange("spaced")}
          className={`flex-1 py-2.5 text-xs font-extrabold rounded-[16px] transition flex items-center justify-center gap-1.5 ${
            reviewMode === "spaced"
              ? "bg-white text-teal-600 shadow-sm border border-slate-100"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <BrainCircuit className="w-4 h-4" /> Ôn Tập Hôm Nay
        </button>
        <button
          onClick={() => handleTabChange("favorites")}
          className={`flex-1 py-2.5 text-xs font-extrabold rounded-[16px] transition flex items-center justify-center gap-1.5 ${
            reviewMode === "favorites"
              ? "bg-white text-teal-600 shadow-sm border border-slate-100"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Star className="w-4 h-4 fill-current text-yellow-400" /> Sổ Từ Ưu Thích
        </button>
        <button
          onClick={() => handleTabChange("all")}
          className={`flex-1 py-2.5 text-xs font-extrabold rounded-[16px] transition flex items-center justify-center gap-1.5 ${
            reviewMode === "all"
              ? "bg-white text-teal-600 shadow-sm border border-slate-100"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Layers className="w-4 h-4" /> Kho Tất Cả Từ
        </button>
      </div>

      {/* Description header banner */}
      <div className="bg-[#F0F9F9]/80 border border-teal-50 rounded-[20px] p-4.5 text-center shadow-[0_4px_16px_rgba(13,148,136,0.01)]">
        {reviewMode === "spaced" && (
          <>
            <h3 className="font-extrabold text-sm text-teal-800 flex items-center justify-center gap-1.5">
              <BrainCircuit className="w-4 h-4" /> Thuật toán lặp lại ngắt quãng (Spaced Repetition)
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed font-medium">
              Các từ bạn làm sai ở các vòng thi Quiz sẽ tự động xuất hiện với tần suất cao hơn tại đây để củng cố phản xạ.
            </p>
          </>
        )}
        {reviewMode === "favorites" && (
          <>
            <h3 className="font-extrabold text-sm text-yellow-800 flex items-center justify-center gap-1.5">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-500" /> Danh sách từ vựng được lưu trữ riêng
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
              Tổng cộng có <span className="font-extrabold text-teal-600">{reviewWords.length} từ</span> yêu thích do bạn gắn sao đánh dấu.
            </p>
          </>
        )}
        {reviewMode === "all" && (
          <>
            <h3 className="font-extrabold text-sm text-slate-700 flex items-center justify-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-500" /> Tổng hợp toàn bộ hệ thống từ vựng
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
              Kho tàng tích hợp gồm <span className="font-extrabold text-teal-600">{reviewWords.length} từ</span> từ các chủ điểm đã học và tài liệu OCR đã nạp.
            </p>
          </>
        )}
      </div>

      {/* MAIN CONTAINER CONTENT */}
      {reviewWords.length === 0 ? (
        <div className="bg-white border border-teal-50 rounded-[24px] p-10 text-center shadow-[0_8px_30px_rgba(13,148,136,0.02)]">
          <p className="text-slate-500 font-extrabold text-sm">Danh sách trống trơn!</p>
          <p className="text-xs text-slate-400 mt-2 font-medium leading-relaxed">
            {reviewMode === "favorites" 
              ? "Hãy chạm nút Gắn sao trên các Flashcard để thêm từ yêu thích vào sổ tay."
              : "Bắt đầu làm Quiz và luyện tập để đồng bộ dữ liệu vào hệ thống."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Card Frame with toggle for Flashcard or Writing */}
          <div className="bg-white border border-teal-50 rounded-[24px] p-5 shadow-[0_8px_30px_rgba(13,148,136,0.02)] flex flex-col gap-4">
            <div className="flex justify-between items-center text-xs px-1">
              <span className="font-bold text-slate-500">Từ học {currentWordIndex + 1}/{reviewWords.length}</span>
              
              <button
                onClick={() => {
                  sfx.playClick();
                  setIsPracticingWriting(!isPracticingWriting);
                }}
                className={`px-3.5 py-1.5 rounded-[12px] border text-xs font-bold transition duration-200 ${
                  isPracticingWriting 
                    ? "bg-teal-50 text-teal-600 border-teal-100" 
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {isPracticingWriting ? "Xem Flashcard giải nghĩa" : "Tập viết chữ này"}
              </button>
            </div>

            <div className="min-h-[380px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                {isPracticingWriting ? (
                  <motion.div
                    key="writing"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full"
                  >
                    <StrokeWriter
                      word={currentWord}
                      onSuccess={handleMarkMemorized}
                      onFailure={() => {}}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="flashcard"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full"
                  >
                    <Flashcard
                      word={currentWord}
                      isFavorite={favoriteWords.includes(currentWord.character)}
                      onToggleFavorite={() => onToggleFavorite(currentWord.character)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Spaced Repetition Rating Controller Row */}
          {!isPracticingWriting && (
            <div className="flex flex-col gap-2 items-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Bạn còn nhớ rõ từ này chứ?</span>
              <div className="flex gap-3 w-full max-w-sm justify-center">
                <button
                  onClick={handleMarkForgotten}
                  className="flex-1 py-3 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-100 hover:border-rose-200 text-rose-600 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 transition"
                >
                  <ThumbsUp className="w-4 h-4 rotate-180" /> Tôi Quên rồi / Thấy Khó
                </button>
                <button
                  onClick={handleMarkMemorized}
                  className="flex-1 py-3 px-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 hover:border-emerald-200 text-emerald-600 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 transition"
                >
                  <Check className="w-4 h-4" /> Tôi Nhớ tốt / Dễ
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default Review;
