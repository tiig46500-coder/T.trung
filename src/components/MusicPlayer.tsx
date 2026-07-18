import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Music, 
  ChevronUp, 
  ChevronDown, 
  BookOpen, 
  Languages, 
  Volume1, 
  Sparkles, 
  X,
  Disc,
  Info
} from "lucide-react";
import { speakChinese } from "../utils/speech";
import { sfx } from "../utils/audio";

export interface LyricLine {
  cn: string;
  pinyin: string;
  vi: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  vibe: "red-heels" | "winter-slumber";
  vibeText: string;
  audioUrl: string;
  vocalsDescription: string;
  vocab: { word: string; pinyin: string; meaning: string }[];
  lyrics: LyricLine[];
}

const SONGS: Song[] = [
  {
    id: "giay-cao-got-do",
    title: "红色高跟鞋 (Giày Cao Gót Đỏ)",
    artist: "Thái Kiện Nhã (Tanya Chua)",
    vibe: "red-heels",
    vibeText: "Vibe Jazz-Pop, quyến rũ, nhịp điệu lôi cuốn",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    vocalsDescription: "Nhịp điệu lôi cuốn, phóng khoáng và cá tính với nhịp gõ phách cuốn hút.",
    vocab: [
      { word: "红色", pinyin: "hóngsè", meaning: "Màu đỏ" },
      { word: "高跟鞋", pinyin: "gāogēnxié", meaning: "Giày cao gót" },
      { word: "形容", pinyin: "xíngróng", meaning: "Miêu tả, tả thực" },
      { word: "比较", pinyin: "bǐjiào", meaning: "So sánh" },
      { word: "直觉", pinyin: "zhíjué", meaning: "Trực giác" },
      { word: "琢磨", pinyin: "zuómó", meaning: "Nắm bắt, suy ngẫm" }
    ],
    lyrics: [
      { cn: "该怎么去形容你最贴切", pinyin: "Gāi zěnme qù xíngróng nǐ zuì tiēqiè", vi: "Làm sao để miêu tả về anh một cách chính xác nhất" },
      { cn: "拿什么跟你作比较才算特别", pinyin: "Ná shénme gēn nǐ zuò bǐjiào cái suàn tèbié", vi: "Lấy thứ gì so sánh với anh mới được coi là đặc biệt" },
      { cn: "对你的感觉 强烈", pinyin: "Duì nǐ de gǎnjué qiángliè", vi: "Cảm giác dành cho anh thật mãnh liệt" },
      { cn: "却又不太了解 只凭直觉", pinyin: "Què yòu bù tài liǎojiě zhǐ píng zhíjué", vi: "Nhưng lại không hiểu rõ mấy, chỉ dựa vào trực giác" },
      { cn: "你像我在被子里的舒服", pinyin: "Nǐ xiàng wǒ zài bèizi lǐ de shūfu", vi: "Anh giống như sự dễ chịu khi tôi trùm trong chăn ấm" },
      { cn: "却又像风 琢磨不住", pinyin: "Què yòu xiàng fēng zuómó bú zhù", vi: "Nhưng lại giống như cơn gió, chẳng thể nào nắm bắt" }
    ]
  },
  {
    id: "dong-mien",
    title: "冬眠 (Đông Miên)",
    artist: "Tư Nam (Si Nan)",
    vibe: "winter-slumber",
    vibeText: "Vibe dịu dàng, sâu lắng, chữa lành",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    vocalsDescription: "Dịu dàng, da diết, giai điệu ballad chậm rãi mang tính chữa lành tâm hồn.",
    vocab: [
      { word: "冬眠", pinyin: "dōngmián", meaning: "Ngủ đông" },
      { word: "步履", pinyin: "bùlǚ", meaning: "Bước chân, bước đi" },
      { word: "轻盈", pinyin: "qīngyíng", meaning: "Thanh thoát, nhẹ nhàng" },
      { word: "雨滴", pinyin: "yǔdī", meaning: "Hạt mưa, giọt mưa" },
      { word: "苏醒", pinyin: "sūxǐng", meaning: "Thức giấc, tỉnh dậy" },
      { word: "原地", pinyin: "yuándì", meaning: "Nơi cũ, vị trí ban đầu" }
    ],
    lyrics: [
      { cn: "你听看得见的声音 步履轻盈", pinyin: "Nǐ tīng kàn de jiàn de shēngyīn bùlǚ qīngyíng", vi: "Bạn nghe thấy âm thanh có thể nhìn thấy, những bước chân thanh thoát" },
      { cn: "那是雨滴落在草地的回音", pinyin: "Nà shì yǔ dī luò zài cǎodì de huíyīn", vi: "Đó là tiếng vang của những hạt mưa rơi trên thảm cỏ" },
      { cn: "你说时间会抚平 所有的痕迹", pinyin: "Nǐ shuō shíjiān huì fǔpíng suǒyǒu de hénjī", vi: "Anh nói thời gian sẽ xoa dịu đi tất cả mọi dấu vết" },
      { cn: "像冬眠的生灵 等待着苏醒", pinyin: "Xiàng dōngmián de shēnglíng děngdàizhe sūxǐng", vi: "Giống như sinh linh ngủ đông đang chờ đợi ngày thức giấc" },
      { cn: "我还在原地 等你回来", pinyin: "Wǒ hái zài yuándì děng nǐ huílái", vi: "Em vẫn ở nguyên nơi này, chờ anh quay trở lại" }
    ]
  },
  {
    id: "dap-an",
    title: "答案 (Đáp Án)",
    artist: "Dương Khôn & Quách Thái Khiết",
    vibe: "red-heels",
    vibeText: "Vibe ngọt ngào, tinh nghịch, lôi cuốn",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    vocalsDescription: "Bản song ca ngọt ngào, nhịp điệu có chút nũng nịu, lôi cuốn vô cùng bắt tai.",
    vocab: [
      { word: "答案", pinyin: "dá'àn", meaning: "Đáp án, câu trả lời" },
      { word: "蓝天", pinyin: "lántiān", meaning: "Bầu trời xanh" },
      { word: "白云", pinyin: "báiyún", meaning: "Mây trắng" },
      { word: "暴风雨", pinyin: "bàofēngyǔ", meaning: "Mưa bão, giông bão" },
      { word: "躲避", pinyin: "duǒbì", meaning: "Trốn tránh, né tránh" },
      { word: "爱情", pinyin: "àiqíng", meaning: "Tình yêu, ái tình" }
    ],
    lyrics: [
      { cn: "爱就像蓝天白云", pinyin: "Ài jiù xiàng lántiān báiyún", vi: "Tình yêu giống như bầu trời xanh mây trắng" },
      { cn: "晴空万里 突然暴风雨", pinyin: "Qíngkōng wànlǐ tūrán bàofēngyǔ", vi: "Nắng rực vạn dặm, bỗng nhiên có bão giông" },
      { cn: "无处躲避 无始无终", pinyin: "Wú chù duǒbì wú shǐ wú zhōng", vi: "Không nơi trốn tránh, không đầu không cuối" },
      { cn: "这就是爱情", pinyin: "Zhè jiùshì áiqíng", vi: "Đây chính là ái tình" }
    ]
  },
  {
    id: "phi-dieu-va-ve-sau",
    title: "飞鸟和蝉 (Phi Điểu Và Ve Sầu)",
    artist: "Nhậm Nhiên (Ren Ran)",
    vibe: "winter-slumber",
    vibeText: "Vibe da diết, mộc mạc, sâu lắng",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    vocalsDescription: "Chị em song sinh cảm xúc với Đông Miên, giọng hát mộc mạc da diết trên nền piano.",
    vocab: [
      { word: "飞鸟", pinyin: "fēiniǎo", meaning: "Chim bay" },
      { word: "蝉", pinyin: "chán", meaning: "Con ve sầu" },
      { word: "难忘", pinyin: "nánwàng", meaning: "Khó quên, đáng nhớ" },
      { word: "孤单", pinyin: "gūdān", meaning: "Cô đơn, đơn độc" },
      { word: "骄傲", pinyin: "jiāo'ào", meaning: "Kiêu hãnh, tự hào" },
      { word: "静静", pinyin: "jìngjìng", meaning: "Yên lặng, lặng lẽ" }
    ],
    lyrics: [
      { cn: "你说青涩最难忘", pinyin: "Nǐ shuō qīngsè zuì nánwàng", vi: "Bạn nói sự non trẻ thuở ban đầu là khó quên nhất" },
      { cn: "我看孤单都一样", pinyin: "Wǒ kàn gūdān dōu yíyàng", vi: "Tôi thấy sự cô đơn thì đâu cũng giống nhau" },
      { cn: "你骄傲地飞远 我静静地写", pinyin: "Nǐ jiāo'ào de fēi yuǎn wǒ jìngjìng de xiě", vi: "Bạn kiêu hãnh bay đi xa, còn tôi lặng lẽ viết tiếp" },
      { cn: "你是那飞鸟 我是那只蝉", pinyin: "Nǐ shì nà fēiniǎo wǒ shì nà zhī chán", vi: "Bạn là chú chim bay lượn, còn tôi là chú ve sầu kia" }
    ]
  }
];

