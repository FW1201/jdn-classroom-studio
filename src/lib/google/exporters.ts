/* ============================================================
   內容產生器 — 把本站資料轉成可上傳 Drive 的 CSV / HTML
   （轉檔由 Drive API 依目標 mimeType 自動進行）
   ============================================================ */

import type { Board, Roster, Wall } from "@/lib/types";

function csvEscape(value: string): string {
  // 防公式注入（CSV Injection）：開頭是 =+-@ 會被 Sheets/Excel 當公式執行，
  // 前綴單引號讓試算表視為純文字
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\n]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

function htmlEscape(s: string): string {
  // 含屬性用途（如 src="..."），一併跳脫雙引號避免屬性被跳脫出去
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------- 名單 → CSV（→ Sheets）---------- */

export function rosterToCsv(roster: Roster): string {
  const rows = [["座號", "姓名", "標籤"]];
  for (const s of roster.students) {
    rows.push([s.number ?? "", s.name, (s.tags ?? []).join("、")]);
  }
  return rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
}

/* ---------- 成果牆 → CSV（→ Sheets）---------- */

export function wallToCsv(wall: Wall): string {
  const rows = [["作者", "內容", "分組", "加星"]];
  for (const c of wall.cards) {
    rows.push([
      c.author ?? "",
      c.kind === "image" ? "（圖片）" : c.content,
      c.group ?? "",
      c.starred ? "★" : "",
    ]);
  }
  return rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
}

/* ---------- 成果牆 → HTML（→ Docs）---------- */

export function wallToHtml(wall: Wall): string {
  const cards = wall.cards
    .filter((c) => !c.hidden)
    .map((c) => {
      const body =
        c.kind === "image"
          ? `<img src="${htmlEscape(c.content)}" style="max-width:480px" />`
          : `<p style="font-size:14pt;margin:0 0 4pt">${htmlEscape(c.content)}</p>`;
      const author = c.author
        ? `<p style="color:#666;margin:0 0 12pt">— ${htmlEscape(c.author)}${c.starred ? " ★" : ""}</p>`
        : `<p style="margin:0 0 12pt">${c.starred ? "★" : ""}</p>`;
      return `${body}${author}`;
    })
    .join("\n");
  return `<html><head><meta charset="utf-8"></head><body>
<h1>${htmlEscape(wall.title)}</h1>
${wall.prompt ? `<p style="font-size:13pt;color:#444">${htmlEscape(wall.prompt)}</p><hr/>` : ""}
${cards}
<p style="color:#999;font-size:9pt">由 JDN 課堂工作站匯出・${new Date().toLocaleString("zh-TW")}</p>
</body></html>`;
}

/* ---------- 黑板 → HTML（→ Slides；保真度有限）---------- */

const PAGE_W = 1280;
const PAGE_H = 720;

export function boardToHtml(board: Board): string {
  const pages = board.pages
    .map((page, pi) => {
      const widgets = page.widgets
        .slice()
        .sort((a, b) => a.z - b.z)
        .map((w) => {
          const p = w.props as Record<string, string | number | undefined>;
          const base = `position:absolute;left:${w.x}px;top:${w.y}px;width:${w.w}px;height:${w.h}px;`;
          switch (w.type) {
            case "text":
              return `<div style="${base}font-size:${Number(p.fontSize) || 40}px;white-space:pre-wrap">${htmlEscape(String(p.content ?? ""))}</div>`;
            case "sticky":
              return `<div style="${base}background:${String(p.color || "#fff6c9")};padding:8px;font-size:24px;white-space:pre-wrap">${htmlEscape(String(p.content ?? ""))}</div>`;
            case "image":
              return p.src
                ? `<img src="${String(p.src)}" style="${base}object-fit:contain" />`
                : "";
            case "link":
            case "qr":
            case "video":
              return `<div style="${base}font-size:18px;color:#3355aa">${htmlEscape(String(p.label || p.url || ""))}</div>`;
            case "embed":
              return `<div style="${base}border:1px dashed #999;color:#999;font-size:16px;padding:8px">（互動內容：請於課堂工作站開啟）</div>`;
            default:
              return "";
          }
        })
        .join("\n");
      return `<div style="position:relative;width:${PAGE_W}px;height:${PAGE_H}px;overflow:hidden;${pi < board.pages.length - 1 ? "page-break-after:always;" : ""}">
<h2 style="position:absolute;right:12px;bottom:8px;color:#bbb;font-size:12px;margin:0">${pi + 1}</h2>
${widgets}
</div>`;
    })
    .join("\n");
  return `<html><head><meta charset="utf-8"><title>${htmlEscape(board.title)}</title></head><body style="margin:0">${pages}</body></html>`;
}
