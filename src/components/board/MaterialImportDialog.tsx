"use client";

/* ============================================================
   MaterialImportDialog — 批量匯入教材（PDF / DOCX / PPT）
   來源：本機檔案（可多選）或 Google 雲端硬碟（Picker）
   流程：解析 → 逐頁縮圖勾選（預設全選）→ 匯入為黑板頁面
   匯入後黑板切換為「逐頁顯示」模式
   ============================================================ */

import { useRef, useState } from "react";
import {
  FileUp,
  CloudDownload,
  Loader2,
  CheckSquare,
  Square,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useGoogleAuth } from "@/lib/google/hooks";
import { connectGoogle } from "@/lib/google/auth";
import { estimateQuotaBytes, estimateUsageBytes } from "@/lib/storage";
import {
  pdfToPages,
  officeToPdfViaDrive,
  fileKind,
  pickDriveFile,
  downloadDriveFile,
  GOOGLE_PICKER_API_KEY,
  type MaterialPage,
} from "@/lib/materials";

type Phase =
  | { step: "source" }
  | { step: "parsing"; label: string; done: number; total: number }
  | { step: "select"; pages: MaterialPage[]; sourceName: string }
  | { step: "error"; message: string };

const PICKER_MIMETYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.ms-powerpoint",
  "application/vnd.google-apps.document",
  "application/vnd.google-apps.presentation",
].join(",");

