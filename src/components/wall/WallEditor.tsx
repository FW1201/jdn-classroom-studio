"use client";

/* ============================================================
   WallEditor — 成果收集牆（模式三，匯入式）
   資料進站三途徑：手動卡片 / 批次貼上（每行一張）/ CSV 匯入
   外部表單橋接：submitUrl → QR 投影給學生，結果 CSV 匯回
   展示：grid / masonry / columns、加星、隱藏、洗牌、聚光逐張揭示
   ============================================================ */

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Papa from "papaparse";
import { nanoid } from "nanoid";
import QRCode from "qrcode";
import {
  Home,
  Plus,
  Upload,
  ClipboardPaste,
  Star,
  EyeOff,
  Eye,
  Trash2,
  Shuffle,
  Play,
  X,
  QrCode,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Columns3,
  AlignVerticalJustifyStart,
  Image as ImageIcon,
} from "lucide-react";
import type { Wall, WallCard, WallLayout } from "@/lib/types";
import { useItem } from "@/lib/hooks";
import { getItem, updateItem, StorageQuotaError } from "@/lib/storage";
import { Button, IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { ExportToDriveButton, ClassroomShareButton } from "@/components/google/ExportToDrive";
import { exportCsvAsSheet, exportHtmlAsDoc } from "@/lib/google/drive";
import { wallToCsv, wallToHtml } from "@/lib/google/exporters";

/* ---------- CSV：欄位「作者,內容」或「內容」；Google 表單匯出亦可 ---------- */

function parseCardsCsv(text: string): WallCard[] {
  const result = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
  const rows = result.data;
  if (!rows.length) return [];
  const first = rows[0].join(",");
  const hasHeader = /作者|姓名|內容|時間戳|author|name|content|timestamp/i.test(first);
  const body = hasHeader ? rows.slice(1) : rows;
  // Google 表單匯出常見格式：時間戳記, 姓名, 回答 → 取最後兩欄
  const cards: WallCard[] = [];
  for (const cols of body) {
    const cells = cols.map((s) => (s ?? "").trim()).filter(Boolean);
    if (!cells.length) continue;
    const content = cells[cells.length - 1];
    if (!content) continue;
    const author = cells.length >= 2 ? cells[cells.length - 2] : undefined;
    // 跳過像時間戳的 author
    const cleanAuthor = author && !/\d{4}\/\d+\/\d+|\d+:\d+/.test(author) ? author : undefined;
    cards.push({ id: nanoid(8), kind: "text", content, author: cleanAuthor });
  }
  return cards;
}

/* ---------- QR 對話框（投稿入口）---------- */

function QrDialog({ url, onClose }: { url: string; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => {
    QRCode.toDataURL(url, { width: 480, margin: 1 }).then(setDataUrl).catch(() => {});
  }, [url]);
  return (
    <Dialog title="投稿入口 QR 碼" onClose={onClose} maxWidth="max-w-xl" panelClassName="bg-white text-[#1c1c1c]" scrimClassName="bg-black/70">
      <div className="flex flex-col items-center gap-4">
        {dataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt={`投稿入口 QR：${url}`} className="size-72 md:size-96" />
        )}
        <p className="max-w-sm break-all text-center text-sm text-[#5f5f5d]">{url}</p>
        <Button variant="primary" onClick={onClose}>關閉</Button>
      </div>
    </Dialog>
  );
}

/* ---------- 卡片 ---------- */

const CARD_TINTS = ["#fff6c9", "#e8f4f0", "#fbe9e0", "#eee9fb", "#e9f0fb"];

function WallCardView({
  card,
  index,
  present,
  onStar,
  onHide,
  onDelete,
  onFocus,
}: {
  card: WallCard;
  index: number;
  present: boolean;
  onStar: () => void;
  onHide: () => void;
  onDelete: () => void;
  onFocus: () => void;
}) {
  if (card.hidden && present) return null;
  return (
    <figure
      className={`group relative mb-4 break-inside-avoid rounded-lg border border-border p-4 transition-opacity ${card.hidden ? "opacity-40" : ""}`}
      style={{ background: CARD_TINTS[index % CARD_TINTS.length] }}
    >
      {card.starred && (
        <Star aria-label="已加星" className="absolute -right-2 -top-2 size-6 fill-[var(--star)] text-[var(--star)]" />
      )}
      <button
        onClick={onFocus}
        className="block min-h-11 w-full cursor-zoom-in text-left"
        aria-label={`放大檢視第 ${index + 1} 張卡片`}
      >
        {card.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.content} alt={card.author ? `${card.author} 的作品` : "作品圖片"} className="w-full rounded-md" />
        ) : (
          <blockquote className="whitespace-pre-wrap text-lg leading-relaxed text-[#1c1c1c]">
            {card.content}
          </blockquote>
        )}
      </button>
      {card.author && (
        <figcaption className="mt-2 text-sm font-medium text-[#5f5f5d]">
          — {card.author}
        </figcaption>
      )}
      {!present && (
        <div className="absolute right-2 top-2 flex gap-2 opacity-100 transition-opacity md:opacity-0 md:focus-within:opacity-100 md:group-hover:opacity-100">
          <IconButton label={card.starred ? "取消加星" : "加星"} className="!bg-white/95" onClick={onStar}>
            <Star className={`size-4 ${card.starred ? "fill-[var(--star)] text-[var(--star)]" : ""}`} />
          </IconButton>
          <IconButton label={card.hidden ? "顯示卡片" : "隱藏卡片"} className="!bg-white/95" onClick={onHide}>
            {card.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </IconButton>
          <IconButton label="刪除卡片" className="!bg-white/95" onClick={onDelete}>
            <Trash2 className="size-4 text-danger" />
          </IconButton>
        </div>
      )}
    </figure>
  );
}

