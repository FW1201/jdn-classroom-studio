"use client";

/* ============================================================
   BoardEditor — 教學黑板（模式一）
   - CanvasStage：平移/縮放的自由畫布（transform: translate+scale）
   - Widget：react-rnd 拖拉縮放；text/sticky/image/video/link/qr/embed
   - AnnotationLayer：perfect-freehand 手寫 + 橡皮擦
   - Spotlight：聚光燈遮罩
   - 多頁 + 投影模式（?present=1）
   ============================================================ */

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Rnd } from "react-rnd";
import { useGesture } from "@use-gesture/react";
import { getStroke } from "perfect-freehand";
import { nanoid } from "nanoid";
import {
  MousePointer2,
  Pen,
  Eraser,
  Flashlight,
  Type,
  StickyNote,
  Image as ImageIcon,
  Video,
  Link2,
  QrCode,
  Code2,
  Trash2,
  Lock,
  Unlock,
  ArrowUpToLine,
  ArrowDownToLine,
  Plus,
  Copy,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Home,
  Play,
  X,
  ZoomIn,
  ZoomOut,
  AArrowUp,
  AArrowDown,
  Users,
  FileUp,
  Timer as TimerIcon,
  PaintBucket,
  GalleryHorizontal,
  Infinity as InfinityIcon,
} from "lucide-react";
import type { BoardPage, Stroke, Widget, WidgetType } from "@/lib/types";
import { useItem } from "@/lib/hooks";
import { getItem, updateItem, StorageQuotaError } from "@/lib/storage";
import type { MaterialPage } from "@/lib/materials";
import { MaterialImportDialog } from "./MaterialImportDialog";
import { TimerPanel } from "./TimerPanel";
import { BgColorPopover } from "./BgColorPopover";
import { FontPicker } from "./FontPicker";
import { ExportToDriveButton } from "@/components/google/ExportToDrive";
import { exportHtmlAsSlides } from "@/lib/google/drive";
import { boardToHtml } from "@/lib/google/exporters";
import { IconButton, Button } from "@/components/ui/Button";
import { WidgetContent, createWidget, nextZ, syncZCounter } from "./widgets";
import { Dialog } from "@/components/ui/Dialog";
import { RosterPanel } from "./RosterPanel";

/* ---------- 筆跡 → SVG path ---------- */

function strokePath(stroke: Stroke): string {
  const outline = getStroke(stroke.points, {
    size: stroke.size,
    thinning: 0.55,
    smoothing: 0.6,
    streamline: 0.5,
  });
  if (!outline.length) return "";
  const d = outline.reduce(
    (acc, [x, y], i, arr) => {
      const [nx, ny] = arr[(i + 1) % arr.length];
      return `${acc} ${x.toFixed(1)},${y.toFixed(1)} ${((x + nx) / 2).toFixed(1)},${((y + ny) / 2).toFixed(1)}`;
    },
    `M ${outline[0][0].toFixed(1)},${outline[0][1].toFixed(1)} Q`
  );
  return `${d} Z`;
}

const PEN_COLORS = ["#1c1c1c", "#f4f1ea", "#c0392b", "#2f6f6a", "#d99a2b", "#6d5bd0"];

type Tool = "select" | "pen" | "erase" | "spotlight";

/* ---------- 小型輸入對話框（取代 window.prompt，含可見 label）---------- */

function InputDialog({
  title,
  fields,
  multiline,
  onSubmit,
  onClose,
}: {
  title: string;
  fields: { key: string; label: string; placeholder?: string }[];
  multiline?: string; // 哪個 key 用 textarea
  onSubmit: (values: Record<string, string>) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  return (
    <Dialog title={title} onClose={onClose} maxWidth="max-w-lg">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(values);
          onClose();
        }}
      >
        {fields.map((f, index) => (
          <label key={f.key} className="flex flex-col gap-1.5 text-sm font-medium">
            <span>{f.label}{index === 0 && <span className="text-danger"> *</span>}</span>
            {multiline === f.key ? (
              <textarea
                autoFocus={fields[0].key === f.key}
                required={index === 0}
                aria-required={index === 0}
                rows={8}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="rounded-sm border border-control bg-surface px-3 py-2 font-mono text-base leading-relaxed placeholder:text-text-muted sm:text-sm"
              />
            ) : (
              <input
                autoFocus={fields[0].key === f.key}
                required={index === 0}
                aria-required={index === 0}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="h-11 rounded-sm border border-control bg-surface px-3 text-base placeholder:text-text-muted"
              />
            )}
          </label>
        ))}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>取消</Button>
          <Button variant="primary" type="submit">建立</Button>
        </div>
      </form>
    </Dialog>
  );
}

