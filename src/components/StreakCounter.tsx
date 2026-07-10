import React from "react";
import { UserProgress } from "../types";
import { Flame, Trophy, Award, Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface StreakCounterProps {
  progress: UserProgress;
}

export const StreakCounter: React.FC<StreakCounterProps> = ({ progress }) => {
  // Level threshold calculation: Level x 100 XP required for next level
  const xpNeededForNextLevel = progress.level * 150;
  const xpInCurrentLevel = progress.xp % xpNeededForNextLevel;
  const progressPercent = Math.min(100, Math.floor((xpInCurrentLevel / xpNeededForNextLevel) * 100));

  return (
    <div className="bg-white/90 backdrop-blur border border-teal-50 rounded-[24px] p-4.5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 w-full">
      {/* Left section: Streak & Level */}
      <div className="flex items-center gap-4 w-full md:w-auto">
        {/* Streak Flame Container */}
        <motion.div 
          className="relative flex items-center justify-center w-14 h-14 bg-orange-50 border border-orange-100 rounded-[18px]"
          whileHover={{ scale: 1.05 }}
        >
          <Flame className="w-8 h-8 text-orange-500 fill-orange-400 filter drop-shadow-[0_2px_8px_rgba(249,115,22,0.4)]" />
          <div className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full border-2 border-white shadow">
            {progress.streak}
          </div>
        </motion.div>

        {/* Streak details */}
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-800 text-base">Hệ thống Streak</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 flex items-center gap-0.5">
              <Flame className="w-3 h-3 fill-current" /> {progress.streak} ngày liên tục
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {progress.streak > 0 
              ? "Tuyệt vời! Hãy giữ vững ngọn lửa học tập mỗi ngày." 
              : "Bắt đầu học ngay 1 chủ điểm hôm nay để nhận Streak đầu tiên!"}
          </p>
        </div>
      </div>

      {/* Right section: XP & Level Indicator */}
      <div className="flex-1 w-full md:max-w-md flex flex-col gap-1">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-1 font-semibold text-emerald-700">
            <Trophy className="w-4 h-4" />
            <span>Cấp độ {progress.level}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
            <span>{progress.xp} XP</span>
          </div>
        </div>

        {/* Level Progress Bar */}
        <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <motion.div 
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        {/* Status markers */}
        <div className="flex justify-between items-center text-[11px] text-slate-400 mt-0.5">
          <span>{xpInCurrentLevel} XP</span>
          <span>{progressPercent}% tới Cấp {progress.level + 1} ({xpNeededForNextLevel - xpInCurrentLevel} XP nữa)</span>
        </div>
      </div>
    </div>
  );
};
export default StreakCounter;