export const MusicPlayer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState<"lyrics" | "vocab">("lyrics");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentSong = SONGS[currentSongIndex];

  // Initialize and play control
  useEffect(() => {
    // Create audio element if not exists
    if (!audioRef.current) {
      audioRef.current = new Audio(currentSong.audioUrl);
      audioRef.current.loop = true;
    } else {
      audioRef.current.src = currentSong.audioUrl;
    }

    audioRef.current.volume = isMuted ? 0 : volume;

    // Listen to meta loaded and updates
    const onTimeUpdate = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    };

    const onLoadedMetadata = () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration || 180); // Fallback to 3 mins
      }
    };

    audioRef.current.addEventListener("timeupdate", onTimeUpdate);
    audioRef.current.addEventListener("loadedmetadata", onLoadedMetadata);

    if (isPlaying) {
      audioRef.current.play().catch(err => {
        console.warn("Autoplay blocked, pausing state", err);
        setIsPlaying(false);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener("timeupdate", onTimeUpdate);
        audioRef.current.removeEventListener("loadedmetadata", onLoadedMetadata);
      }
    };
  }, [currentSongIndex]);

  // Handle play/pause toggle
  const togglePlay = () => {
    sfx.playClick();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error("Playback error", err);
      });
    }
  };

  // Skip tracks
  const handleNext = () => {
    sfx.playClick();
    setCurrentSongIndex((prev) => (prev + 1) % SONGS.length);
    setCurrentTime(0);
  };

  const handlePrev = () => {
    sfx.playClick();
    setCurrentSongIndex((prev) => (prev - 1 + SONGS.length) % SONGS.length);
    setCurrentTime(0);
  };

  // Adjust volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : val;
    }
    if (val > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    sfx.playClick();
    const mutedState = !isMuted;
    setIsMuted(mutedState);
    if (audioRef.current) {
      audioRef.current.volume = mutedState ? 0 : volume;
    }
  };

  // Drag timeline seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  // Format time (mm:ss)
  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleSpeechLine = (text: string) => {
    sfx.playClick();
    speakChinese(text);
  };

  return (
    <>
      {/* Sleek Floating Mini Player Widget in Bottom Right */}
      <motion.div 
        className="fixed bottom-6 right-6 z-40 bg-white/95 backdrop-blur-md border border-teal-100/80 p-3 rounded-[24px] shadow-[0_12px_40px_rgba(13,148,136,0.12)] flex items-center gap-3.5 max-w-[320px] hover:border-teal-200 transition duration-300"
        initial={{ scale: 0.9, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {/* Rotating mini disc - Click to open full lyrics */}
        <button
          onClick={() => {
            sfx.playClick();
            setIsOpen(true);
          }}
          className="relative group focus:outline-none shrink-0"
          title="Mở lời bài hát & chi tiết"
        >
          <motion.div
            animate={{ rotate: isPlaying ? 360 : 0 }}
            transition={{
              repeat: Infinity,
              duration: 5,
              ease: "linear",
            }}
            className="w-11 h-11 bg-slate-900 rounded-full flex items-center justify-center border-2 border-teal-500 shadow-md overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-white/10 to-black/20" />
            <Disc className={`w-5 h-5 text-teal-400 ${isPlaying ? "animate-pulse" : ""}`} />
            <div className="w-2.5 h-2.5 bg-white rounded-full absolute" />
          </motion.div>
          
          {/* Hover indicator to expand */}
          <div className="absolute -top-1 -right-1 bg-teal-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition duration-200">
            <ChevronUp className="w-3 h-3" />
          </div>

          {/* Active green status dot */}
          {isPlaying && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white"></span>
            </span>
          )}
        </button>

        {/* Song Info - Click to open full lyrics */}
        <div 
          onClick={() => {
            sfx.playClick();
            setIsOpen(true);
          }}
          className="flex flex-col items-start min-w-[100px] max-w-[140px] cursor-pointer group"
          title="Mở lời bài hát & chi tiết"
        >
          <span className="text-[9px] uppercase font-black text-teal-600 tracking-widest flex items-center gap-1 leading-none">
            <Sparkles className="w-2.5 h-2.5 animate-pulse text-amber-500 fill-amber-400" />
            HỌC QUA BÀI HÁT
          </span>
          <span className="text-xs font-extrabold text-slate-700 truncate w-full group-hover:text-teal-600 transition duration-200 mt-1">
            {currentSong.title.split(" (")[0]}
          </span>
          <span className="text-[10px] text-slate-400 font-bold truncate w-full leading-tight">
            {currentSong.artist}
          </span>
        </div>

        {/* Divider line */}
        <div className="h-8 w-[1px] bg-slate-100 shrink-0" />

        {/* Compact Interactive Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Play/Pause icon button */}
          <button
            onClick={togglePlay}
            className={`p-2 rounded-full transition flex items-center justify-center ${
              isPlaying 
                ? "bg-teal-50 text-teal-600 hover:bg-teal-100" 
                : "bg-teal-500 text-white hover:bg-teal-600 shadow-sm"
            }`}
            title={isPlaying ? "Tạm dừng" : "Phát nhạc"}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
          </button>

          {/* Next Song button */}
          <button
            onClick={handleNext}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition"
            title="Bài tiếp theo"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>

      {/* Expanded Modal Layer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Main Window */}
            <motion.div
              className="bg-white border border-teal-50/60 rounded-[32px] w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-[0_20px_50px_rgba(13,148,136,0.15)] flex flex-col md:flex-row relative z-10"
              initial={{ scale: 0.92, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 180 }}
            >
              {/* Close button */}
              <button
                onClick={() => {
                  sfx.playClick();
                  setIsOpen(false);
                }}
                className="absolute top-5 right-5 z-20 p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>

              {/* LEFT SIDE: Vinyl & Audio Controls */}
              <div className="w-full md:w-[40%] bg-slate-50/80 border-r border-slate-100 p-6 flex flex-col justify-between items-center text-center">
                <div className="w-full">
                  <span className="text-[11px] font-black uppercase tracking-widest text-teal-600 bg-teal-50/80 px-3.5 py-1.5 rounded-full inline-block mb-4">
                    🎶 CHỌN BÀI HÁT YÊU THÍCH
                  </span>
                  
                  {/* Playlist select slider / container */}
                  <div className="flex flex-col gap-2 w-full mb-6 max-h-[160px] overflow-y-auto pr-1">
                    {SONGS.map((song, idx) => (
                      <button
                        key={song.id}
                        onClick={() => {
                          sfx.playClick();
                          setCurrentSongIndex(idx);
                        }}
                        className={`w-full p-2.5 rounded-2xl flex items-center gap-3 border text-left transition duration-200 ${
                          currentSongIndex === idx
                            ? "bg-teal-500 text-white border-teal-500 shadow-sm"
                            : "bg-white text-slate-700 border-slate-100 hover:bg-slate-100/50"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          currentSongIndex === idx ? "bg-white/20 text-white" : "bg-teal-50 text-teal-600"
                        }`}>
                          <Music className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate leading-snug">{song.title}</p>
                          <p className={`text-[10px] ${currentSongIndex === idx ? "text-teal-100" : "text-slate-400"} font-medium`}>
                            {song.artist}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rotating vinyl vinyl visualization */}
                <div className="relative my-4 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: isPlaying ? 360 : 0 }}
                    transition={{
                      repeat: Infinity,
                      duration: 10,
                      ease: "linear",
                    }}
                    className="w-40 h-40 md:w-48 md:h-48 bg-slate-950 rounded-full flex items-center justify-center border-4 border-slate-800 shadow-[0_15px_40px_rgba(0,0,0,0.15)] overflow-hidden relative"
                  >
                    {/* Retro vinyl stripes */}
                    <div className="absolute inset-0 rounded-full border border-slate-700/30 scale-90" />
                    <div className="absolute inset-0 rounded-full border border-slate-700/30 scale-75" />
                    <div className="absolute inset-0 rounded-full border border-slate-700/30 scale-50" />
                    
                    {/* Centered Album Cover / Art background with custom colors based on vibe */}
                    <div className={`absolute w-16 h-16 rounded-full flex items-center justify-center ${
                      currentSong.vibe === "red-heels" 
                        ? "bg-gradient-to-tr from-rose-500 to-amber-500" 
                        : "bg-gradient-to-tr from-teal-400 to-sky-500"
                    }`}>
                      <Music className="w-8 h-8 text-white/90" />
                    </div>
                    {/* Center vinyl pin */}
                    <div className="w-4 h-4 bg-white rounded-full shadow-inner z-10 absolute" />
                  </motion.div>

                  {/* Rotating visual arm */}
                  <motion.div 
                    className="absolute -top-4 right-2 w-16 origin-top-left"
                    animate={{ rotate: isPlaying ? 16 : -10 }}
                    transition={{ type: "spring", stiffness: 60 }}
                  >
                    <div className="w-2.5 h-16 bg-slate-400 rounded-full relative shadow-sm">
                      <div className="w-4 h-4 bg-slate-500 rounded-full -top-1 -left-1 absolute" />
                      <div className="w-4 h-6 bg-slate-600 rounded-md bottom-0 -left-1 absolute" />
                    </div>
                  </motion.div>
                </div>

                {/* Text and stats */}
                <div className="w-full mt-2">
                  <h3 className="text-sm font-black text-slate-800 truncate px-2">{currentSong.title}</h3>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">{currentSong.artist}</p>
                  
                  {/* Progress slider */}
                  <div className="w-full mt-4 px-2">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-teal-500 focus:outline-none"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold font-mono mt-1">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Playback Controls */}
                  <div className="flex items-center justify-center gap-4 mt-3">
                    <button
                      onClick={handlePrev}
                      className="p-2.5 bg-white border border-slate-100 hover:bg-slate-50 text-slate-600 rounded-full transition shadow-sm"
                      title="Bài trước"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>

                    <button
                      onClick={togglePlay}
                      className="p-4 bg-teal-500 hover:bg-teal-600 text-white rounded-full transition shadow-md flex items-center justify-center scale-110 active:scale-95"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 fill-white text-white" />
                      ) : (
                        <Play className="w-5 h-5 fill-white text-white" />
                      )}
                    </button>

                    <button
                      onClick={handleNext}
                      className="p-2.5 bg-white border border-slate-100 hover:bg-slate-50 text-slate-600 rounded-full transition shadow-sm"
                      title="Bài tiếp theo"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Volume Control bar */}
                  <div className="flex items-center gap-2 justify-center mt-4 max-w-[160px] mx-auto px-2">
                    <button onClick={toggleMute} className="text-slate-400 hover:text-teal-600 transition">
                      {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-full h-1 bg-slate-200 rounded-full cursor-pointer accent-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* RIGHT SIDE: Interactive Lyrics & Vocab Sheet */}
              <div className="flex-1 p-6 flex flex-col justify-between overflow-hidden">
                {/* Switch tab options */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div className="flex bg-slate-50 p-1 rounded-2xl gap-1">
                    <button
                      onClick={() => {
                        sfx.playClick();
                        setActiveTab("lyrics");
                      }}
                      className={`px-4 py-2 text-xs font-black rounded-xl transition ${
                        activeTab === "lyrics"
                          ? "bg-white text-teal-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      📖 Lời bài hát &amp; Phiên âm
                    </button>
                    <button
                      onClick={() => {
                        sfx.playClick();
                        setActiveTab("vocab");
                      }}
                      className={`px-4 py-2 text-xs font-black rounded-xl transition flex items-center gap-1.5 ${
                        activeTab === "vocab"
                          ? "bg-white text-teal-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      ✨ Từ vựng quan trọng
                      <span className="bg-teal-100 text-teal-700 text-[9px] px-1.5 py-0.5 rounded-full font-sans font-extrabold">
                        {currentSong.vocab.length}
                      </span>
                    </button>
                  </div>

                  {/* Current Vibe badge description */}
                  <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100/60 text-[10px] font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{currentSong.vibeText}</span>
                  </div>
                </div>

                {/* Main scrollable view sheet */}
                <div className="flex-1 overflow-y-auto py-4 my-2 pr-1 max-h-[480px]">
                  {activeTab === "lyrics" ? (
                    <div className="flex flex-col gap-4">
                      {/* Vibe Introduction */}
                      <div className="bg-sky-50/50 border border-sky-100/40 p-4 rounded-2xl flex gap-3 mb-2">
                        <Info className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-black text-slate-800">Cảm nhận và Phong cách hát</h4>
                          <p className="text-xs text-slate-500 leading-relaxed font-medium mt-0.5">
                            {currentSong.vocalsDescription} Bạn có thể click nút nghe loa để nghe phát âm chuẩn của từng câu chữ Trung Quốc!
                          </p>
                        </div>
                      </div>

                      {/* Song lines */}
                      {currentSong.lyrics.map((line, idx) => (
                        <div 
                          key={idx}
                          className="group bg-white hover:bg-teal-50/30 border border-slate-100 hover:border-teal-100/50 p-3.5 rounded-2xl transition duration-200 flex items-start justify-between gap-3 shadow-sm"
                        >
                          <div className="flex-1 min-w-0">
                            {/* Chinese Character Line */}
                            <h4 className="text-xl font-bold text-slate-800 tracking-wide select-all font-sans">
                              {line.cn}
                            </h4>
                            
                            {/* Pinyin Phonetics Line */}
                            <p className="text-xs font-bold text-teal-600 font-mono tracking-wider mt-1 select-all">
                              {line.pinyin}
                            </p>
                            
                            {/* Vietnamese Translation Line */}
                            <p className="text-xs font-bold text-slate-500 font-sans mt-1">
                              {line.vi}
                            </p>
                          </div>

                          {/* Quick speaker helper */}
                          <button
                            onClick={() => handleSpeechLine(line.cn)}
                            className="p-2 bg-slate-50 hover:bg-teal-100 text-slate-400 hover:text-teal-600 rounded-xl transition shadow-sm flex items-center justify-center shrink-0 self-center"
                            title="Nghe TTS từng chữ"
                          >
                            <Volume1 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {currentSong.vocab.map((item, idx) => (
                        <div 
                          key={idx} 
                          className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition duration-200"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h4 className="text-2xl font-black text-slate-800 select-all">{item.word}</h4>
                              <p className="text-xs font-bold text-teal-600 font-mono tracking-widest mt-1 select-all">
                                {item.pinyin}
                              </p>
                            </div>
                            <button
                              onClick={() => handleSpeechLine(item.word)}
                              className="p-2 bg-slate-50 hover:bg-teal-50 text-slate-400 hover:text-teal-600 rounded-xl transition"
                              title="Nghe phát âm từ vựng"
                            >
                              <Volume1 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <div className="border-t border-slate-50 mt-3 pt-2.5">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Ý nghĩa</span>
                            <p className="text-sm text-slate-700 font-extrabold mt-0.5">{item.meaning}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom guide on how to learn */}
                <div className="bg-teal-50/50 border border-teal-100/40 p-4 rounded-2xl flex items-center gap-3">
                  <div className="p-2.5 bg-teal-100 text-teal-700 rounded-xl">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <p className="font-extrabold text-teal-900">Mẹo thông minh: Vừa nghe vừa hát!</p>
                    <p className="text-slate-500 font-medium leading-relaxed mt-0.5">
                      Sử dụng thanh lặp âm nhạc, nhẩm lời theo Pinyin để luyện lưỡi và ghi nhớ từ vựng lâu gấp 3 lần bình thường.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
