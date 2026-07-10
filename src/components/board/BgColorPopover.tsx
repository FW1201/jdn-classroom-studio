"use client";

/* ============================================================
   BgColorPopover — 黑板頁面背景顏色
   預設色盤（黑板綠/炭黑/深藍/奶油/白）+ 自訂色 + 套用到全部頁
   注意：教材頁（dataURL 背景）不適用換色
   ============================================================ */

import { useState } from "react";
import { X, PaintBucket } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";

export const BG_PRESETS = [
  { name: "預設", value: "" },
  { name: "黑板綠", value: "#2f4f43" },
  { name: "炭黑", value: "#1d1c1a" },
  { name: "深藍", value: "#1e2a3d" },
  { name: "奶油", value: "#f7f4ed" },
  { name: "白", value: "#ffffff" },
] as const;

export function BgColorPopover({
  current,
  isMaterialPage,
  onPick,
  onApplyAll,
  onClose,
}: {
  current: string | undefined;
  /** 目前頁是教材圖片頁（不能換底色） */
  isMaterialPage: boolean;
  onPick: (color: string) => void;
  onApplyAll: (color: string) => void;
  onClose: () => void;
}) {
  const [custom, setCustom] = useState(
    current && current.startsWith("#") ? current : "#2f4f43"
  );

  return (
    <aside
      data-ui
      aria-label="背景顏色"
      className="absolute bottom-20 left-1/2 z-50 flex w-72 -translate-x-1/2 flex-col gap-3 rounded-xl border border-control bg-surface-raised p-4 [box-shadow:var(--shadow-raised)] motion-safe:animate-[panel-in_200ms_ease-out]"
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold">
          <PaintBucket className="size-4.5 text-board" aria-hidden />
          頁面背景
        </h2>
        <IconButton label="關閉背景選擇" className="!size-9" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </div>

      {isMaterialPage ? (
        <p className="text-sm leading-relaxed text-text-muted">
          這一頁是匯入的教材頁面（整頁圖片），無法更換底色。
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="預設背景色">
            {BG_PRESETS.map(({ name, value }) => (
              <button
                key={name}
                onClick={() => onPick(value)}
                aria-pressed={(current ?? "") === value}
                className={`flex h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 text-xs transition-transform hover:scale-[1.03] ${
                  (current ?? "") === value ? "border-board" : "border-border"
                }`}
                style={{
                  background: value || "var(--bg)",
                  color: value && ["#f7f4ed", "#ffffff"].includes(value) ? "#1c1c1c" : value ? "#f4f1ea" : "var(--text)",
                }}
              >
                {name}
              </button>
            ))}
          </div>
          <label className="flex items-center justify-between gap-2 text-sm">
            自訂顏色
            <span className="flex items-center gap-2">
              <input
                type="color"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                aria-label="自訂背景色"
                className="size-9 cursor-pointer rounded border border-control bg-surface"
              />
              <Button variant="surface" size="sm" onClick={() => onPick(custom)}>套用</Button>
            </span>
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onApplyAll(current ?? "")}
          >
            將目前底色套用到全部頁面
          </Button>
        </>
      )}
    </aside>
  );
}
