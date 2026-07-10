import React, { useState, useEffect, useRef } from "react";
import { Word } from "../types";
import { STROKE_LIBRARY } from "../data";
import { sfx } from "../utils/audio";
import { speakChinese } from "../utils/speech";
import { Play, RotateCcw, Check, Sparkles, AlertCircle, Edit3, Eye } from "lucide-react";
import { motion } from "motion/react";

interface StrokeWriterProps {
  word: Word;
  onSuccess: () => void;
  onFailure: () => void;
}

export const StrokeWriter: React.FC<StrokeWriterProps> = ({ word, onSuccess, onFailure }) => {
  const [mode, setMode] = useState<"learn" | "test">("learn");
  const [currentStrokeIndex, setCurrentStrokeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [testError, setTestError] = useState(false);
  const [testErrorMessage, setTestErrorMessage] = useState("");
  const [drawnStrokesCount, setDrawnStrokesCount] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);

  // Get current character's single first character for stroke order guidance
  const mainChar = word.character[0] || "一";
  const strokePaths = STROKE_LIBRARY[mainChar] || null;
  const hasStrokeGuidance = !!strokePaths;

  // Sound effects & Voice
  const handlePronounce = () => {
    speakChinese(word.character);
    sfx.playClick();
  };

  // Reset the drawing canvas and step counters
  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Reset state
    setCurrentStrokeIndex(0);
    setDrawnStrokesCount(0);
    setTestSuccess(false);
    setTestError(false);
    setTestErrorMessage("");
    pointsRef.current = [];
  };

  // Switch mode
  const handleModeChange = (newMode: "learn" | "test") => {
    setMode(newMode);
    sfx.playClick();
    setTimeout(() => {
      resetCanvas();
    }, 50);
  };

  // Simulate stroke animation in learn mode
  useEffect(() => {
    if (mode === "learn" && isPlaying && strokePaths) {
      const interval = setInterval(() => {
        setCurrentStrokeIndex((prev) => {
          if (prev >= strokePaths.length - 1) {
            setIsPlaying(false);
            clearInterval(interval);
            return strokePaths.length;
          }
          return prev + 1;
        });
      }, 1200);
      return () => clearInterval(interval);
    }
  }, [isPlaying, mode, strokePaths]);

  // Initial setup of canvas size and high-dpi scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    resetCanvas();
  }, [mode, word]);

  // Handle canvas drawing input
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    
    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (testSuccess) return;
    
    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    pointsRef.current = [coords];

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0d9488"; // Teal theme ink
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || testSuccess) return;
    e.preventDefault();
    
    const coords = getCanvasCoords(e);
    pointsRef.current.push(coords);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current || testSuccess) return;
    isDrawingRef.current = false;

    // Evaluate drawing
    validateStroke();
  };

  // Check if user's drawn stroke coordinates match the expected Chinese stroke direction
  const validateStroke = () => {
    const points = pointsRef.current;
    if (points.length < 2) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // If we have precise stroke path coordinates, let's validate order and direction
    if (hasStrokeGuidance && strokePaths) {
      const currentExpectedStroke = strokePaths[drawnStrokesCount];
      if (!currentExpectedStroke) return;

      // Extract raw path start & end coordinates from the SVG mock string (e.g., "M 40,100 L 160,100")
      // Coordinates are based on 200x200 grid standard. Scale them to current canvas size.
      const parsePath = (pathStr: string) => {
        const matches = pathStr.match(/([MLQ])\s*([\d.]+),([\d.]+)\s*([\d.]+)*,([\d.]+)*/g);
        if (!matches || matches.length < 2) return { start: { x: 100, y: 100 }, end: { x: 100, y: 100 } };
        
        // Grab starting M and last L/Q command values
        const startPart = matches[0].replace(/[M\s]/g, "").split(",");
        const endPart = matches[matches.length - 1].replace(/[LQ\s]/g, "").split(",");

        return {
          start: { x: parseFloat(startPart[0]), y: parseFloat(startPart[1]) },
          end: { x: parseFloat(endPart[endPart.length - 2]), y: parseFloat(endPart[endPart.length - 1]) }
        };
      };

      const expectedCoords = parsePath(currentExpectedStroke);
      
      // Scale standard 200x200 system to the actual canvas width & height
      const scaleX = canvas.width / 200;
      const scaleY = canvas.height / 200;

      const expectedStart = { x: expectedCoords.start.x * scaleX, y: expectedCoords.start.y * scaleY };
      const expectedEnd = { x: expectedCoords.end.x * scaleX, y: expectedCoords.end.y * scaleY };

      const userStart = points[0];
      const userEnd = points[points.length - 1];

      // Calculate distance between user points and expected path coordinates
      const distStart = Math.hypot(userStart.x - expectedStart.x, userStart.y - expectedStart.y);
      const distEnd = Math.hypot(userEnd.x - expectedEnd.x, userEnd.y - expectedEnd.y);

      // Margin of error allowance (e.g. 50 pixels radius)
      const maxTolerance = 50;

      if (distStart < maxTolerance && distEnd < maxTolerance) {
        // CORRECT STROKE!
        const nextCount = drawnStrokesCount + 1;
        setDrawnStrokesCount(nextCount);
        sfx.playCorrect();
        setTestError(false);
        setTestErrorMessage("");

        // If that was the last stroke
        if (nextCount >= strokePaths.length) {
          setTestSuccess(true);
          sfx.playSuccess();
          setTimeout(() => {
            onSuccess();
          }, 1200);
        }
      } else {
        // INCORRECT STROKE DIRECTION OR REVERSE
        setTestError(true);
        sfx.playError();
        
        let errorMsg = "Sai thứ tự hoặc sai hướng viết!";
        if (distStart >= maxTolerance && distEnd < maxTolerance) {
          errorMsg = "Bạn đã viết ngược chiều nét vẽ!";
        } else if (distStart < maxTolerance && distEnd >= maxTolerance) {
          errorMsg = "Hãy kéo dài nét vẽ đúng điểm kết thúc!";
        } else {
          errorMsg = "Sai nét! Hãy bắt đầu viết từ đúng nét sáng.";
        }
        setTestErrorMessage(errorMsg);
        onFailure();

        // Clear canvas but redraw already correct strokes
        redrawCorrectStrokes(scaleX, scaleY);
      }
    } else {
      // Free Draw Mode for other characters (such as user-uploaded OCR words)
      // Since we don't have stroke coordinates for custom words, we validate that the user has at least drawn something substantial in the canvas
      const nextCount = drawnStrokesCount + 1;
      setDrawnStrokesCount(nextCount);
      sfx.playCorrect();

      // For free draw, let them complete the character at their own pace. They have a "Confirm" button
    }

    // Reset points buffer for next stroke
    pointsRef.current = [];
  };

  const redrawCorrectStrokes = (scaleX: number, scaleY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !strokePaths) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw previous correct strokes in dark green
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#14b8a6";

    for (let i = 0; i < drawnStrokesCount; i++) {
      const pathStr = strokePaths[i];
      const svgPath = new Path2D();
      
      // Parse SVG path, scale coordinates and compile Path2D
      const scaledPath = pathStr.replace(/([0-9.]+)/g, (match, p1, offset, string) => {
        // Identify if it's x coordinate or y coordinate by position in path
        const precedingPart = string.substring(0, offset);
        const commaCount = (precedingPart.match(/,/g) || []).length;
        const spaceCount = (precedingPart.match(/\s/g) || []).length;
        // Basic coordinates index check
        if (precedingPart.endsWith(",") || precedingPart.endsWith("M") || precedingPart.endsWith("L") || precedingPart.endsWith("Q")) {
          // If ends with comma or follows M/L, scale appropriately
          const isY = precedingPart.includes(",");
          return (parseFloat(match) * (isY ? scaleY : scaleX)).toString();
        }
        return match;
      });

      // Quick visual draw
      ctx.stroke(new Path2D(scaledPath));
    }
  };

  const handleSkipOrConfirmFreeDraw = () => {
    setTestSuccess(true);
    sfx.playSuccess();
    setTimeout(() => {
      onSuccess();
    }, 800);
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      {/* Title Header */}
      <div className="text-center">
        <h3 className="text-lg font-bold text-slate-800 flex items-center justify-center gap-2">
          <Edit3 className="w-5 h-5 text-teal-600 animate-pulse" />
          <span>Luyện Viết Chữ Hán: <span className="text-teal-600 text-xl font-semibold">{mainChar}</span></span>
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Phiên âm: <span className="font-mono text-emerald-600 font-semibold">{word.pinyin}</span> | Nghĩa: {word.meaning}
        </p>
      </div>

      {/* Mode Switches */}
      <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full max-w-xs gap-1 shadow-inner">
        <button
          onClick={() => handleModeChange("learn")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            mode === "learn"
              ? "bg-white text-teal-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Eye className="w-4 h-4" /> Chế độ Học (Learn)
        </button>
        <button
          onClick={() => handleModeChange("test")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            mode === "test"
              ? "bg-white text-teal-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Edit3 className="w-4 h-4" /> Chế độ Viết (Test)
        </button>
      </div>

      {/* Central Canvas Board with "米" (Mi) character grid */}
      <div className="relative w-72 h-72 bg-emerald-50/20 rounded-3xl border-2 border-dashed border-emerald-100 overflow-hidden shadow-inner flex items-center justify-center">
        {/* Background "米" (Mi) grid */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="0" x2="100%" y2="100%" stroke="#10b981" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="100%" y1="0" x2="0" y2="100%" stroke="#10b981" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#10b981" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#10b981" strokeWidth="1" strokeDasharray="4 4" />
            {/* Outer border */}
            <rect x="2%" y="2%" width="96%" height="96%" fill="none" stroke="#10b981" strokeWidth="1" />
          </svg>
        </div>

        {/* Gray outline placeholder for the character */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[160px] font-sans text-slate-100 select-none font-bold">
            {mainChar}
          </span>
        </div>

        {/* LEARN MODE: Animated overlay showing strokes step-by-step */}
        {mode === "learn" && hasStrokeGuidance && strokePaths && (
          <div className="absolute inset-0 pointer-events-none">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              {strokePaths.map((path, index) => {
                const isActive = index === currentStrokeIndex;
                const isCompleted = index < currentStrokeIndex;
                return (
                  <path
                    key={index}
                    d={path}
                    fill="none"
                    stroke={isActive ? "#f59e0b" : isCompleted ? "#0d9488" : "transparent"}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={isActive ? "animate-draw" : ""}
                    style={{
                      strokeDasharray: "200",
                      strokeDashoffset: isActive ? "200" : "0",
                      animation: isActive ? "drawStroke 1.2s forwards ease-in-out" : "none",
                    }}
                  />
                );
              })}
            </svg>
          </div>
        )}

        {/* LEARN MODE: For characters without predefined stroke guidelines, simply animate fading in */}
        {mode === "learn" && !hasStrokeGuidance && (
          <motion.div
            className="absolute text-[160px] font-sans text-teal-600 font-bold select-none pointer-events-none"
            initial={{ opacity: 0.1 }}
            animate={{ opacity: isPlaying ? [0.1, 0.9, 0.1] : 0.8 }}
            transition={{ repeat: isPlaying ? Infinity : 0, duration: 2 }}
          >
            {mainChar}
          </motion.div>
        )}

        {/* TEST MODE: Guidance highlights for current expected stroke */}
        {mode === "test" && hasStrokeGuidance && strokePaths && strokePaths[drawnStrokesCount] && (
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <path
                d={strokePaths[drawnStrokesCount]}
                fill="none"
                stroke="#67e8f9" // Faint blue guide line
                strokeWidth="20"
                strokeLinecap="round"
                className="animate-pulse"
              />
            </svg>
          </div>
        )}

        {/* Interaction Drawing Canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`absolute inset-0 w-full h-full cursor-crosshair z-10 ${
            mode === "learn" ? "pointer-events-none opacity-40" : "opacity-100"
          }`}
        />

        {/* Status indicator badges */}
        {testSuccess && (
          <div className="absolute inset-0 bg-teal-500/90 z-20 flex flex-col items-center justify-center text-white p-4 text-center animate-fade-in rounded-3xl">
            <Sparkles className="w-12 h-12 mb-2 animate-bounce text-yellow-300" />
            <h4 className="font-bold text-lg">Tuyệt hảo! Đã viết đúng!</h4>
            <p className="text-xs text-teal-100">Đang đồng bộ từ vựng...</p>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex flex-col items-center gap-3 w-full">
        {mode === "learn" ? (
          <div className="flex gap-2 w-full justify-center">
            <button
              onClick={() => {
                setIsPlaying(true);
                setCurrentStrokeIndex(0);
                sfx.playClick();
              }}
              disabled={isPlaying}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold rounded-xl text-xs shadow disabled:opacity-50 transition"
            >
              <Play className="w-4 h-4 fill-current" /> Xem Hướng dẫn (Play)
            </button>
            <button
              onClick={handlePronounce}
              className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs shadow transition"
            >
              Phát âm (Audio TTS)
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-2 items-center">
            <div className="flex gap-2 w-full justify-center">
              <button
                onClick={resetCanvas}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold rounded-xl text-xs transition"
              >
                <RotateCcw className="w-4 h-4" /> Viết lại (Reset)
              </button>

              {!hasStrokeGuidance && (
                <button
                  onClick={handleSkipOrConfirmFreeDraw}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-xl text-xs shadow hover:from-teal-600 hover:to-emerald-700 transition"
                >
                  <Check className="w-4 h-4" /> Tôi đã viết xong
                </button>
              )}
            </div>

            {/* Hint / Warning labels */}
            {testError ? (
              <div className="flex items-center gap-1.5 text-xs text-rose-500 bg-rose-50 px-4 py-2 rounded-xl border border-rose-100 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{testErrorMessage}</span>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 text-center px-4 leading-relaxed">
                {hasStrokeGuidance
                  ? `Hãy vẽ lần lượt ${strokePaths.length} nét của chữ [${mainChar}] theo đúng hướng nét sáng gợi ý màu xanh.`
                  : "Đây là từ tùy chỉnh từ tài liệu của bạn. Hãy vẽ lại hình chữ Hán lên bảng viết và bấm nút xác nhận khi viết xong."}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Embedded stroke order animations styles */}
      <style>{`
        @keyframes drawStroke {
          to {
            stroke-dashoffset: 0;
          }
        }
        .animate-draw {
          animation: drawStroke 1.2s forwards ease-in-out;
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
};
export default StrokeWriter;