export function MaterialImportDialog({
  onImport,
  onClose,
}: {
  /** 勾選完成後回傳頁面（呼叫端建立黑板頁並切換逐頁模式） */
  onImport: (pages: MaterialPage[], sourceName: string) => void;
  onClose: () => void;
}) {
  const auth = useGoogleAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ step: "source" });
  const [checked, setChecked] = useState<Set<number>>(new Set());

  async function parseFiles(files: File[]) {
    const all: MaterialPage[] = [];
    const names: string[] = [];
    try {
      for (const file of files) {
        const kind = fileKind(file.name);
        if (!kind) {
          throw new Error(`不支援的格式：${file.name}（支援 PDF / DOC(X) / PPT(X)）`);
        }
        names.push(file.name);
        let pdfData: ArrayBuffer;
        if (kind === "pdf") {
          setPhase({ step: "parsing", label: `讀取 ${file.name}…`, done: 0, total: 1 });
          pdfData = await file.arrayBuffer();
        } else {
          if (auth.status !== "connected") {
            throw new Error(
              `${file.name} 是 Office 檔：需要先「連接 Google」由雲端硬碟轉檔，或先自行匯出成 PDF 再上傳。`
            );
          }
          setPhase({ step: "parsing", label: `${file.name} 轉檔中（Google 雲端）…`, done: 0, total: 1 });
          pdfData = await officeToPdfViaDrive(file);
        }
        const pages = await pdfToPages(pdfData, (done, total) =>
          setPhase({ step: "parsing", label: `渲染 ${file.name} 頁面…`, done, total })
        );
        all.push(...pages);
      }
      if (!all.length) throw new Error("沒有讀到任何頁面");
      setChecked(new Set(all.map((_, i) => i)));
      setPhase({ step: "select", pages: all, sourceName: names.join("、") });
    } catch (e) {
      setPhase({ step: "error", message: e instanceof Error ? e.message : "解析失敗" });
    }
  }

  async function fromDrive() {
    try {
      if (auth.status !== "connected") await connectGoogle();
      const picked = await pickDriveFile(PICKER_MIMETYPES);
      if (!picked) return;
      setPhase({ step: "parsing", label: `下載 ${picked.name}…`, done: 0, total: 1 });
      const { data, kind } = await downloadDriveFile(picked);
      let pdfData = data;
      if (kind !== "pdf") {
        // Office 二進位檔：轉一手
        const f = new File([data], picked.name, { type: picked.mimeType });
        setPhase({ step: "parsing", label: `${picked.name} 轉檔中…`, done: 0, total: 1 });
        pdfData = await officeToPdfViaDrive(f);
      }
      const pages = await pdfToPages(pdfData, (done, total) =>
        setPhase({ step: "parsing", label: `渲染 ${picked.name} 頁面…`, done, total })
      );
      setChecked(new Set(pages.map((_, i) => i)));
      setPhase({ step: "select", pages, sourceName: picked.name });
    } catch (e) {
      setPhase({ step: "error", message: e instanceof Error ? e.message : "雲端匯入失敗" });
    }
  }

  function toggle(i: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const estKB =
    phase.step === "select"
      ? Math.round(
          [...checked].reduce((sum, i) => sum + phase.pages[i].dataUrl.length, 0) / 1024
        )
      : 0;
  // 以裝置實際儲存配額（IndexedDB）為準，取代舊版寫死的 localStorage 5MB 門檻
  const remainingKB = Math.max((estimateQuotaBytes() - estimateUsageBytes()) / 1024, 0);
  const nearLimit = remainingKB > 0 && estKB > remainingKB * 0.85;

  return (
    <Dialog
      title="匯入教材"
      description="支援 PDF / DOC(X) / PPT(X)。匯入後每一頁會成為黑板的一個頁面，並切換成逐頁顯示。"
      onClose={onClose}
      maxWidth="max-w-3xl"
    >
      {phase.step === "source" && (
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-control bg-surface p-6 transition-colors hover:border-border-strong hover:bg-hover"
            >
              <FileUp className="size-8 text-board" aria-hidden />
              <span className="font-semibold">從電腦上傳</span>
              <span className="text-xs text-text-muted">可一次選多個檔案</span>
            </button>
            <button
              type="button"
              onClick={fromDrive}
              disabled={!GOOGLE_PICKER_API_KEY && auth.status === "unconfigured"}
              className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-control bg-surface p-6 transition-colors hover:border-border-strong hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CloudDownload className="size-8 text-game" aria-hidden />
              <span className="font-semibold">從 Google 雲端硬碟</span>
              <span className="text-xs text-text-muted">
                {GOOGLE_PICKER_API_KEY ? "選擇 Drive 上的教材" : "需設定 Google API Key"}
              </span>
            </button>
          </div>
          <p className="text-xs leading-relaxed text-text-faint">
            DOC(X)／PPT(X) 需要「連接 Google」由雲端轉檔（或先自行匯出 PDF）。頁面以圖片存於瀏覽器，
            大型教材（30+ 頁）可能逼近容量上限，建議只勾選需要的頁面。
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = [...(e.target.files ?? [])];
              if (files.length) parseFiles(files);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {phase.step === "parsing" && (
        <div className="flex flex-col items-center gap-3 py-10" role="status" aria-live="polite">
          <Loader2 className="size-8 animate-spin text-board" aria-hidden />
          <p className="font-medium">{phase.label}</p>
          {phase.total > 1 && (
            <>
              <div className="h-2 w-64 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-text transition-[width] duration-200"
                  style={{ width: `${(phase.done / phase.total) * 100}%` }}
                />
              </div>
              <p className="text-sm tabular-nums text-text-muted">
                {phase.done} / {phase.total} 頁
              </p>
            </>
          )}
        </div>
      )}

      {phase.step === "select" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-text-muted">
              {phase.sourceName}・共 {phase.pages.length} 頁，勾選要加入的頁面
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setChecked(new Set(phase.pages.map((_, i) => i)))}>
                <CheckSquare className="size-4" aria-hidden />
                全選
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setChecked(new Set())}>
                <Square className="size-4" aria-hidden />
                全不選
              </Button>
            </div>
          </div>

          <div className="grid max-h-[45dvh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
            {phase.pages.map((pg, i) => {
              const on = checked.has(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggle(i)}
                  aria-pressed={on}
                  aria-label={`第 ${i + 1} 頁${on ? "（已選）" : ""}`}
                  className={`group relative overflow-hidden rounded-md border-2 transition-all ${
                    on ? "border-board" : "border-border opacity-55 hover:opacity-80"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pg.dataUrl} alt="" className="w-full" loading="lazy" />
                  <span
                    className={`absolute left-1.5 top-1.5 flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                      on ? "bg-board text-white" : "bg-black/40 text-white"
                    }`}
                  >
                    {i + 1}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
            <p className="text-xs tabular-nums text-text-faint">
              已選 {checked.size} 頁・約 {estKB > 1024 ? `${(estKB / 1024).toFixed(1)} MB` : `${estKB} KB`}
              {nearLimit && (
                <span className="ml-2 inline-flex items-center gap-1 text-danger">
                  <AlertTriangle className="size-3.5" aria-hidden />
                  接近容量上限，建議減少頁數
                </span>
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setPhase({ step: "source" })}>重選檔案</Button>
              <Button
                variant="primary"
                disabled={checked.size === 0}
                onClick={() => {
                  const selected = [...checked].sort((a, b) => a - b).map((i) => phase.pages[i]);
                  onImport(selected, phase.sourceName);
                }}
              >
                匯入 {checked.size} 頁
              </Button>
            </div>
          </div>
        </div>
      )}

      {phase.step === "error" && (
        <div className="flex flex-col gap-4">
          <p className="flex items-start gap-2 rounded-md border border-danger/40 bg-surface p-4 text-sm leading-relaxed">
            <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-danger" aria-hidden />
            {phase.message}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>關閉</Button>
            <Button variant="primary" onClick={() => setPhase({ step: "source" })}>再試一次</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
