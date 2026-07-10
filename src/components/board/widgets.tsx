"use client";

/* ============================================================
   Widget 渲染器 + 建立工廠（黑板畫布物件）
   ============================================================ */

import { useEffect, useState } from "react";
import { nanoid } from "nanoid";
import QRCode from "qrcode";
import { ExternalLink } from "lucide-react";
import type { Widget, WidgetType } from "@/lib/types";
import { SandboxFrame } from "@/components/sandbox/SandboxFrame";

/* ---------- 工廠：預設尺寸與 props ---------- */

let zCounter = 10;
export function nextZ() {
  return ++zCounter;
}
export function syncZCounter(widgets: Widget[]) {
  zCounter = Math.max(10, ...widgets.map((w) => w.z));
}

export function createWidget(
  type: WidgetType,
  center: { x: number; y: number },
  props: Record<string, unknown> = {}
): Widget {
  const defaults: Record<WidgetType, { w: number; h: number; props: Record<string, unknown> }> = {
    text: { w: 420, h: 140, props: { content: "點兩下編輯文字", fontSize: 40 } },
    sticky: { w: 240, h: 200, props: { content: "", color: "#fff6c9" } },
    image: { w: 420, h: 300, props: { src: "", alt: "" } },
    video: { w: 560, h: 315, props: { url: "" } },
    link: { w: 320, h: 88, props: { url: "", label: "" } },
    qr: { w: 240, h: 260, props: { url: "", label: "" } },
    embed: { w: 560, h: 400, props: { html: "" } },
  };
  const d = defaults[type];
  return {
    id: nanoid(8),
    type,
    x: Math.round(center.x - d.w / 2),
    y: Math.round(center.y - d.h / 2),
    w: d.w,
    h: d.h,
    z: nextZ(),
    props: { ...d.props, ...props },
  };
}

/* ---------- YouTube URL → embed ---------- */

function youtubeEmbed(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,20})/
  );
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

/* ---------- QR 圖 ---------- */

function QrImage({ url, size = 220 }: { url: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, { width: size, margin: 1 }).then(setDataUrl).catch(() => {});
  }, [url, size]);
  if (!url) return <p className="p-4 text-sm text-text-muted">尚未設定網址</p>;
  if (!dataUrl) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dataUrl} alt={`QR code：${url}`} className="size-full object-contain" />;
}

/* ---------- 主渲染器 ---------- */

export function WidgetContent({
  widget,
  editing,
  onPropsChange,
}: {
  widget: Widget;
  /** 是否為編輯模式（非投影） */
  editing: boolean;
  onPropsChange: (patch: Record<string, unknown>) => void;
}) {
  const p = widget.props as Record<string, string | number | undefined>;

  switch (widget.type) {
    case "text":
      return (
        <div
          className="size-full overflow-hidden p-3 leading-snug"
          style={{
            fontSize: Number(p.fontSize) || 40,
            fontFamily: p.fontFamily ? String(p.fontFamily) : undefined,
          }}
        >
          {editing ? (
            <textarea
              value={String(p.content ?? "")}
              onChange={(e) => onPropsChange({ content: e.target.value })}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="輸入文字…"
              aria-label="文字內容"
              className="size-full resize-none bg-transparent leading-snug outline-none placeholder:text-text-faint"
              style={{ fontSize: "inherit" }}
            />
          ) : (
            <p className="whitespace-pre-wrap">{String(p.content ?? "")}</p>
          )}
        </div>
      );

    case "sticky":
      return (
        <div
          className="size-full overflow-hidden rounded-md p-3 text-[#1c1c1c] shadow-sm"
          style={{ background: String(p.color || "#fff6c9") }}
        >
          {editing ? (
            <textarea
              value={String(p.content ?? "")}
              onChange={(e) => onPropsChange({ content: e.target.value })}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="便利貼…"
              aria-label="便利貼內容"
              className="size-full resize-none bg-transparent text-2xl leading-snug outline-none placeholder:text-black/30"
            />
          ) : (
            <p className="whitespace-pre-wrap text-2xl leading-snug">{String(p.content ?? "")}</p>
          )}
        </div>
      );

    case "image":
      return p.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={String(p.src)}
          alt={String(p.alt || "圖片")}
          className="size-full rounded-md object-contain"
          draggable={false}
        />
      ) : (
        <p className="p-4 text-sm text-text-muted">尚未選擇圖片</p>
      );

    case "video": {
      const embed = p.url ? youtubeEmbed(String(p.url)) : null;
      return embed ? (
        <iframe
          src={embed}
          title="影片"
          className="size-full rounded-md border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
          allowFullScreen
        />
      ) : (
        <p className="p-4 text-sm text-text-muted">貼上 YouTube 網址</p>
      );
    }

    case "link":
      return (
        <a
          href={String(p.url || "#")}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => { if (editing) e.preventDefault(); }}
          className="flex size-full items-center justify-center gap-2 rounded-md bg-text px-4 text-xl font-semibold text-on-dark [box-shadow:var(--shadow-inset)]"
        >
          <ExternalLink className="size-5 shrink-0" aria-hidden />
          <span className="truncate">{String(p.label || p.url || "未設定連結")}</span>
        </a>
      );

    case "qr":
      return (
        <figure className="flex size-full flex-col items-center justify-center gap-1 rounded-md bg-white p-2">
          <div className="min-h-0 flex-1">
            <QrImage url={String(p.url ?? "")} />
          </div>
          {p.label ? (
            <figcaption className="max-w-full truncate text-center text-sm font-medium text-[#1c1c1c]">
              {String(p.label)}
            </figcaption>
          ) : null}
        </figure>
      );

    case "embed":
      return p.html ? (
        <div className="size-full overflow-hidden rounded-md">
          <SandboxFrame html={String(p.html)} title="嵌入內容" />
        </div>
      ) : (
        <p className="p-4 text-sm text-text-muted">尚未貼入程式碼</p>
      );

    default:
      return null;
  }
}
