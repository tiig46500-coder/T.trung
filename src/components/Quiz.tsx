import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { Topic, Word } from "../types";
import { StrokeWriter } from "./StrokeWriter";
import { sfx } from "../utils/audio";
import { speakChinese } from "../utils/speech";
import { renderToneColoredPinyin } from "../utils/pinyin";
import { CheckCircle, AlertCircle, Award, Volume2, Star, RefreshCw, Sparkles, XCircle, ArrowRight, BookOpen, Undo2, PenTool, HelpCircle, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface QuizProps {
  topic: Topic;
  favoriteWords: string[];
  onToggleFavorite: (character: string) => void;
  onQuizComplete: (xpGained: number) => void;
  onClose?: () => void;
}

interface QuizQuestion {
  id: number;
  type: "meaning" | "pinyin" | "writing" | "matching" | "fillBlank" | "listenChoose" | "sentenceOrder";
  word: Word;
  options?: string[]; // For MCQ (meaning, pinyin, fillBlank, listenChoose)
  correctAnswer?: string; // For MCQ
  sentenceWithBlank?: string; // For fillBlank
  sentenceChunks?: string[]; // For sentenceOrder (scrambled)
  correctOrder?: string[]; // For sentenceOrder
}

interface MatchingCard {
  id: string;
  type: "character" | "meaning";
  text: string;
  matched: boolean;
  wordObj: Word;
}

export const Quiz: React.FC<QuizProps> = ({ topic, favoriteWords, onToggleFavorite, onQuizComplete, onClose }) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  // Tracking failed words
  const [failedWords, setFailedWords] = useState<Word[]>([]);
  const [wrongAnswersPool, setWrongAnswersPool] = useState<Set<string>>(new Set());
  
  // Matching Game states
  const [matchingCards, setMatchingCards] = useState<MatchingCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Sentence Order states
  const [composedSentence, setComposedSentence] = useState<string[]>([]);
  const [availableChunks, setAvailableChunks] = useState<{ id: string; text: string }[]>([]);
  
  // Quiz states
  const [quizPhase, setQuizPhase] = useState<"intro" | "playing" | "errorReview" | "completed">("intro");
  const [reviewIndex, setReviewIndex] = useState(0);

  // Reset sentence ordering state for each question
  useEffect(() => {
    const q = questions[currentQuestionIndex];
    if (q && q.type === "sentenceOrder" && q.sentenceChunks) {
      setComposedSentence([]);
      setAvailableChunks(q.sentenceChunks.map((chunk, index) => ({
        id: `${chunk}-${index}-${Date.now()}`,
        text: chunk
      })));
    }
  }, [currentQuestionIndex, questions]);

  // Sound and speaking
  const handleSpeech = (text: string) => {
    speakChinese(text);
    sfx.playClick();
  };

  // Generate 5 distinct, gamified quiz questions
  const startQuiz = () => {
    sfx.playClick();
    const words = [...topic.words];
    const generatedQuestions: QuizQuestion[] = [];
    
    words.forEach((word, index) => {
      // Determine exercise type (rotate through the 5 requested types)
      const typeIndex = index % 5;
      const otherWords = words.filter(w => w.character !== word.character);
      const shuffledOthers = otherWords.sort(() => 0.5 - Math.random());

      if (typeIndex === 0) {
        // TYPE 1: Multiple Choice (Meaning or Pinyin)
        const subType = Math.random() > 0.5 ? "meaning" : "pinyin";
        const correctAnswer = subType === "meaning" ? word.meaning : word.pinyin;
        const options = [correctAnswer, ...shuffledOthers.slice(0, 3).map(w => subType === "meaning" ? w.meaning : w.pinyin)];
        options.sort(() => 0.5 - Math.random());

        generatedQuestions.push({
          id: index,
          type: subType as "meaning" | "pinyin",
          word,
          options,
          correctAnswer
        });
      } 
      else if (typeIndex === 1) {
        // TYPE 2: Fill in the Blank (Điền từ vào câu ví dụ)
        let sentenceWithBlank = "______";
        let isReplaced = false;

        if (word.exampleCn) {
          if (word.exampleCn.includes(word.character)) {
            sentenceWithBlank = word.exampleCn.replace(word.character, " ______ ");
            isReplaced = true;
          } else {
            // Replace a slice of same length
            const len = word.character.length;
            if (word.exampleCn.length > len) {
              sentenceWithBlank = "______" + word.exampleCn.substring(len);
              isReplaced = true;
            }
          }
        }

        if (!isReplaced) {
          // Fallback example
          sentenceWithBlank = `我喜欢 ______。 (${word.meaning})`;
        }

        const correctAnswer = word.character;
        const options = [correctAnswer, ...shuffledOthers.slice(0, 3).map(w => w.character)];
        options.sort(() => 0.5 - Math.random());

        generatedQuestions.push({
          id: index,
          type: "fillBlank",
          word,
          sentenceWithBlank,
          options,
          correctAnswer
        });
      }
      else if (typeIndex === 2) {
        // TYPE 3: Listen & Choose (Nghe & Chọn)
        const correctAnswer = word.character;
        const options = [correctAnswer, ...shuffledOthers.slice(0, 3).map(w => w.character)];
        options.sort(() => 0.5 - Math.random());

        generatedQuestions.push({
          id: index,
          type: "listenChoose",
          word,
          options,
          correctAnswer
        });
      }
      else if (typeIndex === 3) {
        // TYPE 4: Sentence Ordering (Sắp xếp câu)
        const rawSentence = word.exampleCn || `${word.character} 是好词语。`;
        // Remove punctuation for easier block mapping
        const cleanSentence = rawSentence.replace(/[\s\p{P}]/gu, "");
        
        // We split the Chinese sentence into characters
        const correctOrder = cleanSentence.split("");
        const sentenceChunks = [...correctOrder].sort(() => 0.5 - Math.random());

        generatedQuestions.push({
          id: index,
          type: "sentenceOrder",
          word,
          sentenceChunks,
          correctOrder
        });
      }
      else {
        // Fallback: MC for diversity
        const correctAnswer = word.meaning;
        const options = [correctAnswer, ...shuffledOthers.slice(0, 3).map(w => w.meaning)];
        options.sort(() => 0.5 - Math.random());

        generatedQuestions.push({
          id: index,
          type: "meaning",
          word,
          options,
          correctAnswer
        });
      }
    });

    // TYPE 5: Card Matching (Insert as a core topic benchmark in the middle)
    if (words.length >= 3) {
      generatedQuestions.push({
        id: 99,
        type: "matching",
        word: words[0]
      });
    }

    // TYPE 6: Calligraphy stroke-by-stroke writing test at the very end
    const coreWritingWord = words[Math.floor(Math.random() * words.length)];
    generatedQuestions.push({
      id: 100,
      type: "writing",
      word: coreWritingWord
    });

    setQuestions(generatedQuestions);
    setCurrentQuestionIndex(0);
    setFailedWords([]);
    setWrongAnswersPool(new Set());
    setQuizPhase("playing");
    setIsAnswered(false);
    setSelectedOption(null);
  };

  // Setup Card Matching subset
  useEffect(() => {
    if (questions[currentQuestionIndex]?.type === "matching") {
      const wordsSubset = topic.words.slice(0, 4);
      const cards: MatchingCard[] = [];
      
      wordsSubset.forEach((w, i) => {
        cards.push({
          id: `char-${i}`,
          type: "character",
          text: w.character,
          matched: false,
          wordObj: w
        });
        cards.push({
          id: `mean-${i}`,
          type: "meaning",
          text: w.meaning,
          matched: false,
          wordObj: w
        });
      });

      setMatchingCards(cards.sort(() => 0.5 - Math.random()));
      setSelectedCardId(null);
    }
  }, [currentQuestionIndex, questions]);

  // Standard MCQ options submissions
  const handleOptionSelect = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    
    const currentQ = questions[currentQuestionIndex];
    const isCorrectAns = option === currentQ.correctAnswer;
    
    setIsCorrect(isCorrectAns);
    setIsAnswered(true);

    if (isCorrectAns) {
      sfx.playCorrect();
      speakChinese(currentQ.word.character);
    } else {
      sfx.playError();
      setWrongAnswersPool(prev => {
        const next = new Set(prev);
        next.add(currentQ.word.character);
        return next;
      });
      setFailedWords(prev => {
        if (!prev.find(w => w.character === currentQ.word.character)) {
          return [...prev, currentQ.word];
        }
        return prev;
      });
    }
  };

  // Card matching algorithm
  const handleCardClick = (cardId: string) => {
    const clickedCard = matchingCards.find(c => c.id === cardId);
    if (!clickedCard || clickedCard.matched) return;

    sfx.playClick();

    if (selectedCardId === null) {
      setSelectedCardId(cardId);
    } else {
      const firstCard = matchingCards.find(c => c.id === selectedCardId);
      if (!firstCard) return;

      if (firstCard.id === cardId) {
        setSelectedCardId(null);
        return;
      }

      const isMatch = firstCard.wordObj.character === clickedCard.wordObj.character && firstCard.type !== clickedCard.type;

      if (isMatch) {
        sfx.playCorrect();
        setMatchingCards(prev => prev.map(c => {
          if (c.wordObj.character === firstCard.wordObj.character) {
            return { ...c, matched: true };
          }
          return c;
        }));
        setSelectedCardId(null);

        setTimeout(() => {
          setMatchingCards(currentCards => {
            const allMatched = currentCards.every(c => c.matched);
            if (allMatched) {
              setIsCorrect(true);
              setIsAnswered(true);
            }
            return currentCards;
          });
        }, 300);
      } else {
        sfx.playError();
        setWrongAnswersPool(prev => {
          const next = new Set(prev);
          next.add(firstCard.wordObj.character);
          next.add(clickedCard.wordObj.character);
          return next;
        });
        setFailedWords(prev => {
          const arr = [...prev];
          [firstCard.wordObj, clickedCard.wordObj].forEach(w => {
            if (w && !arr.find(item => item.character === w.character)) {
              arr.push(w);
            }
          });
          return arr;
        });
        
        setSelectedCardId(null);
      }
    }
  };

  // Sentence ordering click interactions
  const handleAddChunk = (chunk: { id: string; text: string }) => {
    if (isAnswered) return;
    sfx.playClick();
    setComposedSentence(prev => [...prev, chunk.text]);
    setAvailableChunks(prev => prev.filter(c => c.id !== chunk.id));
  };

  const handleClearSentenceOrder = () => {
    if (isAnswered) return;
    sfx.playClick();
    const q = questions[currentQuestionIndex];
    if (q && q.sentenceChunks) {
      setComposedSentence([]);
      setAvailableChunks(q.sentenceChunks.map((chunk, index) => ({
        id: `${chunk}-${index}-${Date.now()}`,
        text: chunk
      })));
    }
  };

  const handleCheckSentenceOrder = () => {
    const q = questions[currentQuestionIndex];
    if (!q || !q.correctOrder) return;

    const answerStr = composedSentence.join("");
    const correctStr = q.correctOrder.join("");

    const isCorrectAns = answerStr === correctStr;
    setIsCorrect(isCorrectAns);
    setIsAnswered(true);

    if (isCorrectAns) {
      sfx.playCorrect();
      speakChinese(correctStr);
    } else {
      sfx.playError();
      setWrongAnswersPool(prev => {
        const next = new Set(prev);
        next.add(q.word.character);
        return next;
      });
      setFailedWords(prev => {
        if (!prev.find(w => w.character === q.word.character)) {
          return [...prev, q.word];
        }
        return prev;
      });
    }
  };

  // Next steps controller
  const nextQuestion = () => {
    sfx.playClick();
    setIsAnswered(false);
    setSelectedOption(null);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      if (failedWords.length > 0) {
        setQuizPhase("errorReview");
        setReviewIndex(0);
      } else {
        handleCompleteSuccess();
      }
    }
  };

  const handleReviewStrokeSuccess = () => {
    if (reviewIndex < failedWords.length - 1) {
      setReviewIndex(reviewIndex + 1);
    } else {
      handleCompleteSuccess();
    }
  };

  const handleCompleteSuccess = () => {
    setQuizPhase("completed");
    sfx.playSuccess();
    
    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.warn("Failed to fire confetti:", err);
    }

    // 20 XP base, 10 XP flawless bonus
    const baseXP = 20;
    const bonusXP = wrongAnswersPool.size === 0 ? 10 : 0;
    onQuizComplete(baseXP + bonusXP);
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white border border-teal-50 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col gap-6">
      <AnimatePresence mode="wait">
        
        {/* INTRO SCREEN */}
        {quizPhase === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="text-center py-6 flex flex-col items-center gap-6"
          >
            <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center border border-emerald-100 shadow-sm animate-pulse">
              <Award className="w-10 h-10 text-emerald-500 fill-emerald-100" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Luyện tập Toàn diện</h2>
              <p className="text-slate-500 font-semibold text-lg text-teal-600 mt-1">{topic.name}</p>
              <p className="text-xs text-slate-400 mt-3 max-w-sm mx-auto leading-relaxed">
                Hệ thống 5 dạng bài tập cốt lõi: Trắc nghiệm, Ghép cặp, Điền chỗ trống, Nghe đoán từ, và Sắp xếp câu.
              </p>
            </div>
            
            <button
              onClick={startQuiz}
              className="w-full max-w-xs py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold rounded-2xl shadow-md transition duration-300 transform hover:-translate-y-0.5"
            >
              Bắt đầu luyện tập (5 dạng)
            </button>
          </motion.div>
        )}

        {/* ACTIVE QUIZ GAMEPLAY */}
        {quizPhase === "playing" && questions[currentQuestionIndex] && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-6"
          >
            {/* Progress Bar & Counter */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex) / questions.length) * 100}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-500 font-mono shrink-0">
                Câu {currentQuestionIndex + 1}/{questions.length}
              </span>
            </div>

            {/* MCQ: Meaning or Pinyin */}
            {(questions[currentQuestionIndex].type === "meaning" || questions[currentQuestionIndex].type === "pinyin") && (
              <div className="flex flex-col gap-6">
                <div className="text-center py-5 bg-teal-50/20 rounded-2xl border border-teal-50/50 relative overflow-hidden">
                  <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block mb-2">
                    {questions[currentQuestionIndex].type === "meaning" ? "Hãy tìm nghĩa đúng của từ Hán" : "Chọn phiên âm Pinyin đúng"}
                  </span>
                  <h3 className="text-5xl font-bold font-sans text-slate-800 tracking-tight">
                    {questions[currentQuestionIndex].word.character}
                  </h3>
                  <button
                    onClick={() => handleSpeech(questions[currentQuestionIndex].word.character)}
                    className="absolute bottom-3 right-3 p-2 bg-white/80 border border-slate-100 hover:bg-white text-slate-500 hover:text-slate-700 rounded-xl transition"
                    title="Phát âm"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {questions[currentQuestionIndex].options?.map((option, idx) => {
                    const isSelected = selectedOption === option;
                    const isCorrectOption = option === questions[currentQuestionIndex].correctAnswer;
                    
                    let btnStyle = "border-slate-200 hover:bg-slate-50 text-slate-700 bg-white shadow-sm";
                    
                    if (isAnswered) {
                      if (isCorrectOption) {
                        btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-[0_0_8px_rgba(16,185,129,0.2)]";
                      } else if (isSelected) {
                        btnStyle = "border-rose-400 bg-rose-50 text-rose-800";
                      } else {
                        btnStyle = "border-slate-100 opacity-60 bg-white text-slate-400 pointer-events-none";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleOptionSelect(option)}
                        disabled={isAnswered}
                        className={`py-4 px-5 rounded-2xl border-2 font-semibold text-sm text-left transition duration-200 flex items-center justify-between ${btnStyle}`}
                      >
                        <span>{option}</span>
                        {isAnswered && isCorrectOption && <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />}
                        {isAnswered && isSelected && !isCorrectOption && <XCircle className="w-5 h-5 text-rose-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TYPE 2: Fill in the Blank (Điền từ chỗ trống) */}
            {questions[currentQuestionIndex].type === "fillBlank" && (
              <div className="flex flex-col gap-6">
                <div className="text-center py-5 bg-indigo-50/20 rounded-2xl border border-indigo-50/50 relative overflow-hidden">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-2">
                    Điền từ thích hợp vào khoảng trống
                  </span>
                  <h3 className="text-2xl font-bold font-sans text-slate-800 tracking-tight leading-relaxed px-4">
                    {questions[currentQuestionIndex].sentenceWithBlank}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 italic font-sans font-medium">
                    {questions[currentQuestionIndex].word.exampleVi}
                  </p>
                  
                  {questions[currentQuestionIndex].word.exampleCn && (
                    <button
                      onClick={() => handleSpeech(questions[currentQuestionIndex].word.exampleCn)}
                      className="absolute bottom-3 right-3 p-2 bg-white/80 border border-slate-100 hover:bg-white text-slate-500 hover:text-slate-700 rounded-xl transition"
                      title="Nghe câu ví dụ mẫu"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  {questions[currentQuestionIndex].options?.map((option, idx) => {
                    const isSelected = selectedOption === option;
                    const isCorrectOption = option === questions[currentQuestionIndex].correctAnswer;
                    
                    let btnStyle = "border-slate-200 hover:bg-slate-50 text-slate-700 bg-white";
                    
                    if (isAnswered) {
                      if (isCorrectOption) {
                        btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-md";
                      } else if (isSelected) {
                        btnStyle = "border-rose-400 bg-rose-50 text-rose-800";
                      } else {
                        btnStyle = "border-slate-100 opacity-60 bg-white text-slate-400 pointer-events-none";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleOptionSelect(option)}
                        disabled={isAnswered}
                        className={`py-4 px-5 rounded-2xl border-2 font-bold text-center text-lg transition duration-200 flex items-center justify-center gap-2 ${btnStyle}`}
                      >
                        <span>{option}</span>
                        {isAnswered && isCorrectOption && <Check className="w-4 h-4 text-emerald-500" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TYPE 3: Listen & Choose (Nghe & Chọn) */}
            {questions[currentQuestionIndex].type === "listenChoose" && (
              <div className="flex flex-col gap-6">
                <div className="text-center py-8 bg-sky-50/20 rounded-2xl border border-sky-50/50 flex flex-col items-center justify-center gap-4">
                  <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">
                    Bấm loa nghe phát âm và chọn chữ đúng
                  </span>
                  
                  <button
                    onClick={() => handleSpeech(questions[currentQuestionIndex].word.character)}
                    className="w-16 h-16 bg-sky-500 hover:bg-sky-600 text-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition transform hover:scale-105 active:scale-95"
                    title="Nghe phát âm chuẩn"
                  >
                    <Volume2 className="w-8 h-8 animate-pulse" />
                  </button>
                  
                  <span className="text-[10px] text-slate-400 font-medium">Bấm để nghe lại</span>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  {questions[currentQuestionIndex].options?.map((option, idx) => {
                    const isSelected = selectedOption === option;
                    const isCorrectOption = option === questions[currentQuestionIndex].correctAnswer;
                    
                    let btnStyle = "border-slate-200 hover:bg-slate-50 text-slate-700 bg-white shadow-sm";
                    
                    if (isAnswered) {
                      if (isCorrectOption) {
                        btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-md";
                      } else if (isSelected) {
                        btnStyle = "border-rose-400 bg-rose-50 text-rose-800";
                      } else {
                        btnStyle = "border-slate-100 opacity-60 bg-white text-slate-400 pointer-events-none";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleOptionSelect(option)}
                        disabled={isAnswered}
                        className={`py-4 px-5 rounded-2xl border-2 font-bold text-xl text-center transition duration-200 ${btnStyle}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TYPE 4: Sentence Ordering (Sắp xếp câu) */}
            {questions[currentQuestionIndex].type === "sentenceOrder" && (
              <div className="flex flex-col gap-5">
                <div className="text-center bg-teal-50/20 p-4 rounded-2xl border border-teal-50">
                  <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block mb-1">Thử thách Sắp xếp câu</span>
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                    Dịch câu: "{questions[currentQuestionIndex].word.exampleVi}"
                  </p>
                </div>

                {/* Composed Sentence Area */}
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 min-h-[70px] bg-slate-50/50 flex flex-wrap gap-2 items-center justify-center">
                  {composedSentence.length === 0 && (
                    <span className="text-xs text-slate-400 font-medium">Chạm chọn các chữ bên dưới theo thứ tự chuẩn</span>
                  )}
                  {composedSentence.map((char, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (isAnswered) return;
                        sfx.playClick();
                        // Put back to available
                        setAvailableChunks(prev => [...prev, { id: `${char}-${index}-${Date.now()}`, text: char }]);
                        setComposedSentence(prev => prev.filter((_, i) => i !== index));
                      }}
                      disabled={isAnswered}
                      className="px-3.5 py-2 bg-teal-500 text-white font-bold rounded-xl text-sm shadow-sm hover:bg-teal-600 transition"
                    >
                      {char}
                    </button>
                  ))}
                </div>

                {/* Available Chunks Block */}
                <div className="flex flex-wrap gap-2.5 justify-center mt-2">
                  {availableChunks.map((chunk) => (
                    <button
                      key={chunk.id}
                      onClick={() => handleAddChunk(chunk)}
                      disabled={isAnswered}
                      className="px-4 py-2.5 bg-white border-2 border-slate-200 hover:border-teal-350 text-slate-800 font-bold rounded-xl text-sm transition-all duration-200 shadow-sm active:scale-95"
                    >
                      {chunk.text}
                    </button>
                  ))}
                </div>

                {/* Check & Reset Actions */}
                {!isAnswered && (
                  <div className="flex gap-2 justify-end mt-2">
                    <button
                      onClick={handleClearSentenceOrder}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition text-xs font-bold flex items-center gap-1"
                    >
                      <Undo2 className="w-3.5 h-3.5" /> Lập lại
                    </button>
                    <button
                      onClick={handleCheckSentenceOrder}
                      disabled={composedSentence.length === 0}
                      className="px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition shadow-sm"
                    >
                      Kiểm tra
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TYPE 5: Card Matching (Trò chơi ghép thẻ) */}
            {questions[currentQuestionIndex].type === "matching" && (
              <div className="flex flex-col gap-5">
                <div className="text-center bg-teal-50/20 p-4 rounded-2xl border border-teal-50">
                  <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block mb-1">Thử thách Ghép thẻ</span>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">Ghép đôi Chữ Hán tương ứng với Nghĩa tiếng Việt chính xác.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-2">
                  {matchingCards.map((card) => {
                    const isSelected = selectedCardId === card.id;
                    let cardStyle = "border-slate-200 bg-white text-slate-700 hover:border-teal-300";

                    if (card.matched) {
                      cardStyle = "border-emerald-200 bg-emerald-50/50 text-emerald-600 opacity-50 cursor-not-allowed";
                    } else if (isSelected) {
                      cardStyle = "border-teal-500 bg-teal-50 text-teal-700 shadow-md ring-2 ring-teal-200";
                    }

                    return (
                      <button
                        key={card.id}
                        disabled={card.matched}
                        onClick={() => handleCardClick(card.id)}
                        className={`p-4 rounded-xl border-2 font-semibold text-center text-sm transition-all duration-200 shadow-sm flex items-center justify-center min-h-[70px] ${cardStyle}`}
                      >
                        <span className={card.type === "character" ? "text-xl font-sans font-bold" : "text-xs font-medium"}>
                          {card.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CALLIGRAPHY WRITING EXERCISE (Stroke Order Canvas) */}
            {questions[currentQuestionIndex].type === "writing" && (
              <StrokeWriter
                word={questions[currentQuestionIndex].word}
                onSuccess={() => {
                  setIsCorrect(true);
                  setIsAnswered(true);
                }}
                onFailure={() => {
                  const currentW = questions[currentQuestionIndex].word;
                  setWrongAnswersPool(prev => {
                    const next = new Set(prev);
                    next.add(currentW.character);
                    return next;
                  });
                  setFailedWords(prev => {
                    if (!prev.find(w => w.character === currentW.character)) {
                      return [...prev, currentW];
                    }
                    return prev;
                  });
                }}
              />
            )}

            {/* ANSWER CONTROLLER BOX */}
            {isAnswered && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl border mt-4 flex flex-col md:flex-row items-center justify-between gap-4 ${
                  isCorrect 
                    ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                    : "bg-rose-50 border-rose-100 text-rose-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  {isCorrect ? (
                    <CheckCircle className="w-8 h-8 text-emerald-600 shrink-0 animate-bounce" />
                  ) : (
                    <AlertCircle className="w-8 h-8 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <h4 className="font-bold text-sm">{isCorrect ? "Rất chính xác! Bạn giỏi quá!" : "Opps, sai mất rồi!"}</h4>
                    <p className="text-xs opacity-95 mt-0.5 font-sans">
                      {isCorrect 
                        ? `Đáp án đúng là: ${questions[currentQuestionIndex].word.character} (${questions[currentQuestionIndex].word.pinyin})`
                        : `Từ đúng: ${questions[currentQuestionIndex].word.character} nghĩa là "${questions[currentQuestionIndex].word.meaning}"`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={nextQuestion}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm flex items-center gap-1 hover:translate-x-0.5 transition ${
                    isCorrect 
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                      : "bg-rose-600 hover:bg-rose-700 text-white"
                  }`}
                >
                  <span>Tiếp tục</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ERROR REPAIR SCREEN (Vòng lặp sửa sai nét viết bắt buộc) */}
        {quizPhase === "errorReview" && failedWords[reviewIndex] && (
          <motion.div
            key="errorReview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-6"
          >
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-900">
              <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
              <div>
                <h3 className="font-bold text-sm">VÒNG LẶP SỬA SAI BẮT BUỘC</h3>
                <p className="text-xs text-rose-750 mt-0.5 leading-relaxed font-sans">
                  Bạn đã làm sai <span className="font-extrabold text-rose-900">{failedWords.length} từ</span>. Hãy hoàn thành việc viết đúng các từ này bằng cọ vẽ để vượt qua bài kiểm tra!
                </p>
              </div>
            </div>

            <div className="border border-slate-150 rounded-3xl p-4 bg-slate-50/50 shadow-inner">
              <div className="text-center mb-2">
                <span className="text-[10px] bg-rose-100 text-rose-700 font-extrabold px-3 py-1 rounded-full">
                  Ôn tập từ viết sai {reviewIndex + 1}/{failedWords.length}
                </span>
              </div>
              
              <StrokeWriter
                word={failedWords[reviewIndex]}
                onSuccess={handleReviewStrokeSuccess}
                onFailure={() => {}}
              />
            </div>
          </motion.div>
        )}

        {/* QUIZ COMPLETED SCREEN */}
        {quizPhase === "completed" && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6 flex flex-col items-center gap-6"
          >
            <div className="w-24 h-24 bg-gradient-to-tr from-yellow-300 to-amber-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <Sparkles className="w-12 h-12 text-white fill-amber-100" />
            </div>

            <div>
              <h2 className="text-3xl font-extrabold text-slate-800">Hoàn Thành Thử Thách!</h2>
              <p className="text-emerald-600 font-semibold text-base mt-1">Nỗ lực rèn luyện của bạn là vô song!</p>
              
              <div className="flex gap-4 justify-center mt-6">
                <div className="bg-emerald-50 border border-emerald-100 px-5 py-3 rounded-2xl">
                  <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider block">Kinh nghiệm</span>
                  <span className="text-2xl font-bold text-slate-800 mt-0.5">
                    +{wrongAnswersPool.size === 0 ? "30" : "20"} XP
                  </span>
                </div>
                
                <div className="bg-orange-50 border border-orange-100 px-5 py-3 rounded-2xl">
                  <span className="text-xs text-orange-600 font-bold uppercase tracking-wider block">Streak Ngày</span>
                  <span className="text-2xl font-bold text-slate-800 mt-0.5">+1 ngày</span>
                </div>
              </div>

              {wrongAnswersPool.size > 0 ? (
                <p className="text-xs text-slate-400 mt-4 leading-relaxed max-w-sm mx-auto">
                  Tuyệt vời! Tuy ban đầu có câu sai, bạn đã kiên trì sửa chữa đúng toàn bộ {failedWords.length} lỗi nét hôm nay.
                </p>
              ) : (
                <p className="text-xs text-amber-500 font-semibold mt-4 flex items-center justify-center gap-1 animate-pulse">
                  <Sparkles className="w-4 h-4" /> BẠN ĐẠT ĐIỂM HOÀN HẢO 100% - NHẬN BONUS +10 XP!
                </p>
              )}
            </div>

             <button
              onClick={() => {
                sfx.playClick();
                if (onClose) {
                  onClose();
                } else {
                  window.location.reload();
                }
              }}
              className="w-full max-w-xs py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-extrabold rounded-2xl shadow transition"
            >
              Nhận phần thưởng &amp; Đóng
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};
export default Quiz;
