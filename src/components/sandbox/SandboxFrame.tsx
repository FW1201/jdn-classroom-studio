"use client";

/* ============================================================
   SandboxFrame — 貼入 HTML 的唯一執行通道（模式二 + 黑板 embed widget 共用）
   安全原則：srcdoc + sandbox="allow-scripts"（刻意不加 allow-same-origin），
   遊戲程式碼無法存取母頁 DOM / cookie / localStorage。
   ============================================================ */

import { useMemo } from "react";

/** 允許以「一般 iframe＋allow-same-origin」信任的嵌入服務網域白名單 */
const TRUSTED_EMBED_HOSTS = [
  "youtube.com",
  "youtube-nocookie.com",
  "wordwall.net",
  "genial.ly",
  "docs.google.com",
];

function isTrustedEmbedHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return TRUSTED_EMBED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/** 若貼入的是 <iframe src="..."> 嵌入碼，且來源在白名單內，抽出 src 直接用外部 iframe */
function extractIframeSrc(html: string): string | null {
  const trimmed = html.trim();
  if (!/^<iframe[\s>]/i.test(trimmed)) return null;
  const m = trimmed.match(/src=["']([^"']+)["']/i);
  const src = m ? m[1] : null;
  return src && isTrustedEmbedHost(src) ? src : null;
}

export function SandboxFrame({
  html,
  title,
  className = "",
  allowFullscreen = false,
}: {
  html: string;
  title: string;
  className?: string;
  allowFullscreen?: boolean;
}) {
  const externalSrc = useMemo(() => extractIframeSrc(html), [html]);

  if (externalSrc) {
    // 外部服務嵌入（YouTube、Wordwall…）：一般 iframe，仍加 sandbox 白名單
    return (
      <iframe
        src={externalSrc}
        title={title}
        className={`size-full border-0 ${className}`}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
        allowFullScreen={allowFullscreen}
        loading="lazy"
      />
    );
  }

  return (
    <iframe
      srcDoc={html}
      title={title}
      className={`size-full border-0 ${className}`}
      // 不含 allow-same-origin：貼入的程式碼拿不到母頁任何東西
      sandbox="allow-scripts allow-pointer-lock allow-popups"
      allowFullScreen={allowFullscreen}
    />
  );
}
