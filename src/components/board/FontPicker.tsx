"use client";

/* ============================================================
   FontPicker — 文字物件的字體選擇（含本機電腦字體）
   Local Font Access API（window.queryLocalFonts，Chromium 專屬）：
   - 首次點「載入電腦字體」→ 瀏覽器跳原生權限提示（local-fonts）
   - 取得字體家族清單供選擇；套用到 text widget 的 fontFamily
   - 不支援的瀏覽器（Safari/Firefox）優雅降級：只顯示內建字體
   注意：本機字體只在這台電腦上正確顯示，其他裝置會退回預設字體
   ============================================================ */

import { useState } from "react";
import { X, Type as TypeIcon, Laptop, Loader2 } from "lucide-react";
import { IconButton, Button } from "@/components/ui/Button";

/** 內建安全字體（所有裝置皆可顯示） */
const BUILTIN_FONTS = [
  { label: "預設（Noto Sans TC）", value: "" },
  { label: "標楷體", value: "BiauKai, DFKai-SB, KaiTi, serif" },
  { label: "宋體", value: "PMingLiU, SimSun, serif" },
  { label: "圓體", value: "Yuanti TC, YouYuan, sans-serif" },
  { label: "等寬（程式碼）", value: "ui-monospace, Menlo, Consolas, monospace" },
];

interface LocalFontData {
  family: string;
}

function supportsLocalFonts(): boolean {
  return typeof window !== "undefined" && "queryLocalFonts" in window;
}

export function FontPicker({
  current,
  onPick,
  onClose,
}: {
  current: string | undefined;
  onPick: (fontFamily: string) => void;
  onClose: () => void;
}) {
  const [localFamilies, setLocalFamilies] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  async function loadLocalFonts() {
    setLoading(true);
    setError("");
    try {
      const fonts = (await (
        window as unknown as { queryLocalFonts: () => Promise<LocalFontData[]> }
      ).queryLocalFonts()) as LocalFontData[];
      const families = [...new Set(fonts.map((f) => f.family))].sort((a, b) =>
        a.localeCompare(b, "zh-Hant")
      );
      setLocalFamilies(families);
    } catch (e) {
      setError(
        e instanceof Error && e.name === "SecurityError"
          ? "你拒絕了字體存取權限；可在網址列的網站設定中重新允許。"
          : "讀取電腦字體失敗（此功能需要 Chrome / Edge）。"
      );
    } finally {
      setLoading(false);
    }
  }

  const filtered =
    localFamilies?.filter((f) =>
      f.toLowerCase().includes(filter.toLowerCase())
    ) ?? null;

  return (
    <aside
      data-ui
      aria-label="字體選擇"
      className="absolute left-1/2 top-32 z-50 flex max-h-[60vh] w-80 -translate-x-1/2 flex-col gap-3 overflow-hidden rounded-xl border border-control bg-surface-raised p-4 [box-shadow:var(--shadow-raised)] motion-safe:animate-[panel-in_200ms_ease-out]"
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold">
          <TypeIcon className="size-4.5 text-board" aria-hidden />
          文字字體
        </h2>
        <IconButton label="關閉字體選擇" className="!size-9" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </div>

      {/* 內建字體 */}
      <div className="flex flex-col gap-1" role="group" aria-label="內建字體">
        {BUILTIN_FONTS.map(({ label, value }) => (
          <button
            key={label}
            onClick={() => onPick(value)}
            aria-pressed={(current ?? "") === value}
            className={`min-h-10 cursor-pointer rounded-md border px-3 text-left text-base transition-colors ${
              (current ?? "") === value
                ? "border-board bg-hover font-semibold"
                : "border-transparent hover:bg-hover"
            }`}
            style={value ? { fontFamily: value } : undefined}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 本機字體 */}
      <div className="flex min-h-0 flex-col gap-2 border-t border-border pt-3">
        {localFamilies === null ? (
          supportsLocalFonts() ? (
            <>
              <Button variant="surface" size="sm" onClick={loadLocalFonts} disabled={loading}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Laptop className="size-4" aria-hidden />
                )}
                載入電腦字體
              </Button>
              <p className="text-xs leading-relaxed text-text-faint">
                瀏覽器會詢問「使用你裝置上的字型」權限。本機字體只在這台電腦正確顯示，
                換裝置投影時會退回預設字體。
              </p>
              {error && <p className="text-xs text-danger">{error}</p>}
            </>
          ) : (
            <p className="text-xs leading-relaxed text-text-faint">
              讀取電腦字體需要 Chrome / Edge（Local Font Access API）；目前瀏覽器不支援，可使用上方內建字體。
            </p>
          )
        ) : (
          <>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={`搜尋 ${localFamilies.length} 個電腦字體…`}
              aria-label="搜尋電腦字體"
              className="h-10 shrink-0 rounded-sm border border-control bg-surface px-3 text-sm placeholder:text-text-muted"
            />
            <ul className="min-h-0 flex-1 overflow-y-auto" aria-label="電腦字體清單">
              {filtered!.slice(0, 200).map((family) => (
                <li key={family}>
                  <button
                    onClick={() => onPick(family)}
                    aria-pressed={current === family}
                    className={`min-h-10 w-full cursor-pointer rounded-md px-3 text-left text-base transition-colors ${
                      current === family ? "bg-hover font-semibold" : "hover:bg-hover"
                    }`}
                    style={{ fontFamily: `"${family}"` }}
                  >
                    {family}
                  </button>
                </li>
              ))}
              {filtered!.length > 200 && (
                <li className="px-3 py-2 text-xs text-text-faint">
                  還有 {filtered!.length - 200} 個——輸入關鍵字縮小範圍
                </li>
              )}
            </ul>
          </>
        )}
      </div>
    </aside>
  );
}
