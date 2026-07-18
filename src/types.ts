export interface Word {
  character: string;
  pinyin: string;
  meaning: string;
  type: string;
  exampleCn: string;
  exampleVi: string;
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  icon: string;
  words: Word[];
  isCustom?: boolean;
}

export interface UserProgress {
  streak: number;
  lastStudyDate: string; // "YYYY-MM-DD"
  xp: number;
  level: number;
  completedTopics: string[]; // List of topic IDs
  favoriteWords: string[]; // List of Chinese characters
  errorWordPool: string[]; // List of Chinese characters currently flagged for review
  streakFreezes: number; // Number of protective freezes remaining
  dailyXpHistory?: Record<string, number>; // "YYYY-MM-DD" -> XP gained
}

export type ActiveTab = "learn" | "quiz" | "review" | "upload" | "progress" | "chat";