/* ---------- 主編輯器 ---------- */

const LAYOUTS: { value: WallLayout; label: string; icon: typeof LayoutGrid }[] = [
  { value: "grid", label: "格狀", icon: LayoutGrid },
  { value: "masonry", label: "瀑布流", icon: AlignVerticalJustifyStart },
  { value: "columns", label: "三欄", icon: Columns3 },
];

function WallEditorInner() {
  const params = useParams<{ id: string }>();
  const wall = useItem("walls", params.id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const present = searchParams.get("present") === "1";

  const [batchOpen, setBatchOpen] = useState(false);
  const [batchText, setBatchText] = useState("");
  const [cardOpen, setCardOpen] = useState(false);
  const [cardContent, setCardContent] = useState("");
  const [cardAuthor, setCardAuthor] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  const mutate = (fn: (w: Wall) => Partial<Wall>) => {
    const fresh = getItem("walls", params.id);
    if (!fresh) return;
    try {
      updateItem("walls", params.id, fn(fresh));
    } catch (e) {
      if (e instanceof StorageQuotaError) alert(e.message);
      else throw e;
    }
  };

  if (!wall) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <p className="text-lg text-text-muted">找不到這面成果牆（可能已被刪除）</p>
        <Button variant="primary" onClick={() => router.push("/walls")}>回成果牆列表</Button>
      </div>
    );
  }

  const visibleCards = present ? wall.cards.filter((c) => !c.hidden) : wall.cards;
  const focused = focusIndex !== null ? visibleCards[focusIndex] : null;

  function addTextCard() {
    setCardOpen(true);
  }

  function submitTextCard() {
    const content = cardContent.trim();
    if (!content) return;
    mutate((w) => ({
      cards: [...w.cards, { id: nanoid(8), kind: "text", content, author: cardAuthor.trim() || undefined }],
    }));
    setCardContent("");
    setCardAuthor("");
    setCardOpen(false);
  }

  function importBatch() {
    const cards: WallCard[] = batchText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        // 支援「作者：內容」格式
        const m = line.match(/^(.{1,12}?)[:：]\s*(.+)$/);
        return m
          ? { id: nanoid(8), kind: "text" as const, content: m[2], author: m[1] }
          : { id: nanoid(8), kind: "text" as const, content: line };
      });
    if (!cards.length) return;
    mutate((w) => ({ cards: [...w.cards, ...cards] }));
    setBatchText("");
    setBatchOpen(false);
  }

  function importCsv(file: File) {
    file.text().then((text) => {
      const cards = parseCardsCsv(text);
      if (!cards.length) {
        alert("沒有讀到任何卡片：支援「作者,內容」欄位或 Google 表單匯出的 CSV。");
        return;
      }
      mutate((w) => ({ cards: [...w.cards, ...cards] }));
    });
  }

  function importImage(file: File) {
    const reader = new FileReader();
    reader.onload = () =>
      mutate((w) => ({
        cards: [...w.cards, { id: nanoid(8), kind: "image", content: String(reader.result) }],
      }));
    reader.readAsDataURL(file);
  }

  function patchCard(cid: string, patch: Partial<WallCard>) {
    mutate((w) => ({
      cards: w.cards.map((c) => (c.id === cid ? { ...c, ...patch } : c)),
    }));
  }

  function shuffle() {
    mutate((w) => ({ cards: [...w.cards].sort(() => Math.random() - 0.5) }));
  }

  const layoutClass =
    wall.layout === "grid"
      ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [&>figure]:mb-0"
      : wall.layout === "columns"
        ? "columns-1 gap-4 sm:columns-2 lg:columns-3"
        : "columns-2 gap-4 md:columns-3 xl:columns-4";

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      {/* ===== 頂欄 ===== */}
      <header className="sticky top-0 z-40 flex min-h-14 flex-wrap items-stretch justify-between gap-2 border-b border-border bg-surface px-3 py-2 sm:items-center">
        <div className="flex w-full min-w-0 flex-1 items-center gap-2 sm:w-auto">
          <Link href="/walls" aria-label="回成果牆列表" className="flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-hover">
            <Home className="size-5" />
          </Link>
          {present ? (
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold">{wall.title}</h1>
              {wall.prompt && <p className="truncate text-sm text-text-muted">{wall.prompt}</p>}
            </div>
          ) : (
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <input
                value={wall.title}
                onChange={(e) => mutate(() => ({ title: e.target.value }))}
                aria-label="成果牆標題"
                className="h-11 w-full max-w-md rounded-md bg-transparent px-2 text-lg font-bold hover:bg-hover focus:bg-surface-raised"
              />
              <input
                value={wall.prompt ?? ""}
                onChange={(e) => mutate(() => ({ prompt: e.target.value }))}
                placeholder="題目／給學生的說明（投影時顯示）"
                aria-label="題目說明"
                className="h-11 w-full max-w-md rounded-md bg-transparent px-2 text-base text-text-muted placeholder:text-text-muted hover:bg-hover focus:bg-surface-raised sm:text-sm"
              />
            </div>
          )}
        </div>
        <div className="flex w-full items-center gap-1.5 overflow-x-auto pb-1 sm:w-auto sm:flex-wrap sm:overflow-visible sm:pb-0">
          {/* 佈局切換 */}
          <div role="radiogroup" aria-label="佈局" className="flex items-center gap-1">
            {LAYOUTS.map(({ value, label, icon: Icon }) => (
              <IconButton
                key={value}
                label={`佈局：${label}`}
                active={wall.layout === value}
                onClick={() => mutate(() => ({ layout: value }))}
              >
                <Icon className="size-4.5" />
              </IconButton>
            ))}
          </div>
          <IconButton label="洗牌" onClick={shuffle}>
            <Shuffle className="size-4.5" />
          </IconButton>
          {wall.submitUrl && (
            <IconButton label="顯示投稿 QR" onClick={() => setQrOpen(true)}>
              <QrCode className="size-4.5" />
            </IconButton>
          )}
          {present ? (
            <Button variant="ghost" size="sm" onClick={() => router.push(`/wall/${wall.id}`)}>
              <X className="size-4" aria-hidden />
              結束投影
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                document.documentElement.requestFullscreen?.().catch(() => {});
                router.push(`/wall/${wall.id}?present=1`);
              }}
            >
              <Play className="size-4" aria-hidden />
              投影
            </Button>
          )}
        </div>
      </header>

      {/* ===== 收集工具列（編輯模式）===== */}
      {!present && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2">
          <Button variant="surface" size="sm" onClick={addTextCard}>
            <Plus className="size-4" aria-hidden />
            新增卡片
          </Button>
          <Button variant="surface" size="sm" onClick={() => setBatchOpen(true)}>
            <ClipboardPaste className="size-4" aria-hidden />
            批次貼上
          </Button>
          <Button variant="surface" size="sm" onClick={() => csvRef.current?.click()}>
            <Upload className="size-4" aria-hidden />
            匯入 CSV
          </Button>
          <Button variant="surface" size="sm" onClick={() => imgRef.current?.click()}>
            <ImageIcon className="size-4" aria-hidden />
            加入圖片
          </Button>
          <div className="ml-auto flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <label className="flex min-w-0 flex-col gap-1.5 text-sm text-text-muted sm:flex-row sm:items-center sm:gap-2">
              投稿入口網址
              <input
                value={wall.submitUrl ?? ""}
                onChange={(e) => mutate(() => ({ submitUrl: e.target.value || undefined }))}
                placeholder="Google 表單／Padlet 連結"
                className="h-11 min-w-0 w-full rounded-sm border border-control bg-surface-raised px-3 text-base placeholder:text-text-muted sm:w-56 sm:text-sm"
              />
            </label>
            {wall.submitUrl && (
              <Button variant="ghost" size="sm" onClick={() => setQrOpen(true)}>
                <QrCode className="size-4" aria-hidden />
                QR
              </Button>
            )}
          </div>
          <input ref={csvRef} type="file" accept=".csv,text/csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ""; }} />
          <input ref={imgRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importImage(f); e.target.value = ""; }} />
        </div>
      )}

      {/* ===== 卡片牆 ===== */}
      <main className="flex-1 px-4 py-6 md:px-8">
        {visibleCards.length === 0 ? (
          <EmptyState
            icon={<LayoutGrid />}
            title={present ? "這面牆還是空的" : "開始收集成果"}
            hint={present ? undefined : "新增卡片、批次貼上文字（每行一張，支援「姓名：內容」），或匯入 Google 表單的 CSV。"}
          />
        ) : (
          <div className={layoutClass}>
            {visibleCards.map((c, i) => (
              <WallCardView
                key={c.id}
                card={c}
                index={i}
                present={present}
                onStar={() => patchCard(c.id, { starred: !c.starred })}
                onHide={() => patchCard(c.id, { hidden: !c.hidden })}
                onDelete={() => {
                  if (confirm("刪除這張卡片？"))
                    mutate((w) => ({ cards: w.cards.filter((x) => x.id !== c.id) }));
                }}
                onFocus={() => setFocusIndex(i)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ===== 聚光揭示 ===== */}
      {focused && (
        <Dialog title="聚光檢視" onClose={() => setFocusIndex(null)} maxWidth="max-w-3xl" panelClassName="bg-white p-6 text-[#1c1c1c] md:p-10" scrimClassName="bg-black/80">
          <div className="flex flex-col gap-4">
            {focused.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={focused.content} alt={focused.author ? `${focused.author} 的作品` : "作品"} className="w-full rounded-lg" />
            ) : (
              <blockquote className="whitespace-pre-wrap text-3xl leading-relaxed text-[#1c1c1c] md:text-4xl">
                {focused.content}
              </blockquote>
            )}
            {focused.author && (
              <p className="text-xl font-medium text-[#5f5f5d]">— {focused.author}</p>
            )}
          </div>
          <div className="mt-6 flex items-center justify-center gap-3">
            <IconButton label="上一張" disabled={focusIndex === 0}
              onClick={() => setFocusIndex((i) => Math.max(0, (i ?? 0) - 1))}>
              <ChevronLeft className="size-5" />
            </IconButton>
            <span className="rounded-full bg-white/90 px-3 py-1 text-sm tabular-nums text-[#1c1c1c]">
              {(focusIndex ?? 0) + 1} / {visibleCards.length}
            </span>
            <IconButton label="下一張" disabled={(focusIndex ?? 0) >= visibleCards.length - 1}
              onClick={() => setFocusIndex((i) => Math.min(visibleCards.length - 1, (i ?? 0) + 1))}>
              <ChevronRight className="size-5" />
            </IconButton>
            <IconButton label="關閉聚光" onClick={() => setFocusIndex(null)}>
              <X className="size-5" />
            </IconButton>
          </div>
        </Dialog>
      )}

      {/* ===== 批次貼上對話框 ===== */}
      {batchOpen && (
        <Dialog title="批次貼上" description="每行建立一張卡片；輸入「姓名：內容」會自動拆出作者。" onClose={() => setBatchOpen(false)} maxWidth="max-w-lg">
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => { e.preventDefault(); importBatch(); }}
          >
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              學生成果文字
              <textarea
                autoFocus
                rows={10}
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder={"小明：我覺得主角很勇敢\n小華：結局出乎意料\n沒有署名的想法也可以"}
                className="rounded-sm border border-control bg-surface px-3 py-2 text-base leading-relaxed placeholder:text-text-muted sm:text-sm"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setBatchOpen(false)}>取消</Button>
              <Button variant="primary" type="submit" disabled={!batchText.trim()}>加入卡片</Button>
            </div>
          </form>
        </Dialog>
      )}

      {cardOpen && (
        <Dialog title="新增成果卡片" description="內容為必填；作者可留空，適合匿名回饋。" onClose={() => setCardOpen(false)} maxWidth="max-w-lg">
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); submitTextCard(); }}>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              卡片內容 <span className="text-danger">*</span>
              <textarea
                autoFocus
                required
                rows={5}
                value={cardContent}
                onChange={(e) => setCardContent(e.target.value)}
                placeholder="輸入學生的答案、作品說明或想法"
                className="rounded-sm border border-control bg-surface px-3 py-2 text-base leading-relaxed placeholder:text-text-muted"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              作者（可留空）
              <input
                value={cardAuthor}
                onChange={(e) => setCardAuthor(e.target.value)}
                placeholder="姓名或組別"
                className="h-11 rounded-sm border border-control bg-surface px-3 text-base placeholder:text-text-muted"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setCardOpen(false)}>取消</Button>
              <Button variant="primary" type="submit" disabled={!cardContent.trim()}>加入卡片</Button>
            </div>
          </form>
        </Dialog>
      )}

      {qrOpen && wall.submitUrl && (
        <QrDialog url={wall.submitUrl} onClose={() => setQrOpen(false)} />
      )}
    </div>
  );
}

export function WallEditor() {
  return (
    <Suspense>
      <WallEditorInner />
    </Suspense>
  );
}
