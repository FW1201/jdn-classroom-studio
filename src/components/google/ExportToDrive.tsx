"use client";

/* ============================================================
   ExportToDriveButton — 匯出到 Google Drive 的共用按鈕
   未設定 Client ID 時不渲染；未連接時點擊會先觸發連接。
   成功後顯示結果 Dialog：開啟連結 + 分享到 Classroom
   ============================================================ */

import { useState, type ReactNode } from "react";
import { ExternalLink, Loader2, School, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useGoogleAuth } from "@/lib/google/hooks";
import { connectGoogle } from "@/lib/google/auth";
import { openClassroomShare, type ExportResult } from "@/lib/google/drive";

export function ExportToDriveButton({
  label,
  makeExport,
  variant = "ghost",
  size = "sm",
  icon,
}: {
  label: string;
  /** 執行匯出（呼叫 lib/google/drive 的 export* 函式） */
  makeExport: () => Promise<ExportResult>;
  variant?: "ghost" | "surface" | "primary";
  size?: "sm" | "md";
  icon?: ReactNode;
}) {
  const auth = useGoogleAuth();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState("");

  if (auth.status === "unconfigured") return null;

  async function run() {
    setBusy(true);
    setError("");
    try {
      if (auth.status !== "connected") await connectGoogle();
      setResult(await makeExport());
    } catch (e) {
      setError(e instanceof Error ? e.message : "匯出失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant={variant} size={size} onClick={run} disabled={busy}>
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          (icon ?? <Upload className="size-4" aria-hidden />)
        )}
        {label}
      </Button>
      {(result || error) && (
        <Dialog
          title={result ? "匯出完成" : "匯出失敗"}
          description={result ? `已建立：${result.name}` : error}
          onClose={() => { setResult(null); setError(""); }}
          maxWidth="max-w-md"
        >
          {result ? (
            <div className="flex flex-wrap gap-2">
              {result.webViewLink && (
                <>
                  <Button
                    variant="primary"
                    onClick={() => window.open(result.webViewLink, "_blank", "noopener")}
                  >
                    <ExternalLink className="size-4.5" aria-hidden />
                    在 Drive 開啟
                  </Button>
                  <Button
                    variant="surface"
                    onClick={() => openClassroomShare(result.webViewLink!)}
                  >
                    <School className="size-4.5" aria-hidden />
                    分享到 Classroom
                  </Button>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-text-muted">
              請確認已連接 Google、網路正常；若持續失敗，可先用本機 JSON 匯出備份。
            </p>
          )}
        </Dialog>
      )}
    </>
  );
}

/** 純 Classroom 分享按鈕（任何 URL 皆可用，免 Google 登入） */
export function ClassroomShareButton({ url, size = "sm" }: { url: string; size?: "sm" | "md" }) {
  return (
    <Button variant="surface" size={size} onClick={() => openClassroomShare(url)}>
      <School className="size-4" aria-hidden />
      分享到 Classroom
    </Button>
  );
}
