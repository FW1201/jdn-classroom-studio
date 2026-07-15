"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Download, Upload, Trash2, Sun, Moon, MonitorSmartphone } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useSettings } from "@/lib/hooks";
import {
  clearAll,
  downloadExport,
  estimateQuotaBytes,
  estimateUsageBytes,
  importAll,
  setSettings,
  subscribe,
  validateBundle,
} from "@/lib/storage";
import type { ExportBundle } from "@/lib/types";
import { Dialog } from "@/components/ui/Dialog";
import { JdnBrandLinks } from "@/components/brand/JdnBrandLinks";
import { GoogleAccountCard } from "@/components/google/GoogleAccountCard";

function useUsage() {
  return useSyncExternalStore(subscribe, estimateUsageBytes, () => 0);
}

function useQuota() {
  return useSyncExternalStore(subscribe, estimateQuotaBytes, () => 5 * 1024 * 1024);
}

const THEMES = [
  { value: "system", label: "跟隨系統", icon: MonitorSmartphone },
  { value: "light", label: "淺色", icon: Sun },
  { value: "dark", label: "深色", icon: Moon },
] as const;

export function SettingsView() {
  const settings = useSettings();
  const usage = useUsage();
  const quota = useQuota();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<ExportBundle | null>(null);
  const [notice, setNotice] = useState("");
  const ratio = quota > 0 ? Math.min(usage / quota, 1) : 0;
  const mb = (usage / 1024 / 1024).toFixed(2);
  const quotaMb = quota / 1024 / 1024;
  const quotaLabel = quotaMb >= 1024 ? `${(quotaMb / 1024).toFixed(1)} GB` : `${quotaMb.toFixed(0)} MB`;

  function handleImport(file: File) {
    file.text().then((text) => {
      try {
        const data = JSON.parse(text);
        if (!validateBundle(data)) {
          setNotice("檔案格式不符：請選擇由本站匯出的 JSON 備份。");
          return;
        }
        setPendingImport(data);
      } catch {
        setNotice("無法讀取檔案：請確認是有效的 JSON 備份。");
      }
    });
  }

  function completeImport(mode: "merge" | "replace") {
    if (!pendingImport) return;
    importAll(pendingImport, mode);
    setPendingImport(null);
    setNotice(mode === "replace" ? "匯入完成：目前資料已由備份覆蓋。" : "匯入完成：備份已合併到目前資料。" );
  }

  return (
    <>
      <PageHeader title="設定" desc="主題、資料容量、備份與清除。" />
      <p className="sr-only" aria-live="polite">{notice}</p>
      {notice && (
        <div className="mb-4 rounded-md border border-control bg-surface-raised px-4 py-3 text-sm" role="status">
          {notice}
        </div>
      )}
      <div className="flex flex-col gap-4">
        {/* 主題 */}
        <Card className="flex flex-col gap-4 p-5">
          <h2 className="text-lg font-bold">外觀主題</h2>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="主題選擇">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant={settings.theme === value ? "primary" : "surface"}
                role="radio"
                aria-checked={settings.theme === value}
                onClick={() => setSettings({ theme: value })}
              >
                <Icon className="size-4.5" aria-hidden />
                {label}
              </Button>
            ))}
          </div>
          <p className="text-sm text-text-muted">
            投影建議：明亮教室用淺色，暗房投影用深色。
          </p>
        </Card>

        {/* Google 雲端同步（選配） */}
        <GoogleAccountCard />

        <Card className="flex flex-col gap-4 p-5">
          <div>
            <h2 className="text-lg font-bold">關於與社群</h2>
            <p className="mt-1 text-sm leading-relaxed text-text-muted">
              本工具由數位敘事力期刊 Journal of Digital Narrative 出品，持續分享 AI × 教育工具、教學案例與數位敘事實作。
            </p>
          </div>
          <JdnBrandLinks />
        </Card>

        {/* 容量 */}
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="text-lg font-bold">資料容量</h2>
          <div
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(ratio * 100)}
            aria-label="裝置儲存空間使用量"
            className="h-3 overflow-hidden rounded-full border border-border bg-surface-raised"
          >
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{
                width: `${Math.max(ratio * 100, 2)}%`,
                background: ratio > 0.85 ? "var(--danger)" : "var(--text)",
              }}
            />
          </div>
          <p className="text-sm tabular-nums text-text-muted">
            已使用 {mb} MB / 約 {quotaLabel}（{Math.round(ratio * 100)}%）
            {ratio > 0.85 && (
              <span className="ml-2 font-medium text-danger">
                空間吃緊——請匯出備份並刪除舊資料
              </span>
            )}
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            所有資料只存在此瀏覽器的 localStorage：換電腦、換瀏覽器、清除瀏覽資料都會遺失。
            請養成定期「匯出備份」的習慣。
          </p>
        </Card>

        {/* 備份 */}
        <Card id="backup" className="scroll-mt-6 flex flex-col gap-4 p-5">
          <h2 className="text-lg font-bold">備份與還原</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => downloadExport()}>
              <Download className="size-4.5" aria-hidden />
              匯出全部資料（JSON）
            </Button>
            <Button variant="ghost" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4.5" aria-hidden />
              匯入備份
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.target.value = "";
              }}
            />
          </div>
        </Card>

        {/* 危險區 */}
        <Card className="flex flex-col gap-4 border-danger/40 p-5">
          <h2 className="text-lg font-bold text-danger">危險區</h2>
          <p className="text-sm text-text-muted">
            清除所有資料（班級、黑板、遊戲、成果牆與設定），無法復原。
          </p>
          <div>
            <Button
              variant="danger"
              onClick={() => {
                if (!confirm("確定要清除「所有」資料嗎？此動作無法復原。")) return;
                if (!confirm("最後確認：建議先匯出備份。真的要清除嗎？")) return;
                clearAll();
                alert("已清除所有資料。");
              }}
            >
              <Trash2 className="size-4.5" aria-hidden />
              清除所有資料
            </Button>
          </div>
        </Card>
      </div>
      {pendingImport && (
        <Dialog title="選擇匯入方式" description="請確認要保留目前資料，或完全以備份內容取代。" onClose={() => setPendingImport(null)} maxWidth="max-w-lg">
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => completeImport("merge")}
              className="min-h-16 rounded-lg border border-control bg-surface p-4 text-left transition-colors hover:bg-hover"
            >
              <span className="block font-semibold">合併資料（建議）</span>
              <span className="mt-1 block text-sm text-text-muted">保留目前內容，只加入備份中尚未出現的項目。</span>
            </button>
            <button
              type="button"
              onClick={() => completeImport("replace")}
              className="min-h-16 rounded-lg border border-danger/50 bg-surface p-4 text-left transition-colors hover:bg-hover"
            >
              <span className="block font-semibold text-danger">覆蓋目前資料</span>
              <span className="mt-1 block text-sm text-text-muted">完全以備份為準；目前未包含在備份內的資料會消失。</span>
            </button>
            <Button type="button" variant="ghost" onClick={() => setPendingImport(null)}>取消匯入</Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