/* ---------- 主編輯器 ---------- */

export function BoardEditor({ boardId }: { boardId: string }) {
  const board = useItem("boards", boardId);
  const router = useRouter();
  const searchParams = useSearchParams();
  const present = searchParams.get("present") === "1";

  const [pageIndex, setPageIndex] = useState(0);
  const [tool, setTool] = useState<Tool>("select");
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [penSize, setPenSize] = useState(6);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [dialog, setDialog] = useState<WidgetType | null>(null);
  const [spot, setSpot] = useState({ x: 0.5, y: 0.5 });
  const [rosterOpen, setRosterOpen] = useState(false);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [bgOpen, setBgOpen] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drawing = useRef<Stroke | null>(null);
  const [liveStroke, setLiveStroke] = useState<Stroke | null>(null);

  const page: BoardPage | undefined = board?.pages[pageIndex];

  /* ----- 逐頁顯示模式：頁面等比縮放置中（無平移/縮放手勢）----- */
  const paged = (board?.displayMode ?? "canvas") === "paged";
  const isMaterialPage = !!page?.background?.startsWith("data:");
  const pageDim = page?.bgSize ?? { w: 1280, h: 720 };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setContainerSize({ w: el.clientWidth, h: el.clientHeight })
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitScale =
    containerSize.w > 0
      ? Math.min(containerSize.w / pageDim.w, containerSize.h / pageDim.h) * 0.96
      : 1;
  const fitView = {
    scale: fitScale,
    x: (containerSize.w - pageDim.w * fitScale) / 2,
    y: (containerSize.h - pageDim.h * fitScale) / 2,
  };
  const effView = paged ? fitView : view;

  useEffect(() => {
    if (board) syncZCounter(board.pages.flatMap((p) => p.widgets));
  }, [board]);

  /* ----- 寫回 storage（每次讀取最新狀態，避免快速連續操作的 stale closure）----- */
  const mutatePage = useCallback(
    (fn: (p: BoardPage) => Partial<BoardPage>) => {
      const fresh = getItem("boards", boardId);
      const freshPage = fresh?.pages[pageIndex];
      if (!fresh || !freshPage) return;
      const pages = fresh.pages.map((p, i) =>
        i === pageIndex ? { ...p, ...fn(freshPage) } : p
      );
      updateItem("boards", boardId, { pages });
    },
    [boardId, pageIndex]
  );

  const patchWidget = useCallback(
    (wid: string, patch: Partial<Widget>) => {
      mutatePage((p) => ({
        widgets: p.widgets.map((w) => (w.id === wid ? { ...w, ...patch } : w)),
      }));
    },
    [mutatePage]
  );

  /* ----- 畫布座標轉換（canvas 用自由視角；paged 用 fit 視角）----- */
  const toStage = useCallback(
    (clientX: number, clientY: number): [number, number] => {
      const rect = containerRef.current!.getBoundingClientRect();
      return [
        (clientX - rect.left - effView.x) / effView.scale,
        (clientY - rect.top - effView.y) / effView.scale,
      ];
    },
    [effView.x, effView.y, effView.scale]
  );

  /* ----- 平移 / 縮放手勢 ----- */
  useGesture(
    {
      onDrag: ({ delta: [dx, dy], event, pinching }) => {
        if (pinching || tool !== "select") return;
        const target = event.target as HTMLElement;
        if (target.closest("[data-widget]") || target.closest("[data-ui]")) return;
        setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
      },
      onWheel: ({ event, delta: [, dy] }) => {
        if (!event.ctrlKey && !event.metaKey) {
          setView((v) => ({ ...v, y: v.y - dy }));
          return;
        }
        event.preventDefault();
        const [cx, cy] = toStage(event.clientX, event.clientY);
        setView((v) => {
          const scale = Math.min(3, Math.max(0.2, v.scale * (1 - dy * 0.002)));
          const rect = containerRef.current!.getBoundingClientRect();
          return {
            scale,
            x: event.clientX - rect.left - cx * scale,
            y: event.clientY - rect.top - cy * scale,
          };
        });
      },
      onPinch: ({ offset: [s] }) => {
        setView((v) => ({ ...v, scale: Math.min(3, Math.max(0.2, s)) }));
      },
    },
    {
      target: containerRef,
      enabled: !paged, // 逐頁模式固定視角，停用平移/縮放手勢
      drag: { pointer: { buttons: [1] } },
      wheel: { eventOptions: { passive: false } },
      pinch: { scaleBounds: { min: 0.2, max: 3 } },
    }
  );

  /* ----- 手寫 / 橡皮擦 ----- */
  function handleDrawStart(e: React.PointerEvent) {
    if (tool === "pen") {
      const [x, y] = toStage(e.clientX, e.clientY);
      drawing.current = { id: nanoid(8), points: [[x, y]], color: penColor, size: penSize };
      setLiveStroke(drawing.current);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else if (tool === "erase") {
      eraseAt(e.clientX, e.clientY);
    }
  }
  function handleDrawMove(e: React.PointerEvent) {
    if (tool === "pen" && drawing.current) {
      const [x, y] = toStage(e.clientX, e.clientY);
      drawing.current = {
        ...drawing.current,
        points: [...drawing.current.points, [x, y]],
      };
      setLiveStroke(drawing.current);
    } else if (tool === "erase" && e.buttons === 1) {
      eraseAt(e.clientX, e.clientY);
    }
  }
  function handleDrawEnd() {
    if (tool === "pen" && drawing.current) {
      const stroke = drawing.current;
      mutatePage((p) => ({ strokes: [...p.strokes, stroke] }));
      drawing.current = null;
      setLiveStroke(null);
    }
  }
  function eraseAt(clientX: number, clientY: number) {
    const [x, y] = toStage(clientX, clientY);
    const r = 24 / effView.scale;
    mutatePage((p) => ({
      strokes: p.strokes.filter(
        (s) => !s.points.some(([px, py]) => Math.hypot(px - x, py - y) < r)
      ),
    }));
  }

  /* ----- 新增 widget ----- */
  function stageCenter(): { x: number; y: number } {
    const rect = containerRef.current!.getBoundingClientRect();
    const [x, y] = toStage(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return { x, y };
  }
  function addWidget(type: WidgetType, props?: Record<string, unknown>) {
    const w = createWidget(type, stageCenter(), props);
    mutatePage((p) => ({ widgets: [...p.widgets, w] }));
    setSelectedId(w.id);
    setTool("select");
  }

  function handleImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => addWidget("image", { src: String(reader.result), alt: file.name });
    reader.readAsDataURL(file);
  }

  /* ----- 頁面操作 ----- */
  function addPage(duplicate = false) {
    if (!board || !page) return;
    const newPage: BoardPage = duplicate
      ? {
          ...structuredClone(page),
          id: nanoid(8),
          widgets: page.widgets.map((w) => ({ ...w, id: nanoid(8) })),
          strokes: page.strokes.map((s) => ({ ...s, id: nanoid(8) })),
        }
      : { id: nanoid(8), widgets: [], strokes: [] };
    const pages = [...board.pages];
    pages.splice(pageIndex + 1, 0, newPage);
    updateItem("boards", board.id, { pages });
    setPageIndex(pageIndex + 1);
  }
  function removePage() {
    if (!board || board.pages.length <= 1) return;
    if (!confirm(`刪除第 ${pageIndex + 1} 頁？此動作無法復原。`)) return;
    const pages = board.pages.filter((_, i) => i !== pageIndex);
    updateItem("boards", board.id, { pages });
    setPageIndex(Math.max(0, pageIndex - 1));
  }

  /* ----- 教材匯入：勾選頁 → 新增黑板頁（dataURL 背景）→ 切換逐頁模式 ----- */
  function importMaterial(materialPages: MaterialPage[]) {
    const fresh = getItem("boards", boardId);
    if (!fresh) return;
    const newPages: BoardPage[] = materialPages.map((pg) => ({
      id: nanoid(8),
      background: pg.dataUrl,
      bgSize: { w: pg.w, h: pg.h },
      widgets: [],
      strokes: [],
    }));
    try {
      updateItem("boards", boardId, {
        pages: [...fresh.pages, ...newPages],
        displayMode: "paged",
      });
    } catch (e) {
      if (e instanceof StorageQuotaError) {
        alert(e.message + "\n可回上一步減少勾選頁數。");
        return;
      }
      throw e;
    }
    setMaterialOpen(false);
    setPageIndex(fresh.pages.length); // 跳到第一張匯入頁
  }

  /* ----- 背景顏色 ----- */
  function applyBgAll(color: string) {
    const fresh = getItem("boards", boardId);
    if (!fresh) return;
    updateItem("boards", boardId, {
      pages: fresh.pages.map((p) =>
        p.background?.startsWith("data:") ? p : { ...p, background: color || undefined }
      ),
    });
  }

  /* ----- 聚光燈 ----- */
  function handleSpotMove(e: React.PointerEvent) {
    const rect = containerRef.current!.getBoundingClientRect();
    setSpot({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }

  if (!board) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <p className="text-lg text-text-muted">找不到這塊黑板（可能已被刪除）</p>
        <Button variant="primary" onClick={() => router.push("/boards")}>回黑板列表</Button>
      </div>
    );
  }

  const selected = page?.widgets.find((w) => w.id === selectedId);
  const drawingMode = tool === "pen" || tool === "erase";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      {/* ===== 頂欄 ===== */}
      <header data-ui className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/boards" aria-label="回黑板列表" className="flex size-11 items-center justify-center rounded-md hover:bg-hover">
            <Home className="size-5" />
          </Link>
          {present ? (
            <span className="truncate text-lg font-bold">{board.title}</span>
          ) : (
            <input
              value={board.title}
              onChange={(e) => updateItem("boards", board.id, { title: e.target.value })}
              aria-label="黑板標題"
              className="h-11 w-44 rounded-md bg-transparent px-2 text-lg font-bold hover:bg-hover focus:bg-surface-raised sm:w-48 md:w-72"
            />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <IconButton label="縮小" onClick={() => setView((v) => ({ ...v, scale: Math.max(0.2, v.scale / 1.2) }))}>
            <ZoomOut className="size-4.5" />
          </IconButton>
          <span className="w-12 text-center text-sm tabular-nums text-text-muted">
            {Math.round(view.scale * 100)}%
          </span>
          <IconButton label="放大" onClick={() => setView((v) => ({ ...v, scale: Math.min(3, v.scale * 1.2) }))}>
            <ZoomIn className="size-4.5" />
          </IconButton>
          <IconButton label="重設檢視" onClick={() => setView({ x: 0, y: 0, scale: 1 })}>
            <Maximize className="size-4.5" />
          </IconButton>
          {present ? (
            <Button variant="ghost" size="sm" onClick={() => router.push(`/board/${board.id}`)}>
              <X className="size-4" aria-hidden />
              結束投影
            </Button>
          ) : (
            <>
              <ExportToDriveButton
                label="匯出簡報"
                makeExport={() => exportHtmlAsSlides(board.title, boardToHtml(board))}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  document.documentElement.requestFullscreen?.().catch(() => {});
                  router.push(`/board/${board.id}?present=1`);
                }}
              >
                <Play className="size-4" aria-hidden />
                投影
              </Button>
            </>
          )}
        </div>
      </header>

      {/* ===== 畫布 ===== */}
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 touch-none overflow-hidden"
        style={{
          cursor:
            tool === "pen" ? "crosshair" : tool === "erase" ? "cell" : tool === "spotlight" ? "none" : paged ? "default" : "grab",
          background:
            !paged && page?.background && !page.background.startsWith("data:")
              ? page.background
              : paged
                ? "var(--tint)"
                : "radial-gradient(circle, var(--border) 1px, transparent 1px) 0 0 / 28px 28px",
        }}
        onPointerDown={(e) => {
          if (tool === "select" && e.target === e.currentTarget) setSelectedId(null);
        }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${effView.x}px, ${effView.y}px) scale(${effView.scale})` }}
        >
          {/* 逐頁模式：頁面底（教材圖或色紙） */}
          {paged && (
            <div
              aria-hidden
              className="absolute left-0 top-0 overflow-hidden rounded-sm [box-shadow:var(--shadow-raised)]"
              style={{
                width: pageDim.w,
                height: pageDim.h,
                background:
                  page?.background && !page.background.startsWith("data:")
                    ? page.background
                    : "#ffffff",
              }}
            >
              {isMaterialPage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={page!.background!} alt="" width={pageDim.w} height={pageDim.h} draggable={false} />
              )}
            </div>
          )}
          {/* Widgets */}
          {page?.widgets
            .slice()
            .sort((a, b) => a.z - b.z)
            .map((w) => (
              <Rnd
                key={w.id}
                data-widget
                size={{ width: w.w, height: w.h }}
                position={{ x: w.x, y: w.y }}
                scale={view.scale}
                style={{ zIndex: w.z }}
                disableDragging={present || w.locked || drawingMode}
                enableResizing={!present && !w.locked && !drawingMode && selectedId === w.id}
                onDragStop={(_, d) => patchWidget(w.id, { x: d.x, y: d.y })}
                onResizeStop={(_, __, ref, ___, pos) =>
                  patchWidget(w.id, {
                    w: ref.offsetWidth,
                    h: ref.offsetHeight,
                    x: pos.x,
                    y: pos.y,
                  })
                }
                onPointerDown={() => { if (!present && !drawingMode) setSelectedId(w.id); }}
                onFocus={() => { if (!present && !drawingMode) setSelectedId(w.id); }}
                tabIndex={present ? -1 : 0}
                role="group"
                aria-label={`${w.type === "text" ? "文字" : w.type === "sticky" ? "便利貼" : w.type === "image" ? "圖片" : w.type === "video" ? "影片" : w.type === "link" ? "超連結" : w.type === "qr" ? "QR 碼" : "嵌入內容"}物件。方向鍵移動，Alt 加方向鍵調整大小。`}
                onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
                  const target = event.target as HTMLElement;
                  if (target.matches("input, textarea, select, button, a")) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedId(w.id);
                    return;
                  }
                  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
                  event.preventDefault();
                  const step = event.shiftKey ? 10 : 2;
                  const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
                  const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
                  if (event.altKey) {
                    patchWidget(w.id, { w: Math.max(80, w.w + dx), h: Math.max(56, w.h + dy) });
                  } else {
                    patchWidget(w.id, { x: w.x + dx, y: w.y + dy });
                  }
                }}
                className={`group ${selectedId === w.id && !present ? "outline-2 outline-dashed outline-border-strong" : ""}`}
              >
                <div className="size-full rounded-md border border-border bg-surface-raised/90">
                  <WidgetContent
                    widget={w}
                    editing={!present && selectedId === w.id}
                    onPropsChange={(patch) => patchWidget(w.id, { props: { ...w.props, ...patch } })}
                  />
                </div>
              </Rnd>
            ))}

          {/* 筆跡層 */}
          <svg
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 overflow-visible"
            width={1}
            height={1}
            style={{ zIndex: 9000 }}
          >
            {page?.strokes.map((s) => (
              <path key={s.id} d={strokePath(s)} fill={s.color} />
            ))}
            {liveStroke && <path d={strokePath(liveStroke)} fill={liveStroke.color} />}
          </svg>
        </div>

        {/* 手寫捕捉層 */}
        {drawingMode && (
          <div
            className="absolute inset-0"
            style={{ zIndex: 9100 }}
            onPointerDown={handleDrawStart}
            onPointerMove={handleDrawMove}
            onPointerUp={handleDrawEnd}
            onPointerLeave={handleDrawEnd}
          />
        )}

        {/* 聚光燈 */}
        {tool === "spotlight" && (
          <div
            className="absolute inset-0"
            style={{
              zIndex: 9200,
              cursor: "none",
              background: `radial-gradient(circle 160px at ${spot.x * 100}% ${spot.y * 100}%, transparent 0, transparent 150px, rgba(0,0,0,0.78) 200px)`,
            }}
            onPointerMove={handleSpotMove}
            onDoubleClick={() => setTool("select")}
          />
        )}
      </div>

      {/* ===== 選取物件工具列 ===== */}
      {selected && !present && (
        <div
          data-ui
          className="absolute left-1/2 top-16 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-surface-raised px-2 py-1 shadow-[var(--shadow-focus)]"
          role="toolbar"
          aria-label="物件操作"
        >
          {selected.type === "text" && (
            <>
              <IconButton label="放大字級" onClick={() => patchWidget(selected.id, { props: { ...selected.props, fontSize: Math.min(200, (Number(selected.props.fontSize) || 40) + 6) } })}>
                <AArrowUp className="size-4" />
              </IconButton>
              <IconButton label="縮小字級" onClick={() => patchWidget(selected.id, { props: { ...selected.props, fontSize: Math.max(14, (Number(selected.props.fontSize) || 40) - 6) } })}>
                <AArrowDown className="size-4" />
              </IconButton>
            </>
          )}
          <IconButton label="移到最上層" onClick={() => patchWidget(selected.id, { z: nextZ() })}>
            <ArrowUpToLine className="size-4" />
          </IconButton>
          <IconButton label="移到最下層" onClick={() => {
            if (!page) return;
            const minZ = Math.min(...page.widgets.map((x) => x.z));
            patchWidget(selected.id, { z: minZ - 1 });
          }}>
            <ArrowDownToLine className="size-4" />
          </IconButton>
          <IconButton label={selected.locked ? "解除鎖定" : "鎖定位置"} onClick={() => patchWidget(selected.id, { locked: !selected.locked })}>
            {selected.locked ? <Unlock className="size-4" /> : <Lock className="size-4" />}
          </IconButton>
          <IconButton label="刪除物件" onClick={() => {
            mutatePage((p) => ({ widgets: p.widgets.filter((x) => x.id !== selected.id) }));
            setSelectedId(null);
          }}>
            <Trash2 className="size-4 text-danger" />
          </IconButton>
        </div>
      )}

      {/* ===== 底部工具列 ===== */}
      <footer data-ui className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-surface px-3 py-2">
        {/* 工具 */}
        <div className="flex items-center gap-1.5" role="toolbar" aria-label="畫布工具">
          <IconButton label="選取／平移" active={tool === "select"} onClick={() => setTool("select")}>
            <MousePointer2 className="size-4.5" />
          </IconButton>
          <IconButton label="手寫筆" active={tool === "pen"} onClick={() => setTool("pen")}>
            <Pen className="size-4.5" />
          </IconButton>
          <IconButton label="橡皮擦" active={tool === "erase"} onClick={() => setTool("erase")}>
            <Eraser className="size-4.5" />
          </IconButton>
          <IconButton label="聚光燈" active={tool === "spotlight"} onClick={() => setTool(tool === "spotlight" ? "select" : "spotlight")}>
            <Flashlight className="size-4.5" />
          </IconButton>
          <IconButton label="班級名單" active={rosterOpen} onClick={() => setRosterOpen((v) => !v)}>
            <Users className="size-4.5" />
          </IconButton>
          {tool === "pen" && (
            <div className="ml-1 flex items-center gap-1.5" data-ui>
              {PEN_COLORS.map((c) => (
                <button
                  key={c}
                  aria-label={`筆色 ${c}`}
                  aria-pressed={penColor === c}
                  onClick={() => setPenColor(c)}
                  className={`size-11 cursor-pointer rounded-full border-4 transition-transform duration-200 active:scale-95 ${penColor === c ? "border-border-strong scale-105" : "border-bg"}`}
                  style={{ background: c }}
                />
              ))}
              <input
                type="range"
                min={2}
                max={24}
                value={penSize}
                onChange={(e) => setPenSize(Number(e.target.value))}
                aria-label="筆粗細"
                className="w-20 accent-[var(--text)]"
              />
            </div>
          )}
        </div>

        {/* 新增物件（投影中隱藏） */}
        {!present && (
          <div className="flex items-center gap-1.5" role="toolbar" aria-label="新增物件">
            <IconButton label="文字" onClick={() => addWidget("text")}>
              <Type className="size-4.5" />
            </IconButton>
            <IconButton label="便利貼" onClick={() => addWidget("sticky")}>
              <StickyNote className="size-4.5" />
            </IconButton>
            <IconButton label="圖片" onClick={() => fileRef.current?.click()}>
              <ImageIcon className="size-4.5" />
            </IconButton>
            <IconButton label="影片" onClick={() => setDialog("video")}>
              <Video className="size-4.5" />
            </IconButton>
            <IconButton label="超連結" onClick={() => setDialog("link")}>
              <Link2 className="size-4.5" />
            </IconButton>
            <IconButton label="QR 碼" onClick={() => setDialog("qr")}>
              <QrCode className="size-4.5" />
            </IconButton>
            <IconButton label="嵌入程式碼" onClick={() => setDialog("embed")}>
              <Code2 className="size-4.5" />
            </IconButton>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageFile(f);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {/* 頁面控制 */}
        <div className="flex items-center gap-1.5" role="toolbar" aria-label="頁面">
          <IconButton label="上一頁" disabled={pageIndex === 0} onClick={() => setPageIndex(pageIndex - 1)}>
            <ChevronLeft className="size-4.5" />
          </IconButton>
          <span className="min-w-14 text-center text-sm tabular-nums text-text-muted">
            {pageIndex + 1} / {board.pages.length}
          </span>
          <IconButton label="下一頁" disabled={pageIndex >= board.pages.length - 1} onClick={() => setPageIndex(pageIndex + 1)}>
            <ChevronRight className="size-4.5" />
          </IconButton>
          {!present && (
            <>
              <IconButton label="新增頁面" onClick={() => addPage(false)}>
                <Plus className="size-4.5" />
              </IconButton>
              <IconButton label="複製此頁" onClick={() => addPage(true)}>
                <Copy className="size-4.5" />
              </IconButton>
              <IconButton label="刪除此頁" disabled={board.pages.length <= 1} onClick={removePage}>
                <Trash2 className="size-4.5 text-danger" />
              </IconButton>
            </>
          )}
        </div>
      </footer>

      {/* ===== 名單側欄（名單 ↔ 黑板串接）===== */}
      {rosterOpen && <RosterPanel board={board} onClose={() => setRosterOpen(false)} />}

      {/* ===== 對話框 ===== */}
      {dialog === "video" && (
        <InputDialog
          title="加入影片"
          fields={[{ key: "url", label: "YouTube 網址", placeholder: "https://www.youtube.com/watch?v=…" }]}
          onSubmit={(v) => v.url && addWidget("video", { url: v.url })}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "link" && (
        <InputDialog
          title="加入超連結"
          fields={[
            { key: "url", label: "網址", placeholder: "https://…" },
            { key: "label", label: "顯示文字（可留空）" },
          ]}
          onSubmit={(v) => v.url && addWidget("link", { url: v.url, label: v.label })}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "qr" && (
        <InputDialog
          title="加入 QR 碼"
          fields={[
            { key: "url", label: "網址", placeholder: "https://…" },
            { key: "label", label: "標籤（可留空）" },
          ]}
          onSubmit={(v) => v.url && addWidget("qr", { url: v.url, label: v.label })}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "embed" && (
        <InputDialog
          title="嵌入程式碼（沙箱執行）"
          fields={[{ key: "html", label: "HTML / iframe 嵌入碼", placeholder: "<iframe …> 或完整 HTML" }]}
          multiline="html"
          onSubmit={(v) => v.html && addWidget("embed", { html: v.html })}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
