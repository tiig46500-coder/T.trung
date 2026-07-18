import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { Topic, Word, UserProgress, ActiveTab } from "./types";
import { DEFAULT_TOPICS } from "./data";
import { StreakCounter } from "./components/StreakCounter";
import { Leaderboard } from "./components/Leaderboard";
import { Flashcard } from "./components/Flashcard";
import { Quiz } from "./components/Quiz";
import { Review } from "./components/Review";
import { UploadDoc } from "./components/UploadDoc";
import { MusicPlayer } from "./components/MusicPlayer";
import { RoleplayChat } from "./components/RoleplayChat";
import { sfx } from "./utils/audio";
import { speakChinese } from "./utils/speech";
import { BookOpen, Award, CheckCircle, Flame, Star, Volume2, Sparkles, MessageSquare, Compass, ArrowRight, UserCheck, Layers, PlusCircle, ArrowLeft, Heart, Menu, X, Trophy, AlertCircle, Activity, RefreshCw, Snowflake, Settings, TrendingUp, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function App() {
  // Navigation & View States
  const [activeTab, setActiveTab] = useState<ActiveTab>("learn");
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [activeQuizTopic, setActiveQuizTopic] = useState<Topic | null>(null);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState<number | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem("custom_gemini_api_key") || "");
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [saveStatusMsg, setSaveStatusMsg] = useState("");

  // Core User Progress
  const [progress, setProgress] = useState<UserProgress>({
    streak: 0,
    lastStudyDate: "",
    xp: 0,
    level: 1,
    completedTopics: [],
    favoriteWords: [],
    errorWordPool: [],
    streakFreezes: 2,
  });

  // Topics Database (Preloaded + Custom OCR parsed)
  const [topics, setTopics] = useState<Topic[]>(DEFAULT_TOPICS);

  // Sound Config
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Load progress and custom topics from LocalStorage on mount
  useEffect(() => {
    try {
      const storedProgress = localStorage.getItem("chinese_learn_progress");
      let parsedProgress: UserProgress | null = null;
      if (storedProgress) {
        parsedProgress = JSON.parse(storedProgress);
      }

      const storedCustomTopics = localStorage.getItem("chinese_learn_custom_topics");
      if (storedCustomTopics) {
        const parsed: Topic[] = JSON.parse(storedCustomTopics);
        setTopics([...DEFAULT_TOPICS, ...parsed]);
      }

      if (parsedProgress) {
        // Enforce streakFreezes defaults if missing
        if (parsedProgress.streakFreezes === undefined) {
          parsedProgress.streakFreezes = 2;
        }

        // Streak Freeze protection calculation on mount
        if (parsedProgress.lastStudyDate) {
          const todayStr = new Date().toISOString().split("T")[0];
          if (parsedProgress.lastStudyDate !== todayStr) {
            const lastDate = new Date(parsedProgress.lastStudyDate);
            const todayDate = new Date(todayStr);
            const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 1) {
              // Missed a day! Let's check freeze
              if (parsedProgress.streakFreezes > 0 && parsedProgress.streak > 0) {
                parsedProgress.streakFreezes -= 1;
                // Cheat last study date to yesterday so streak continues correctly today
                const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];
                parsedProgress.lastStudyDate = yesterdayStr;
                
                alert(`❄️ Bảo vệ Chuỗi ngày học (Streak Freeze) đã kích hoạt! Bạn đã bỏ lỡ ngày học hôm qua nhưng ngọn lửa Streak ${parsedProgress.streak} ngày đã được đóng băng bảo vệ thành công. (Còn lại: ${parsedProgress.streakFreezes} Băng bảo hiểm)`);
              } else {
                parsedProgress.streak = 0; // Reset streak
              }
            }
          }
        }

        // Seed nice looking daily XP history if missing to populate the Recharts chart immediately
        if (!parsedProgress.dailyXpHistory || Object.keys(parsedProgress.dailyXpHistory).length === 0) {
          const seedHistory: Record<string, number> = {};
          const today = new Date();
          const seedXPs = [20, 35, 10, 45, 30, 15];
          for (let i = 1; i <= 6; i++) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split("T")[0];
            seedHistory[dateStr] = seedXPs[(i - 1) % seedXPs.length];
          }
          const todayStr = today.toISOString().split("T")[0];
          seedHistory[todayStr] = parsedProgress.xp > 0 ? Math.min(parsedProgress.xp, 40) : 0;
          parsedProgress.dailyXpHistory = seedHistory;
        }

        setProgress(parsedProgress);
        localStorage.setItem("chinese_learn_progress", JSON.stringify(parsedProgress));
      }
    } catch (e) {
      console.error("Failed to load local storage:", e);
    }
  }, []);

  // Sync state helpers to LocalStorage
  const saveProgress = (newProgress: UserProgress) => {
    setProgress(newProgress);
    localStorage.setItem("chinese_learn_progress", JSON.stringify(newProgress));
  };

  // Add custom parsed OCR Topic
  const handleAddCustomTopic = (newTopic: Topic) => {
    const updatedTopics = [...topics, newTopic];
    setTopics(updatedTopics);
    
    // Save only custom topics to LocalStorage
    const customs = updatedTopics.filter(t => t.isCustom);
    localStorage.setItem("chinese_learn_custom_topics", JSON.stringify(customs));

    // Jump to Learn tab to let them study immediately!
    setSelectedTopic(newTopic);
    setCurrentFlashcardIndex(0);
    setActiveTab("learn");
  };

  // Toggling favorite words (starred)
  const handleToggleFavorite = (character: string) => {
    const isFav = progress.favoriteWords.includes(character);
    let updatedFavorites: string[] = [];

    if (isFav) {
      updatedFavorites = progress.favoriteWords.filter(c => c !== character);
    } else {
      updatedFavorites = [...progress.favoriteWords, character];
    }

    const nextProgress = {
      ...progress,
      favoriteWords: updatedFavorites
    };
    saveProgress(nextProgress);
  };

  // Updating the error pool for Spaced Repetition (Review)
  const handleUpdateErrorPool = (character: string, remove: boolean) => {
    let updatedPool = [...progress.errorWordPool];
    if (remove) {
      updatedPool = updatedPool.filter(c => c !== character);
    } else if (!updatedPool.includes(character)) {
      updatedPool.push(character);
    }

    const nextProgress = {
      ...progress,
      errorWordPool: updatedPool
    };
    saveProgress(nextProgress);
  };

  // Quiz Completion rewards and Streak calculations
  const handleQuizComplete = (xpGained: number) => {
    const todayStr = new Date().toISOString().split("T")[0];
    
    // Calculate Streak
    let newStreak = progress.streak;
    if (progress.lastStudyDate !== todayStr) {
      // If last study date was yesterday, increment streak. If today, keep same. If older, reset to 1
      if (progress.lastStudyDate === "") {
        newStreak = 1;
      } else {
        const lastDateObj = new Date(progress.lastStudyDate);
        const todayDateObj = new Date(todayStr);
        const diffTime = Math.abs(todayDateObj.getTime() - lastDateObj.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 1) {
          newStreak += 1;
        } else {
          newStreak = 1; // reset streak
        }
      }
    }

    // Level calculations
    const nextXP = progress.xp + xpGained;
    const requiredXPForNextLevel = progress.level * 150;
    const isLevelUp = nextXP >= requiredXPForNextLevel;
    const nextLevel = isLevelUp ? progress.level + 1 : progress.level;

    if (isLevelUp) {
      setShowLevelUpModal(nextLevel);
      sfx.playSuccess();
      try {
        const duration = 2.5 * 1000;
        const end = Date.now() + duration;

        const frame = () => {
          confetti({
            particleCount: 40,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
          });
          confetti({
            particleCount: 40,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();
      } catch (err) {
        console.warn("Failed to fire level up confetti:", err);
      }
    }

    // Save completed topics list
    const completedList = [...progress.completedTopics];
    if (activeQuizTopic && !completedList.includes(activeQuizTopic.id)) {
      completedList.push(activeQuizTopic.id);
    }

    const currentHistory = { ...(progress.dailyXpHistory || {}) };
    currentHistory[todayStr] = (currentHistory[todayStr] || 0) + xpGained;

    const nextProgress: UserProgress = {
      ...progress,
      streak: newStreak,
      lastStudyDate: todayStr,
      xp: nextXP,
      level: nextLevel,
      completedTopics: completedList,
      errorWordPool: progress.errorWordPool, // preserved, updated dynamically in quiz failures
      streakFreezes: progress.streakFreezes !== undefined ? progress.streakFreezes : 2,
      dailyXpHistory: currentHistory
    };

    saveProgress(nextProgress);
  };

  // Navigate tabs
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSelectedTopic(null);
    setActiveQuizTopic(null);
    setMobileMenuOpen(false);
    sfx.playClick();
  };

  const handleSaveApiKey = (keyVal: string) => {
    sfx.playClick();
    const trimmed = keyVal.trim();
    localStorage.setItem("custom_gemini_api_key", trimmed);
    setCustomApiKey(trimmed);
    setSaveStatusMsg("Đã lưu API Key thành công!");
    setTimeout(() => setSaveStatusMsg(""), 3000);
  };

  const handleDeleteApiKey = () => {
    sfx.playClick();
    localStorage.removeItem("custom_gemini_api_key");
    setCustomApiKey("");
    setSaveStatusMsg("Đã xóa API Key thành công!");
    setTimeout(() => setSaveStatusMsg(""), 3000);
  };

  // Helper icons selector
  const renderTopicIcon = (iconName: string) => {
    switch (iconName) {
      case "MessageSquare":
        return <MessageSquare className="w-5 h-5 text-teal-600" />;
      case "User":
        return <Compass className="w-5 h-5 text-teal-600" />;
      case "Calendar":
        return <BookOpen className="w-5 h-5 text-teal-600" />;
      default:
        return <Sparkles className="w-5 h-5 text-teal-600" />;
    }
  };

  // Level info helper
  const requiredXP = progress.level * 150;
  const currentLevelXP = progress.xp % requiredXP;
  const progressPercent = Math.min(100, Math.floor((currentLevelXP / requiredXP) * 100));

  // Resolved failed words list
  const getWordDetails = (char: string): Word | null => {
    for (const topic of topics) {
      const found = topic.words.find(w => w.character === char);
      if (found) return found;
    }
    return null;
  };

  // Dynamic AI advice
  const getAIAdvice = () => {
    if (progress.errorWordPool.length > 0) {
      return `Bạn đang có ${progress.errorWordPool.length} từ vựng bị sai. Hãy mở tab "Ôn tập" để luyện viết nét đúng chuẩn và nhanh chóng ghi nhớ lâu dài!`;
    }
    if (progress.streak === 0) {
      return "Bắt đầu bài học đầu tiên hôm nay để kích hoạt chuỗi học tập và nhận điểm thưởng kinh nghiệm!";
    }
    return `Chuỗi học tập tuyệt vời! Giữ vững ngọn lửa ${progress.streak} ngày liên tục. Đọc to và viết tay chữ Hán mỗi ngày để tăng phản xạ!`;
  };

  return (
    <div id="app-root" className="min-h-screen bg-[#F0F9F9] text-slate-800 font-sans flex flex-col lg:flex-row">
      
      {/* 1. DESKTOP LEFT SIDEBAR NAVIGATION */}
      <aside className="hidden lg:flex w-[250px] bg-white border-r border-slate-200/80 p-6 flex-col justify-between sticky top-0 h-screen shrink-0 shadow-[4px_0_12px_rgba(13,148,136,0.02)]">
        <div className="flex flex-col gap-8">
          {/* Brand Logo & Settings Row */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-teal-500 to-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-md">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-slate-800 tracking-tight">Hán Ngữ Pro</h1>
                <p className="text-[10px] text-teal-600 font-semibold uppercase tracking-wider">Học tập thông minh</p>
              </div>
            </div>
            <button
              onClick={() => {
                sfx.playClick();
                setSaveStatusMsg("");
                setShowSettingsModal(true);
              }}
              className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50/50 rounded-xl transition cursor-pointer"
              title="Cài đặt API Key"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation links */}
          <nav className="flex flex-col gap-1.5">
            <button
              onClick={() => handleTabChange("learn")}
              className={`flex items-center gap-3 px-4.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "learn"
                  ? "bg-[#CCFBF1] text-[#0D9488] shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Từ mới (Flashcard)</span>
            </button>
            <button
              onClick={() => handleTabChange("quiz")}
              className={`flex items-center gap-3 px-4.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "quiz"
                  ? "bg-[#CCFBF1] text-[#0D9488] shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Award className="w-4 h-4 shrink-0" />
              <span>Luyện tập (Quiz)</span>
            </button>
            <button
              onClick={() => handleTabChange("review")}
              className={`flex items-center gap-3 px-4.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "review"
                  ? "bg-[#CCFBF1] text-[#0D9488] shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <RefreshCw className="w-4 h-4 shrink-0" />
              <span>Ôn tập (Review)</span>
            </button>
            <button
              onClick={() => handleTabChange("upload")}
              className={`flex items-center gap-3 px-4.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "upload"
                  ? "bg-[#CCFBF1] text-[#0D9488] shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Tạo Thẻ Ảnh (OCR)</span>
            </button>
            <button
              onClick={() => handleTabChange("chat")}
              className={`flex items-center gap-3 px-4.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "chat"
                  ? "bg-[#CCFBF1] text-[#0D9488] shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>Gia sư AI (Roleplay)</span>
            </button>
          </nav>
        </div>

        {/* Level & Profile Box inside left sidebar */}
        <div className="bg-[#E0F2F1]/50 border border-teal-100/70 p-4.5 rounded-[24px]">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-9 h-9 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow">
              {progress.level}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Cấp độ {progress.level}</p>
              <p className="text-[10px] text-teal-600 font-medium">Trung cấp Hán Ngữ</p>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-400 to-emerald-500 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 font-mono text-right mt-1.5">
            {currentLevelXP}/{requiredXP} XP
          </p>
          <button
            onClick={() => {
              sfx.playClick();
              setShowStatsModal(true);
            }}
            className="w-full mt-3 py-2 bg-white/80 hover:bg-white border border-teal-100/60 hover:border-teal-200 text-teal-750 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition hover:shadow cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
            <span>Xem Thống kê XP 📈</span>
          </button>
        </div>
      </aside>

      {/* 2. RESPONSIVE MOBILE/TABLET HEADER */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-emerald-50 shadow-sm px-4 py-3 flex items-center justify-between w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8.5 h-8.5 bg-gradient-to-tr from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center text-white shadow shadow-teal-500/20">
            <Trophy className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-slate-800 leading-tight">Hán Ngữ Pro</h1>
            <p className="text-[9px] text-slate-400 font-medium">Bản lĩnh học tiếng Trung mỗi ngày</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings gear icon button */}
          <button
            onClick={() => {
              sfx.playClick();
              setSaveStatusMsg("");
              setShowSettingsModal(true);
            }}
            className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:text-teal-600 transition cursor-pointer"
            title="Cài đặt API Key"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Sound toggle button */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              sfx.playClick();
            }}
            className={`p-1.5 rounded-xl border transition ${
              soundEnabled
                ? "bg-teal-50 border-teal-100 text-teal-600"
                : "bg-slate-100 border-slate-200 text-slate-400"
            }`}
            title={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
          >
            <Volume2 className="w-4 h-4" />
          </button>

          {/* Quick streak info */}
          <div className="flex items-center gap-1 bg-orange-50 border border-orange-100 text-orange-600 text-[10px] font-bold px-2.5 py-1.5 rounded-full">
            <Flame className="w-3.5 h-3.5 fill-current animate-pulse" />
            <span>{progress.streak} ngày</span>
          </div>

          {/* Quick streak freeze info */}
          <div className="flex items-center gap-1 bg-sky-50 border border-sky-100 text-sky-600 text-[10px] font-bold px-2.5 py-1.5 rounded-full" title="Băng bảo vệ">
            <Snowflake className="w-3 h-3 text-sky-500" />
            <span>{progress.streakFreezes !== undefined ? progress.streakFreezes : 2} Băng</span>
          </div>

          {/* Hamburger Menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-950 transition"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* 3. MOBILE MENU DROPDOWN PANEL */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-b border-slate-200 px-4 py-4 flex flex-col gap-1.5 shadow-inner z-30 w-full"
          >
            <button
              onClick={() => handleTabChange("learn")}
              className={`w-full text-left py-2.5 px-4 rounded-xl font-bold text-xs flex items-center gap-2.5 ${
                activeTab === "learn" ? "bg-teal-50 text-teal-600" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Từ mới (Flashcard)</span>
            </button>
            <button
              onClick={() => handleTabChange("quiz")}
              className={`w-full text-left py-2.5 px-4 rounded-xl font-bold text-xs flex items-center gap-2.5 ${
                activeTab === "quiz" ? "bg-teal-50 text-teal-600" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Luyện tập (Quiz)</span>
            </button>
            <button
              onClick={() => handleTabChange("review")}
              className={`w-full text-left py-2.5 px-4 rounded-xl font-bold text-xs flex items-center gap-2.5 ${
                activeTab === "review" ? "bg-teal-50 text-teal-600" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Ôn tập (Review)</span>
            </button>
            <button
              onClick={() => handleTabChange("upload")}
              className={`w-full text-left py-2.5 px-4 rounded-xl font-bold text-xs flex items-center gap-2.5 ${
                activeTab === "upload" ? "bg-teal-50 text-teal-600" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Tạo Thẻ Ảnh (OCR)</span>
            </button>
            <button
              onClick={() => handleTabChange("chat")}
              className={`w-full text-left py-2.5 px-4 rounded-xl font-bold text-xs flex items-center gap-2.5 ${
                activeTab === "chat" ? "bg-teal-50 text-teal-600" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Gia sư AI (Roleplay)</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                sfx.playClick();
                setShowStatsModal(true);
              }}
              className="w-full text-left py-2.5 px-4 rounded-xl font-bold text-xs flex items-center gap-2.5 text-teal-750 bg-teal-50/40 border border-teal-100 hover:bg-teal-50/65 transition cursor-pointer"
            >
              <TrendingUp className="w-4 h-4 text-teal-650" />
              <span>Xem Thống kê XP 📈</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. CENTRAL WORKSPACE COLUMN */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-gradient-to-b from-[#F0F9F9] to-white relative pb-16">
        
        {/* Workspace Sub Header (Top banner) */}
        <div className="hidden lg:flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white/40 backdrop-blur-sm sticky top-0 z-10">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {activeTab === "learn" && "Chủ Điểm Từ Mới"}
              {activeTab === "quiz" && "Thách Đấu Luyện Tập"}
              {activeTab === "review" && "Spaced Repetition & Viết Chữ"}
              {activeTab === "upload" && "Số Hóa Tài Liệu Học Bằng AI"}
            </h2>
            <p className="text-[10px] text-slate-400">Ứng dụng học tiếng Trung theo phương pháp thông minh khoa học</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Audio configuration toggle */}
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                sfx.playClick();
              }}
              className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition ${
                soundEnabled
                  ? "bg-teal-50 border-teal-100 text-teal-600"
                  : "bg-slate-100 border-slate-200 text-slate-400"
              }`}
              title={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{soundEnabled ? "Bật âm thanh" : "Tắt âm thanh"}</span>
            </button>

            {/* Streak count indicator */}
            <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 text-orange-600 text-xs font-bold px-3 py-1.5 rounded-full">
              <Flame className="w-4 h-4 fill-current text-orange-500 animate-pulse" />
              <span>{progress.streak} ngày streak</span>
            </div>

            {/* Streak Freeze indicator */}
            <div className="flex items-center gap-1.5 bg-sky-50 border border-sky-100 text-sky-600 text-xs font-bold px-3 py-1.5 rounded-full" title="Bảo vệ chuỗi ngọn lửa">
              <Snowflake className="w-4 h-4 text-sky-500" />
              <span>{progress.streakFreezes !== undefined ? progress.streakFreezes : 2} Băng bảo vệ</span>
            </div>
          </div>
        </div>

        {/* Dynamic content rendering with container margins */}
        <div className="flex-1 px-4 md:px-8 py-6 max-w-3xl w-full mx-auto flex flex-col gap-6">
          
          {/* Responsive streak counter (renders inside workspace for all screens) */}
          <StreakCounter progress={progress} />

          <div className="flex-1">
            <AnimatePresence mode="wait">
              
              {/* TAB 1: LEARN NEW WORDS (FLASHCARD) */}
              {activeTab === "learn" && (
                <motion.div
                  key="learn-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-6"
                >
                  {!selectedTopic ? (
                    // Select Topic view
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                        <h2 className="text-sm font-extrabold text-slate-700 tracking-tight uppercase">Chọn Chủ Điểm Học Tập</h2>
                        <span className="text-xs text-slate-400 font-medium">Hỗ trợ lật thẻ & nghe phát âm</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {topics.map((topic) => {
                          const isCompleted = progress.completedTopics.includes(topic.id);
                          return (
                            <div
                              key={topic.id}
                              onClick={() => {
                                setSelectedTopic(topic);
                                setCurrentFlashcardIndex(0);
                                sfx.playClick();
                              }}
                              className="bg-white border border-slate-100 hover:border-teal-200 rounded-3xl p-5 shadow-[0_4px_12px_rgba(13,148,136,0.02)] hover:shadow-[0_8px_20px_rgba(13,148,136,0.06)] transition duration-300 cursor-pointer flex justify-between items-center gap-4 relative overflow-hidden group"
                            >
                              <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-2xl bg-teal-50 flex items-center justify-center shrink-0 border border-teal-100 group-hover:scale-105 transition">
                                  {renderTopicIcon(topic.icon)}
                                </div>
                                <div>
                                  <h3 className="font-bold text-slate-800 text-sm group-hover:text-teal-600 transition">
                                    {topic.name}
                                  </h3>
                                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{topic.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {isCompleted && (
                                  <span className="bg-emerald-100 text-emerald-700 p-1 rounded-full text-xs" title="Đã hoàn thành">
                                    <CheckCircle className="w-4 h-4 fill-emerald-100" />
                                  </span>
                                )}
                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 group-hover:translate-x-0.5 transition" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    // Active Flashcard learning carousel
                    <div className="flex flex-col gap-6">
                      {/* Header back navigation */}
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => {
                            setSelectedTopic(null);
                            sfx.playClick();
                          }}
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-bold"
                        >
                          <ArrowLeft className="w-4 h-4" /> Quay lại chủ điểm
                        </button>
                        
                        <span className="text-xs bg-teal-50 text-teal-700 font-bold px-3.5 py-1.5 rounded-full border border-teal-100">
                          {selectedTopic.name}
                        </span>
                      </div>

                      {/* Progress slider indicator */}
                      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100">
                        <span className="text-xs font-semibold text-slate-500 font-mono">
                          Từ học {currentFlashcardIndex + 1}/{selectedTopic.words.length}
                        </span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-300"
                            style={{ width: `${((currentFlashcardIndex + 1) / selectedTopic.words.length) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Core Flashcard Renderer */}
                      {selectedTopic.words[currentFlashcardIndex] && (
                        <Flashcard
                          word={selectedTopic.words[currentFlashcardIndex]}
                          isFavorite={progress.favoriteWords.includes(selectedTopic.words[currentFlashcardIndex].character)}
                          onToggleFavorite={() => handleToggleFavorite(selectedTopic.words[currentFlashcardIndex].character)}
                        />
                      )}

                      {/* Carousel navigation buttons */}
                      <div className="flex items-center justify-between max-w-sm w-full mx-auto gap-4 mt-2">
                        <button
                          onClick={() => {
                            sfx.playClick();
                            setCurrentFlashcardIndex(prev => Math.max(0, prev - 1));
                          }}
                          disabled={currentFlashcardIndex === 0}
                          className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-2xl text-xs shadow-sm transition disabled:opacity-40"
                        >
                          Trước đó
                        </button>

                        {currentFlashcardIndex < selectedTopic.words.length - 1 ? (
                          <button
                            onClick={() => {
                              sfx.playClick();
                              setCurrentFlashcardIndex(prev => prev + 1);
                            }}
                            className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold rounded-2xl text-xs shadow transition"
                          >
                            Tiếp theo
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setActiveQuizTopic(selectedTopic);
                              setActiveTab("quiz");
                              setSelectedTopic(null);
                              sfx.playSuccess();
                            }}
                            className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-2xl text-xs shadow flex items-center justify-center gap-1 transition animate-bounce animate-duration-1000"
                          >
                            <span>Luyện tập ngay</span>
                            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 2: QUIZZES TƯƠNG TÁC (BAO GỒM TẬP VIẾT & SỬA SAI) */}
              {activeTab === "quiz" && (
                <motion.div
                  key="quiz-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-6"
                >
                  {!activeQuizTopic ? (
                    // Select Topic view for Quiz
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                        <h2 className="text-sm font-extrabold text-slate-700 tracking-tight uppercase">Bắt đầu Thử thách Quiz</h2>
                        <span className="text-xs text-rose-500 font-bold bg-rose-50 px-2.5 py-1 rounded-full flex items-center gap-1 border border-rose-100">
                          <Flame className="w-3.5 h-3.5 fill-current" /> Có Sửa Sai Bắt Buộc
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {topics.map((topic) => (
                          <div
                            key={topic.id}
                            onClick={() => {
                              setActiveQuizTopic(topic);
                              sfx.playClick();
                            }}
                            className="bg-white border border-slate-100 hover:border-teal-200 rounded-3xl p-5 shadow-[0_4px_12px_rgba(13,148,136,0.02)] hover:shadow-[0_8px_20px_rgba(13,148,136,0.06)] transition duration-300 cursor-pointer flex justify-between items-center gap-4 relative overflow-hidden group"
                          >
                            <div className="flex items-center gap-3.5">
                              <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0 border border-orange-100 group-hover:scale-105 transition">
                                <Flame className="w-5 h-5 text-orange-500 fill-orange-5" />
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-800 text-sm group-hover:text-teal-600 transition">
                                  {topic.name}
                                </h3>
                                <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{topic.description}</p>
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 group-hover:translate-x-0.5 transition" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // Launch Interactive Quiz with repair-error loops
                     <Quiz
                      topic={activeQuizTopic}
                      favoriteWords={progress.favoriteWords}
                      onToggleFavorite={handleToggleFavorite}
                      onQuizComplete={handleQuizComplete}
                      onClose={() => {
                        setActiveQuizTopic(null);
                        setActiveTab("learn");
                      }}
                    />
                  )}
                </motion.div>
              )}

              {/* TAB 3: ÔN TẬP (SPACED REPETITION) */}
              {activeTab === "review" && (
                <motion.div
                  key="review-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <Review
                    allTopics={topics}
                    favoriteWords={progress.favoriteWords}
                    errorWordPool={progress.errorWordPool}
                    onToggleFavorite={handleToggleFavorite}
                    onUpdateErrorPool={handleUpdateErrorPool}
                  />
                </motion.div>
              )}

              {/* TAB 4: UPLOAD OCR & PARSE DOCUMENT WITH AI */}
              {activeTab === "upload" && (
                <motion.div
                  key="upload-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <UploadDoc onAddCustomTopic={handleAddCustomTopic} />
                </motion.div>
              )}

              {/* TAB 5: AI TUTOR ROLEPLAY CHAT */}
              {activeTab === "chat" && (
                <motion.div
                  key="chat-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <RoleplayChat />
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* 5. RESPONSIVE ONLY BOTTOM STATS FOR SMALLER SCREENS */}
          <div className="xl:hidden mt-10 border-t border-teal-100/50 pt-8 flex flex-col gap-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              <span>Tiến độ &amp; Nhắc nhở</span>
            </h3>

            {/* Today's targets widget */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Tiến độ hôm nay</h4>
                  <p className="text-[10px] text-slate-400">Hoàn thành bài tập để đạt mục tiêu ngày</p>
                </div>
                <div className="flex items-center gap-1 bg-teal-50 border border-teal-100 text-teal-700 font-extrabold text-xs px-2.5 py-1 rounded-full">
                  <span>{progress.xp} XP</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-teal-500 h-full rounded-full" style={{ width: `${Math.min(100, Math.floor((progress.xp / 400) * 100))}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>0 XP</span>
                <span>Mục tiêu: 400 XP</span>
              </div>
            </div>

            {/* Words to review right away */}
            {progress.errorWordPool.length > 0 && (
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col gap-3">
                <div className="flex items-center gap-2 text-rose-600 mb-1">
                  <AlertCircle className="w-4 h-4" />
                  <h4 className="font-bold text-xs uppercase tracking-wider">Cần ôn tập ngay ({progress.errorWordPool.length})</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {progress.errorWordPool.slice(0, 6).map((char, index) => {
                    const word = getWordDetails(char);
                    return (
                      <span
                        key={index}
                        onClick={() => {
                          handleTabChange("review");
                          sfx.playClick();
                        }}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-rose-100 cursor-pointer transition flex items-center gap-1.5"
                      >
                        <span className="font-serif text-sm">{char}</span>
                        {word && <span className="text-[10px] text-rose-500 font-normal">({word.meaning})</span>}
                        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0" />
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI Advisor widget */}
            <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-3xl p-5 text-white shadow-md flex gap-4 items-start relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10" />
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0 border border-white/10">
                <Sparkles className="w-4 h-4 text-yellow-300 fill-yellow-200" />
              </div>
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider opacity-80 mb-1">Mẹo AI cho bạn</h4>
                <p className="text-xs leading-relaxed font-medium">{getAIAdvice()}</p>
              </div>
            </div>

            {/* Virtual competitive Leaderboard */}
            <Leaderboard userXp={progress.xp} userLevel={progress.level} />
          </div>

        </div>
      </main>

      {/* 6. DESKTOP RIGHT STATS COLUMN PANEL */}
      <aside className="hidden xl:flex w-[280px] bg-white border-l border-slate-200/80 p-6 flex-col gap-6 h-screen sticky top-0 shrink-0 overflow-y-auto shadow-[-4px_0_12px_rgba(13,148,136,0.01)]">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bảng tiến trình</h3>
          <p className="text-[10px] text-slate-400 mt-1">Thông số hoạt động hôm nay</p>
        </div>

        {/* Today's target details */}
        <div className="bg-[#F0F9F9]/80 border border-teal-50 rounded-[24px] p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800">Tiến độ ngày</p>
              <p className="text-[10px] text-slate-400 font-medium">Hoàn thành bài tập để đạt</p>
            </div>
            <div className="w-10 h-10 bg-white rounded-xl border border-teal-100 flex items-center justify-center shadow-sm">
              <Flame className="w-5 h-5 text-orange-500 fill-orange-50" />
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-teal-500 h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, Math.floor((progress.xp / 400) * 100))}%` }} />
          </div>
          <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500">
            <span>{progress.xp} XP</span>
            <span>Mục tiêu: 400 XP</span>
          </div>
        </div>

        {/* Streak & Sound states cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 flex flex-col gap-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Học liên tục</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-slate-800">{progress.streak}</span>
              <span className="text-[10px] font-semibold text-orange-500">ngày</span>
            </div>
          </div>
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 flex flex-col gap-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Yêu thích</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-slate-800">{progress.favoriteWords.length}</span>
              <span className="text-[10px] font-semibold text-teal-600">từ</span>
            </div>
          </div>
        </div>

        {/* Competitive Leaderboard in the right panel */}
        <Leaderboard userXp={progress.xp} userLevel={progress.level} />

        {/* Spaced repetition warning right column */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cần ôn tập ngay</h4>
          
          {progress.errorWordPool.length === 0 ? (
            <div className="text-center py-6 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
              <p className="text-[10px] font-bold text-slate-500">Tuyệt hảo!</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Không có từ vựng lỗi sai.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {progress.errorWordPool.slice(0, 5).map((char, index) => {
                const word = getWordDetails(char);
                return (
                  <div
                    key={index}
                    onClick={() => {
                      handleTabChange("review");
                      sfx.playClick();
                    }}
                    className="flex items-center justify-between p-3 bg-white border border-slate-100 hover:border-rose-100 hover:bg-rose-50/20 rounded-xl transition cursor-pointer group shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-base font-extrabold text-slate-800">{char}</span>
                      {word && (
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 leading-tight font-semibold">({word.pinyin})</span>
                          <span className="text-[9px] text-slate-500 leading-none">{word.meaning}</span>
                        </div>
                      )}
                    </div>
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full group-hover:scale-125 transition shrink-0" />
                  </div>
                );
              })}
              {progress.errorWordPool.length > 5 && (
                <button
                  onClick={() => handleTabChange("review")}
                  className="text-[10px] font-bold text-teal-600 hover:text-teal-700 text-center py-1 mt-1 transition"
                >
                  Xem tất cả {progress.errorWordPool.length} từ sai...
                </button>
              )}
            </div>
          )}
        </div>

        {/* AI Insight banner right column */}
        <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-[24px] p-5 text-white shadow-md flex flex-col gap-3 relative overflow-hidden mt-auto">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8" />
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shrink-0 border border-white/10">
            <Sparkles className="w-4 h-4 text-yellow-300 fill-yellow-200" />
          </div>
          <div>
            <h5 className="font-bold text-[10px] uppercase tracking-wider opacity-75">Mẹo AI cho bạn</h5>
            <p className="text-xs leading-relaxed font-semibold mt-1">{getAIAdvice()}</p>
          </div>
        </div>
      </aside>

      {/* Persistent background instrumental player with custom lyric study sheet */}
      <MusicPlayer />

      {/* LEVEL UP MODAL */}
      <AnimatePresence>
        {showLevelUpModal !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-teal-100 flex flex-col items-center gap-5 text-slate-800"
            >
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100 shadow-md animate-bounce">
                <Trophy className="w-10 h-10 text-amber-500 fill-amber-100" />
              </div>

              <div>
                <span className="text-xs font-bold text-teal-600 uppercase tracking-widest">Tuyệt vời!</span>
                <h3 className="text-2xl font-extrabold text-slate-800 mt-1">LÊN CẤP MỚI!</h3>
                <p className="text-slate-500 font-semibold mt-1 text-sm">Bạn đã đạt đến trình độ mới</p>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl py-3 px-6 text-center shadow-sm">
                <span className="text-xs text-slate-400 font-block uppercase block">Cấp độ hiện tại</span>
                <span className="text-4xl font-extrabold text-teal-600 font-mono">Lvl {showLevelUpModal}</span>
              </div>

              <p className="text-xs text-slate-400 max-w-[220px] leading-relaxed">
                Tiếp tục học tập chăm chỉ mỗi ngày để chinh phục các mục tiêu cao hơn nhé!
              </p>

              <button
                onClick={() => {
                  sfx.playClick();
                  setShowLevelUpModal(null);
                }}
                className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold rounded-2xl shadow-md transition duration-200 transform hover:-translate-y-0.5"
              >
                Nhận thưởng &amp; Tiếp tục
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* CUSTOM SETTINGS MODAL */}
        {showSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-teal-100 flex flex-col gap-5 text-slate-800 relative"
            >
              <button
                onClick={() => {
                  sfx.playClick();
                  setShowSettingsModal(false);
                }}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-50 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 border border-teal-100 shadow-sm">
                  <Settings className="w-6 h-6 animate-spin-slow" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Cấu hình API Key Cá nhân</h3>
                  <p className="text-[10px] text-teal-600 font-semibold uppercase tracking-wider">Hệ thống mở rộng hạn mức</p>
                </div>
              </div>

              <div className="text-xs text-slate-500 leading-relaxed space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p>
                  Sử dụng <strong>Gemini API Key cá nhân</strong> của riêng bạn để có tốc độ phản hồi cực nhanh, không bị giới hạn số lần tương tác (quét ảnh tài liệu, phân tích chấm nét chữ, và roleplay cùng Gia sư AI).
                </p>
                <p>
                  Khóa của bạn được lưu trữ <strong>an toàn 100% cục bộ</strong> trong thiết bị của bạn (localStorage) và chỉ gửi trực tiếp khi cần thực hiện yêu cầu xử lý học tập.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Gemini API Key:</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-teal-600 hover:underline flex items-center gap-1"
                  >
                    Lấy Key miễn phí ↗
                  </a>
                </label>
                <div className="relative">
                  <input
                    type={isKeyVisible ? "text" : "password"}
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full pl-3.5 pr-10 py-3 text-xs text-slate-800 border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 rounded-xl outline-none font-mono"
                  />
                  <button
                    onClick={() => {
                      sfx.playClick();
                      setIsKeyVisible(!isKeyVisible);
                    }}
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 cursor-pointer"
                  >
                    {isKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {saveStatusMsg && (
                <div className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl text-center">
                  {saveStatusMsg}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleDeleteApiKey}
                  className="flex-1 py-3 border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Xóa Key
                </button>
                <button
                  onClick={() => handleSaveApiKey(customApiKey)}
                  className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  Lưu thiết lập
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* STUDY STATS MODAL */}
        {showStatsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-teal-100 flex flex-col gap-6 text-slate-800 relative"
            >
              <button
                onClick={() => {
                  sfx.playClick();
                  setShowStatsModal(false);
                }}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-50 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Title Header */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 border border-teal-100 shadow-sm">
                  <Activity className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Thống Kê Điểm Học XP</h3>
                  <p className="text-[10px] text-teal-600 font-semibold uppercase tracking-wider">Tiến trình hoạt động 7 ngày qua</p>
                </div>
              </div>

              {/* Grid Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-teal-50/50 border border-teal-100/40 p-3 rounded-2xl text-center">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Cấp Độ</span>
                  <span className="text-base font-extrabold text-teal-600 font-mono block mt-0.5">{progress.level}</span>
                </div>
                <div className="bg-emerald-50/50 border border-emerald-100/40 p-3 rounded-2xl text-center">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Tổng điểm</span>
                  <span className="text-base font-extrabold text-emerald-600 font-mono block mt-0.5">{progress.xp} XP</span>
                </div>
                <div className="bg-orange-50/50 border border-orange-100/40 p-3 rounded-2xl text-center">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Chuỗi Học</span>
                  <span className="text-base font-extrabold text-orange-600 font-mono block mt-0.5">🔥 {progress.streak} ngày</span>
                </div>
                <div className="bg-sky-50/50 border border-sky-100/40 p-3 rounded-2xl text-center">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Băng Bảo Vệ</span>
                  <span className="text-base font-extrabold text-sky-600 font-mono block mt-0.5">❄ {progress.streakFreezes !== undefined ? progress.streakFreezes : 2} lượt</span>
                </div>
              </div>

              {/* Chart Block */}
              <div className="border border-slate-100 bg-slate-50/50 p-4.5 rounded-2xl">
                <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center justify-between">
                  <span>Biểu Đồ XP Thu Hoạch Mỗi Ngày</span>
                  <span className="text-[10px] text-slate-400 font-medium">Trục ngang: Ngày | Trục dọc: Điểm XP</span>
                </h4>
                
                {/* Recharts Render wrapper */}
                <div className="w-full h-56 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={
                        Object.entries(progress.dailyXpHistory || {})
                          .map(([date, value]) => {
                            const parts = date.split("-");
                            const displayDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : date;
                            return { date, displayDate, XP: value };
                          })
                          .sort((a, b) => a.date.localeCompare(b.date))
                          .slice(-7)
                      } 
                      margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "11px" }}
                        labelClassName="font-bold text-teal-400 block"
                      />
                      <Line
                        type="monotone"
                        dataKey="XP"
                        stroke="#0d9488"
                        strokeWidth={3}
                        dot={{ r: 4, stroke: "#0d9488", strokeWidth: 2, fill: "#fff" }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Closing footer advice */}
              <p className="text-[11px] text-slate-500 italic text-center leading-relaxed">
                "Học một biết mười, kiên trì tích tụ điểm XP mỗi ngày chính là chìa khóa vàng để làm chủ Hán ngữ đỉnh cao!"
              </p>

              <button
                onClick={() => {
                  sfx.playClick();
                  setShowStatsModal(false);
                }}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
