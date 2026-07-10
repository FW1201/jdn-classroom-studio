"use client";

/* ============================================================
   TimerPanel — 黑板浮動計時器（倒數 / 碼表）
   投影大字、預設時長、歸零視覺警示；不依賴音效（沙箱/投影環境）
   ============================================================ */

import { useEffect, useRef, useState } from "react";
import { Timer, Play, Pause, RotateCcw, X } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";

const PRESETS = [1, 3, 5, 10, 15] as const; // 分鐘

function fmt(sec: number): string {
  const m = Math.floor(Math.abs(sec) / 60);
  const s = Math.abs(sec) % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function TimerPanel({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"countdown" | "stopwatch">("countdown");
  const [total, setTotal] = useState(5 * 60); // 倒數目標（秒）
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      tick.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [running]);

  const remain = total - elapsed;
  const timeUp = mode === "countdown" && remain <= 0;
  const display = mode === "countdown" ? fmt(Math.max(remain, 0)) : fmt(elapsed);
  const urgent = mode === "countdown" && remain > 0 && remain <= 30;

  function reset(nextTotal = total) {
    setRunning(false);
    setElapsed(0);
    setTotal(nextTotal);
  }

  return (
    <aside
      data-ui
      aria-label="計時器"
      className={`absolute left-1/2 top-16 z-50 flex w-80 -translate-x-1/2 flex-col gap-3 rounded-xl border p-4 [box-shadow:var(--shadow-raised)] motion-safe:animate-[panel-in_200ms_ease-out] ${
        timeUp
          ? "border-danger bg-danger/10 motion-safe:animate-pulse"
          : "border-control bg-surface-raised"
      }`}
    >
      <div className="flex items-center justify-between">
        <div role="radiogroup" aria-label="計時模式" className="flex gap-1">
          <Button
            variant={mode === "countdown" ? "primary" : "surface"}
            size="sm"
            role="radio"
            aria-checked={mode === "countdown"}
            onClick={() => { setMode("countdown"); reset(); }}
          >
            倒數
          </Button>
          <Button
            variant={mode === "stopwatch" ? "primary" : "surface"}
            size="sm"
            role="radio"
            aria-checked={mode === "stopwatch"}
            onClick={() => { setMode("stopwatch"); reset(); }}
          >
            碼表
          </Button>
        </div>
        <IconButton label="關閉計時器" className="!size-9" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </div>

      <p
        aria-live={timeUp ? "assertive" : "off"}
        className={`text-center font-bold tabular-nums ${
          timeUp ? "text-5xl text-danger" : urgent ? "text-6xl text-wall" : "text-6xl"
        }`}
      >
        {timeUp ? "時間到！" : display}
      </p>

      {mode === "countdown" && (
        <div className="flex flex-wrap justify-center gap-1.5" role="group" aria-label="預設時長">
          {PRESETS.map((min) => (
            <button
              key={min}
              onClick={() => reset(min * 60)}
              aria-pressed={total === min * 60}
              className={`h-9 min-w-11 cursor-pointer rounded-full border px-2.5 text-sm tabular-nums transition-colors ${
                total === min * 60
                  ? "border-border-strong bg-text text-on-dark"
                  : "border-control bg-surface hover:bg-hover"
              }`}
            >
              {min} 分
            </button>
          ))}
          <label className="flex h-9 items-center gap-1 text-sm text-text-muted">
            <input
              type="number"
              min={1}
              max={180}
              value={Math.round(total / 60)}
              onChange={(e) => reset(Math.max(1, Number(e.target.value) || 1) * 60)}
              aria-label="自訂分鐘數"
              className="h-9 w-16 rounded-sm border border-control bg-surface px-2 text-center tabular-nums"
            />
            分
          </label>
        </div>
      )}

      <div className="flex justify-center gap-2">
        <Button
          variant="primary"
          onClick={() => (timeUp ? reset() : setRunning((r) => !r))}
        >
          {timeUp ? (
            <><RotateCcw className="size-4.5" aria-hidden />重新開始</>
          ) : running ? (
            <><Pause className="size-4.5" aria-hidden />暫停</>
          ) : (
            <><Play className="size-4.5" aria-hidden />開始</>
          )}
        </Button>
        {!timeUp && (
          <Button variant="ghost" onClick={() => reset()} disabled={elapsed === 0}>
            <RotateCcw className="size-4.5" aria-hidden />
            歸零
          </Button>
        )}
      </div>
    </aside>
  );
}

export { Timer as TimerIcon };
