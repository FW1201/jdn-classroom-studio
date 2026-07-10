"use client";

/* ============================================================
   設定頁「Google 帳號」卡 — G1 連接/中斷 + G2 雲端備份/還原
   未設定 Client ID 時顯示設定指引；一切皆選配，不影響單機使用
   ============================================================ */

import { useState } from "react";
import {
  CloudUpload,
  CloudDownload,
  LogIn,
  LogOut,
  Loader2,
  Cloud,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useGoogleAuth } from "@/lib/google/hooks";
import { connectGoogle, disconnectGoogle } from "@/lib/google/auth";
import {
  listBackups,
  uploadBackup,
  downloadBackup,
  type BackupFileMeta,
} from "@/lib/google/drive";
import { exportAll, importAll, validateBundle } from "@/lib/storage";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GoogleAccountCard() {
  const auth = useGoogleAuth();
  const [busy, setBusy] = useState<"" | "connect" | "backup" | "list" | "restore">("");
  const [notice, setNotice] = useState("");
  const [backups, setBackups] = useState<BackupFileMeta[] | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<BackupFileMeta | null>(null);

  async function handleConnect() {
    setBusy("connect");
    setNotice("");
    try {
      await connectGoogle();
      setNotice("已連接 Google 帳號。");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "連接失敗");
    } finally {
      setBusy("");
    }
  }

  async function handleBackup() {
    setBusy("backup");
    setNotice("");
    try {
      const meta = await uploadBackup(JSON.stringify(exportAll()));
      setNotice(`備份完成：${meta.name}`);
      setBackups(null); // 讓下次展開重新載入
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "備份失敗");
    } finally {
      setBusy("");
    }
  }

  async function handleListBackups() {
    setBusy("list");
    setNotice("");
    try {
      setBackups(await listBackups());
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "讀取備份清單失敗");
    } finally {
      setBusy("");
    }
  }

  async function handleRestore(mode: "merge" | "replace") {
    if (!restoreTarget) return;
    setBusy("restore");
    try {
      const text = await downloadBackup(restoreTarget.id);
      const data = JSON.parse(text);
      if (!validateBundle(data)) {
        setNotice("備份檔格式不符，無法還原。");
        return;
      }
      importAll(data, mode);
      setNotice(mode === "replace" ? "已由雲端備份覆蓋還原。" : "已合併雲端備份。");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "還原失敗");
    } finally {
      setRestoreTarget(null);
      setBusy("");
    }
  }

  if (auth.status === "unconfigured") {
    return (
      <Card className="flex flex-col gap-3 p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Cloud className="size-5 text-text-muted" aria-hidden />
          Google 雲端同步（選配）
        </h2>
        <p className="text-sm leading-relaxed text-text-muted">
          尚未設定 Google Client ID。完成 GCP 設定並在部署環境加入
          <code className="mx-1 rounded bg-surface-raised px-1.5 py-0.5 text-xs">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>
          後，這裡會出現「連接 Google」：可將資料備份到你的 Google 雲端硬碟、匯出 Google 簡報／試算表／文件。
          設定步驟見專案內 <code className="rounded bg-surface-raised px-1.5 py-0.5 text-xs">docs/gcp-setup.md</code>。
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Cloud className="size-5 text-roster" aria-hidden />
          Google 雲端同步
        </h2>
        {auth.status === "connected" && auth.profile ? (
          <div className="flex items-center gap-2.5">
            {auth.profile.picture && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={auth.profile.picture}
                alt=""
                className="size-9 rounded-full border border-border"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="text-right">
              <p className="text-sm font-semibold">{auth.profile.name}</p>
              <p className="text-xs text-text-muted">{auth.profile.email}</p>
            </div>
          </div>
        ) : null}
      </div>

      <p aria-live="polite" className={notice ? "rounded-md border border-control bg-surface-raised px-3 py-2 text-sm" : "sr-only"}>
        {notice}
      </p>

      {auth.status !== "connected" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-relaxed text-text-muted">
            連接後可把全站資料備份到你的 Google 雲端硬碟（應用程式專屬空間），並將黑板、名單、成果牆匯出成 Google 簡報／試算表／文件。
            本站只能存取「自己建立」的檔案，無法讀取你雲端硬碟的其他內容。
          </p>
          <div>
            <Button variant="primary" onClick={handleConnect} disabled={busy === "connect"}>
              {busy === "connect" ? (
                <Loader2 className="size-4.5 animate-spin" aria-hidden />
              ) : (
                <LogIn className="size-4.5" aria-hidden />
              )}
              連接 Google
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* 備份操作 */}
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={handleBackup} disabled={busy === "backup"}>
              {busy === "backup" ? (
                <Loader2 className="size-4.5 animate-spin" aria-hidden />
              ) : (
                <CloudUpload className="size-4.5" aria-hidden />
              )}
              立即備份到雲端
            </Button>
            <Button variant="ghost" onClick={handleListBackups} disabled={busy === "list"}>
              {busy === "list" ? (
                <Loader2 className="size-4.5 animate-spin" aria-hidden />
              ) : (
                <CloudDownload className="size-4.5" aria-hidden />
              )}
              查看雲端備份
            </Button>
            <Button variant="ghost" onClick={() => { disconnectGoogle(); setBackups(null); setNotice("已中斷連接。"); }}>
              <LogOut className="size-4.5" aria-hidden />
              中斷連接
            </Button>
          </div>
          <p className="text-xs text-text-faint">
            備份存於 Drive 應用程式資料夾（不佔用你的雲端硬碟畫面），自動保留最近 5 份。
          </p>

          {/* 備份清單 */}
          {backups !== null && (
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <h3 className="text-sm font-semibold">雲端備份（最近 {backups.length} 份）</h3>
              {backups.length === 0 ? (
                <p className="text-sm text-text-muted">還沒有任何雲端備份。</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {backups.map((b) => (
                    <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface-raised px-3 py-2">
                      <span className="text-sm tabular-nums">
                        {formatTime(b.modifiedTime)}
                        <span className="ml-2 text-xs text-text-faint">
                          {b.size ? `${(Number(b.size) / 1024).toFixed(0)} KB` : ""}
                        </span>
                      </span>
                      <Button variant="surface" size="sm" onClick={() => setRestoreTarget(b)}>
                        還原此備份
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* 還原方式對話框 */}
      {restoreTarget && (
        <Dialog
          title="從雲端備份還原"
          description={`備份時間：${formatTime(restoreTarget.modifiedTime)}。請選擇還原方式。`}
          onClose={() => setRestoreTarget(null)}
          maxWidth="max-w-lg"
        >
          <div className="grid gap-3">
            <button
              type="button"
              disabled={busy === "restore"}
              onClick={() => handleRestore("merge")}
              className="min-h-16 rounded-lg border border-control bg-surface p-4 text-left transition-colors hover:bg-hover"
            >
              <span className="block font-semibold">合併資料（建議）</span>
              <span className="mt-1 block text-sm text-text-muted">保留目前內容，只加入備份中尚未出現的項目。</span>
            </button>
            <button
              type="button"
              disabled={busy === "restore"}
              onClick={() => handleRestore("replace")}
              className="min-h-16 rounded-lg border border-danger/50 bg-surface p-4 text-left transition-colors hover:bg-hover"
            >
              <span className="block font-semibold text-danger">覆蓋目前資料</span>
              <span className="mt-1 block text-sm text-text-muted">完全以備份為準；目前未包含在備份內的資料會消失。</span>
            </button>
          </div>
        </Dialog>
      )}
    </Card>
  );
}
