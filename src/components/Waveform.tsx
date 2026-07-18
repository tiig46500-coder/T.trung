import React, { useEffect, useRef, useState } from "react";

interface WaveformProps {
  isListening: boolean;
  onPermissionError?: (errorMsg: string) => void;
}

export const Waveform: React.FC<WaveformProps> = ({ isListening, onPermissionError }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isListening) {
      cleanup();
      drawIdleWave();
      return;
    }

    let isMounted = true;

    async function initAudio() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Trình duyệt không hỗ trợ truy cập Micro.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        setHasPermission(true);

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64; // Smaller for smoother visual block look
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const draw = () => {
          if (!isListening || !canvas) return;
          animationRef.current = requestAnimationFrame(draw);

          analyser.getByteFrequencyData(dataArray);

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const barWidth = (canvas.width / bufferLength) * 1.5;
          let barHeight;
          let x = 0;

          // Draw a beautiful symmetrically centered waveform
          for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 2; // scale

            // Add some base ripple if completely quiet
            if (barHeight < 4) {
              barHeight = 4 + Math.sin(Date.now() / 150 + i) * 3;
            }

            ctx.fillStyle = `rgba(244, 63, 94, ${0.4 + barHeight / 100})`; // Rose color matching recording states
            
            // Draw centered vertical bars
            const y = (canvas.height - barHeight) / 2;
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(x, y, barWidth - 2, barHeight, 3);
            } else {
              ctx.rect(x, y, barWidth - 2, barHeight);
            }
            ctx.fill();

            x += barWidth;
          }
        };

        draw();
      } catch (err: any) {
        console.warn("Microphone access error in Waveform:", err);
        setHasPermission(false);
        if (isMounted && onPermissionError) {
          let VietnameseMsg = "Không thể truy cập Micro. Vui lòng cấp quyền hoặc gõ văn bản để thay thế.";
          if (err.name === "NotAllowedError" || err.message?.includes("Permission denied")) {
            VietnameseMsg = "Trình duyệt đang chặn Micro. Vui lòng cấp quyền Micro hoặc sử dụng ô gõ văn bản thay thế.";
          }
          onPermissionError(VietnameseMsg);
        }
        drawMockWave();
      }
    }

    initAudio();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [isListening]);

  const cleanup = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
  };

  const drawIdleWave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw a flat thin horizontal line in the center
    ctx.fillStyle = "rgba(148, 163, 184, 0.3)"; // slate-400 with opacity
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(10, canvas.height / 2 - 2, canvas.width - 20, 4, 2);
    } else {
      ctx.rect(10, canvas.height / 2 - 2, canvas.width - 20, 4);
    }
    ctx.fill();
  };

  const drawMockWave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw an elegant pulsing pseudo-wave for iframe previews if mic blocked
    const drawMock = () => {
      if (!isListening || !canvas) return;
      animationRef.current = requestAnimationFrame(drawMock);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barsCount = 20;
      const barWidth = canvas.width / barsCount;

      for (let i = 0; i < barsCount; i++) {
        const factor = Math.sin(Date.now() / 200 + i * 0.5);
        const barHeight = Math.max(6, 15 + factor * 12);
        const x = i * barWidth;
        const y = (canvas.height - barHeight) / 2;

        ctx.fillStyle = `rgba(13, 148, 136, ${0.4 + barHeight / 60})`; // Teal themed
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth - 3, barHeight, 2);
        } else {
          ctx.rect(x, y, barWidth - 3, barHeight);
        }
        ctx.fill();
      }
    };

    drawMock();
  };

  // Initial render draw
  useEffect(() => {
    drawIdleWave();
  }, []);

  return (
    <div className="w-full flex flex-col items-center justify-center bg-slate-50 border border-slate-100 rounded-xl p-2.5 shadow-inner">
      <canvas
        ref={canvasRef}
        width={300}
        height={50}
        className="w-full max-w-[280px] h-12"
      />
      {isListening && (
        <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider animate-pulse">
          {hasPermission === false ? "Chế độ Mô Phỏng (Micro bị chặn)" : "Đang phân tích âm tần thực tế"}
        </span>
      )}
    </div>
  );
};

export default Waveform;
