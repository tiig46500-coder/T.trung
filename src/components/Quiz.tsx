import React, { useState, useEffect } from "react";
import { Topic, Word } from "../types";
import { StrokeWriter } from "./StrokeWriter";
import { sfx } from "../utils/audio";
import { speakChinese } from "../utils/speech";
import { CheckCircle, AlertCircle, Award, Volume2, Star, RefreshCw, Sparkles, XCircle, ArrowRight, BookOpen, PenTool, HelpCircle } from "lucide-react";
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
  type: "meaning" | "pinyin" | "writing" | "matching";
  word: Word;
  options?: string[]; // For MCQ
  correctAnswer?: string; // For MCQ
}

interface MatchingCard {
  id: string;
  type: "character" | "meaning";
  text: string;
  matched: boolean;
  wordObj: Word;
}

export const Quiz: React.FC<QuizProps> = ({ topic, favoriteWords, onToggleFavorite, onQuizComplete, onClose }) => {
  // Setup questions
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
  
  // Quiz states
  const [quizPhase, setQuizPhase] = useState<"intro" | "playing" | "errorReview" | "completed">("intro");
  const [reviewIndex, setReviewIndex] = useState(0);
  const [errorReviewSuccess, setErrorReviewSuccess] = useState(false);

  // Sound and speaking
  const handleSpeech = (text: string) => {
    speakChinese(text);
    sfx.playClick();
  };

  // Generate high quality quiz questions from current topic words
  const startQuiz = () => {
    sfx.playClick();
    const words = [...topic.words];
    
    // Create matching options
    const generatedQuestions: QuizQuestion[] = [];
    
    // Mix questions types: meaning MCQs, pinyin MCQs, and 1-2 writing drills
    words.forEach((word, index) => {
      // 1. Pinyin MCQ or Meaning MCQ
      const type = index % 2 === 0 ? "meaning" : "pinyin";
      
      // Select 3 random incorrect answers from the same topic or other sources
      const otherWords = words.filter(w => w.character !== word.character);
      const shuffledOthers = otherWords.sort(() => 0.5 - Math.random());
      
      let options: string[] = [];
      let correctAnswer = "";

      if (type === "meaning") {
        correctAnswer = word.meaning;
        options = [correctAnswer, ...shuffledOthers.slice(0, 3).map(w => w.meaning)];
      } else {
        correctAnswer = word.pinyin;
        options = [correctAnswer, ...shuffledOthers.slice(0, 3).map(w => w.pinyin)];
      }
      
      // Shuffle options
      options.sort(() => 0.5 - Math.random());

      generatedQuestions.push({
        id: index,
        type,
        word,
        options,
        correctAnswer
      });
    });

    // Append 1 Matching card quiz in the middle
    if (words.length >= 4) {
      generatedQuestions.push({
        id: 99,
        type: "matching",
        word: words[0] // placeholder
      });
    }

    // Append writing question at the end for the most vital word
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

  // Setup Matching Grid
  useEffect(() => {
    if (questions[currentQuestionIndex]?.type === "matching") {
      const wordsSubset = topic.words.slice(0, 4); // Take 4 words
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

      // Shuffle matching cards
      setMatchingCards(cards.sort(() => 0.5 - Math.random()));
      setSelectedCardId(null);
    }
  }, [currentQuestionIndex, questions]);

  // Handle MCQ Answer Submission
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
      // Add current word to failure tracking list
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

  // Handle Matching Card Clicks
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
        // Clicked same card again, deselect
        setSelectedCardId(null);
        return;
      }

      // Check if matched
      const isMatch = firstCard.wordObj.character === clickedCard.wordObj.character && firstCard.type !== clickedCard.type;

      if (isMatch) {
        // Lock match
        sfx.playCorrect();
        setMatchingCards(prev => prev.map(c => {
          if (c.wordObj.character === firstCard.wordObj.character) {
            return { ...c, matched: true };
          }
          return c;
        }));
        setSelectedCardId(null);

        // Check if all matched
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
        // Mismatch
        sfx.playError();
        // Add all 4 words to wrong pool to enforce practice later
        firstCard.wordObj && setWrongAnswersPool(prev => {
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
        
        // Deselect
        setSelectedCardId(null);
      }
    }
  };

  // Advancing to the next question
  const nextQuestion = () => {
    sfx.playClick();
    setIsAnswered(false);
    setSelectedOption(null);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // End of normal questions. Check if we have failed words to review
      if (failedWords.length > 0) {
        setQuizPhase("errorReview");
        setReviewIndex(0);
        setErrorReviewSuccess(false);
      } else {
        // Flawless run! Complete directly
        handleCompleteSuccess();
      }
    }
  };

  // Handling Success of stroke correction on failed words
  const handleReviewStrokeSuccess = () => {
    // Current failed word is complete
    if (reviewIndex < failedWords.length - 1) {
      setReviewIndex(reviewIndex + 1);
    } else {
      // Completed all corrections
      handleCompleteSuccess();
    }
  };

  const handleReviewStrokeFailure = () => {
    // Just tracks errors, letting them retry standard strokes
  };

  const handleCompleteSuccess = () => {
    setQuizPhase("completed");
    sfx.playSuccess();
    // Gaining XP
    const baseXP = 20;
    const bonusXP = wrongAnswersPool.size === 0 ? 10 : 0; // Perfect score bonus
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
              <h2 className="text-2xl font-bold text-slate-800">Luyện tập Chủ điểm</h2>
              <p className="text-slate-500 font-semibold text-lg text-teal-600 mt-1">{topic.name}</p>
              <p className="text-xs text-slate-400 mt-3 max-w-sm mx-auto leading-relaxed">
                Hệ thống sẽ kiểm tra chữ Hán, phát âm, dịch nghĩa và tập viết. Hãy cố gắng hết sức để đạt điểm hoàn hảo!
              </p>
            </div>
            
            <button
              onClick={startQuiz}
              className="w-full max-w-xs py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold rounded-2xl shadow-md transition duration-300 transform hover:-translate-y-0.5"
            >
              Bắt đầu kiểm tra (Quiz)
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

            {/* MCQ & Card Matching Content */}
            {questions[currentQuestionIndex].type !== "writing" && questions[currentQuestionIndex].type !== "matching" && (
              <div className="flex flex-col gap-6">
                {/* Question title rendering */}
                <div className="text-center py-4 bg-teal-50/20 rounded-2xl border border-teal-50/50 relative overflow-hidden">
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

                {/* Option grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {questions[currentQuestionIndex].options?.map((option, idx) => {
                    const isSelected = selectedOption === option;
                    const isCorrectOption = option === questions[currentQuestionIndex].correctAnswer;
                    
                    let btnStyle = "border-slate-200 hover:bg-slate-50 text-slate-700 bg-white";
                    
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

            {/* CARD MATCHING GAME */}
            {questions[currentQuestionIndex].type === "matching" && (
              <div className="flex flex-col gap-5">
                <div className="text-center bg-teal-50/20 p-4 rounded-2xl border border-teal-50">
                  <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block mb-1">Thử thách Ghép thẻ</span>
                  <p className="text-xs text-slate-500 leading-relaxed">Hãy chạm chọn lần lượt Chữ Hán và Ý nghĩa Việt tương thích để ghép đôi chúng.</p>
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

            {/* WRITING EXERCISE (Stroke Order Canvas) */}
            {questions[currentQuestionIndex].type === "writing" && (
              <StrokeWriter
                word={questions[currentQuestionIndex].word}
                onSuccess={() => {
                  setIsCorrect(true);
                  setIsAnswered(true);
                }}
                onFailure={() => {
                  // Stroke failure adds current word to error review
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

            {/* ANSWER CONTROLLER BOX (Bottom banner) */}
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
                    <h4 className="font-bold text-sm">{isCorrect ? "Quá chính xác! Cố lên!" : "Opps, sai mất rồi!"}</h4>
                    <p className="text-xs opacity-90 mt-0.5">
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

        {/* REPAIR ERRORS SCREEN (Ôn tập lỗi sai) */}
        {quizPhase === "errorReview" && failedWords[reviewIndex] && (
          <motion.div
            key="errorReview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-6"
          >
            {/* Warning banner */}
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-900">
              <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
              <div>
                <h3 className="font-bold text-sm">VÒNG LẶP SỬA SAI BẮT BUỘC</h3>
                <p className="text-xs text-rose-700 mt-0.5">
                  Bạn có <span className="font-bold text-rose-800">{failedWords.length} từ</span> làm sai lúc nãy. Bạn phải hoàn thành tập viết đúng tất cả các từ này mới tính là đạt chủ điểm!
                </p>
              </div>
            </div>

            {/* StrokeWriter specialized for review list */}
            <div className="border border-slate-100 rounded-3xl p-4 bg-slate-50/50 shadow-inner">
              <div className="text-center mb-2">
                <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full">
                  Từ sửa sai {reviewIndex + 1}/{failedWords.length}
                </span>
              </div>
              
              <StrokeWriter
                word={failedWords[reviewIndex]}
                onSuccess={handleReviewStrokeSuccess}
                onFailure={handleReviewStrokeFailure}
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
              <h2 className="text-3xl font-extrabold text-slate-800">Cực Kỳ Xuất Sắc!</h2>
              <p className="text-emerald-600 font-semibold text-base mt-1">Bạn đã vượt qua Thử thách đạt 100% chính xác!</p>
              
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
                  Tuyệt hảo! Dù ban đầu có nhầm lẫn, vòng lặp ôn tập lỗi sai đã giúp bạn khắc sâu ghi nhớ cả {failedWords.length} từ khó hôm nay.
                </p>
              ) : (
                <p className="text-xs text-amber-500 font-semibold mt-4 flex items-center justify-center gap-1 animate-pulse">
                  <Sparkles className="w-4 h-4" /> ĐẠT ĐIỂM HOÀN HẢO 100% - NHẬN BONUS +10 XP!
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
              Hoàn thành & Nhận thưởng
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};
export default Quiz;
