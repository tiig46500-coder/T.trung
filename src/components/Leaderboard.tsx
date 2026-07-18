import React, { useState, useEffect } from "react";
import { Trophy, Clock, Sparkles, Crown, ChevronUp, ArrowRight, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { sfx } from "../utils/audio";

interface LeaderboardProps {
  userXp: number;
  userLevel: number;
}

interface Player {
  id: string;
  name: string;
  xp: number;
  level: number;
  avatarUrl: string;
  isUser?: boolean;
  status?: "up" | "down" | "stable";
  streak: number;
}

const INITIAL_BOTS: Player[] = [
  { id: "1", name: "Nguyễn Minh (HSK 4)", xp: 1250, level: 8, avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Minh", streak: 12 },
  { id: "2", name: "Trần Lệ (HSK 3)", xp: 980, level: 6, avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Le", streak: 8 },
  { id: "3", name: "Vy Vy (HSK 5)", xp: 720, level: 5, avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Vy", streak: 15 },
  { id: "4", name: "A Kiệt", xp: 450, level: 3, avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Kiet", streak: 5 },
  { id: "5", name: "Hoàng Nam", xp: 310, level: 2, avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Nam", streak: 3 },
  { id: "6", name: "Thùy Chi", xp: 150, level: 1, avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Chi", streak: 1 },
  { id: "7", name: "Gia Bảo", xp: 80, level: 1, avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Bao", streak: 0 },
];

export const Leaderboard: React.FC<LeaderboardProps> = ({ userXp, userLevel }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [timeLeft, setTimeLeft] = useState("1 ngày 14 giờ");
  const [showConfetti, setShowConfetti] = useState(false);
  const [userNickname, setUserNickname] = useState(() => {
    return localStorage.getItem("chinese_username") || "Bạn (Học viên)";
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [prevRank, setPrevRank] = useState<number | null>(null);

  // Load and sync players with User's XP
  useEffect(() => {
    // We fetch bot XP values from state or randomizer
    const storedBots = localStorage.getItem("chinese_leaderboard_bots");
    let bots = INITIAL_BOTS;
    if (storedBots) {
      try {
        bots = JSON.parse(storedBots);
      } catch (e) {
        bots = INITIAL_BOTS;
      }
    }

    // Merge User with the list
    const userPlayer: Player = {
      id: "user",
      name: userNickname,
      xp: userXp,
      level: userLevel,
      avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=You",
      isUser: true,
      streak: Number(localStorage.getItem("chinese_user_streak") || "1"),
    };

    const allPlayers = [...bots.filter(p => p.id !== "user"), userPlayer];
    // Sort descending by XP
    allPlayers.sort((a, b) => b.xp - a.xp);

    // Track ranking change to trigger sounds or congrats animations
    const currentRank = allPlayers.findIndex(p => p.id === "user") + 1;
    if (prevRank !== null && currentRank < prevRank) {
      // User climbed up!
      sfx.playSuccess();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    setPrevRank(currentRank);
    setPlayers(allPlayers);
  }, [userXp, userLevel, userNickname]);

  // Simulate active competition: bots periodically gain small XP (e.g. every 60 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setPlayers(prev => {
        const updated = prev.map(p => {
          if (p.isUser) return p;
          // 30% chance for a bot to get some XP
          if (Math.random() < 0.3) {
            const addedXp = Math.floor(Math.random() * 15) + 5;
            return {
              ...p,
              xp: p.xp + addedXp,
              status: "up" as const,
            };
          }
          return { ...p, status: "stable" as const };
        });
        updated.sort((a, b) => b.xp - a.xp);
        
        // Save bot states
        const botsOnly = updated.filter(p => !p.isUser);
        localStorage.setItem("chinese_leaderboard_bots", JSON.stringify(botsOnly));
        return updated;
      });
    }, 45000); // every 45s

    return () => clearInterval(interval);
  }, []);

  const handleSaveNickname = () => {
    localStorage.setItem("chinese_username", userNickname);
    setIsEditingName(false);
    sfx.playClick();
  };

  const userRank = players.findIndex(p => p.isUser) + 1;

  return (
    <div className="bg-white border border-teal-100/80 rounded-[28px] p-5 shadow-[0_10px_35px_rgba(13,148,136,0.04)] flex flex-col gap-4 relative overflow-hidden">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-teal-50 rounded-full blur-2xl opacity-70 pointer-events-none" />

      {/* Confetti celebration banner */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute inset-x-0 top-0 bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-center py-2 text-[11px] font-black tracking-wider uppercase z-20 shadow-md flex items-center justify-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-bounce" />
            <span>Chúc mừng! Bạn đã tăng thứ hạng!</span>
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-bounce" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section */}
      <div className="flex items-center justify-between border-b border-slate-50 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 border border-amber-100">
            <Trophy className="w-4 h-4 fill-amber-50" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">BXH Kim Cương</h4>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
              <Clock className="w-3 h-3 text-teal-500" />
              <span>{timeLeft}</span>
            </div>
          </div>
        </div>

        {/* Change nickname toggle */}
        <button
          onClick={() => {
            sfx.playClick();
            setIsEditingName(!isEditingName);
          }}
          className="text-[10px] text-teal-600 hover:text-teal-700 font-bold bg-teal-50/70 hover:bg-teal-50 px-2.5 py-1 rounded-lg transition"
        >
          {isEditingName ? "Hủy" : "Đổi tên"}
        </button>
      </div>

      {/* Nickname input section */}
      {isEditingName && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center gap-2"
        >
          <input
            type="text"
            maxLength={18}
            value={userNickname}
            onChange={(e) => setUserNickname(e.target.value)}
            className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-400"
            placeholder="Biệt danh học tập..."
          />
          <button
            onClick={handleSaveNickname}
            className="bg-teal-600 hover:bg-teal-700 text-white p-1 rounded-lg transition"
          >
            <UserCheck className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Player List */}
      <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
        {players.map((player, idx) => {
          const isTop3 = idx < 3;
          const rankNum = idx + 1;
          const isMe = player.isUser;

          return (
            <motion.div
              layout
              key={player.id}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className={`flex items-center justify-between p-2.5 rounded-2xl border transition duration-200 ${
                isMe
                  ? "bg-teal-50/80 border-teal-200/80 shadow-sm"
                  : "bg-white border-slate-100 hover:border-teal-100"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Ranking number/badge */}
                <div className="w-6 shrink-0 flex items-center justify-center font-mono text-xs font-black">
                  {rankNum === 1 ? (
                    <Crown className="w-4 h-4 text-amber-500 fill-amber-300" />
                  ) : rankNum === 2 ? (
                    <span className="text-slate-400">🥈</span>
                  ) : rankNum === 3 ? (
                    <span className="text-amber-600">🥉</span>
                  ) : (
                    <span className="text-slate-400">{rankNum}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className="relative shrink-0">
                  <img
                    src={player.avatarUrl}
                    alt={player.name}
                    className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200/50"
                  />
                  {player.status === "up" && (
                    <span className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 text-[6px]">
                      <ChevronUp className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>

                {/* Name */}
                <div className="min-w-0">
                  <p className={`text-xs truncate font-bold ${isMe ? "text-teal-900" : "text-slate-700"}`}>
                    {player.name} {isMe && "(Bạn)"}
                  </p>
                  <p className="text-[9px] text-slate-400 font-bold leading-tight">
                    Cấp {player.level} • {player.streak} ngày lửa 🔥
                  </p>
                </div>
              </div>

              {/* XP values */}
              <div className="shrink-0 text-right">
                <span className={`text-xs font-extrabold font-mono ${isMe ? "text-teal-600" : "text-slate-600"}`}>
                  {player.xp}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase ml-0.5">XP</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Encouragement footer */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center">
        <p className="text-[10px] text-slate-500 font-bold leading-normal">
          {userRank <= 3 ? (
            "🎉 Xuất sắc! Bạn đang ở vị trí dẫn đầu bảng xếp hạng!"
          ) : (
            `💪 Bạn đang ở hạng #${userRank}. Cần thêm ${players[0]?.xp - userXp + 15 || 50} XP nữa để soán ngôi đầu bảng!`
          )}
        </p>
      </div>
    </div>
  );
};
