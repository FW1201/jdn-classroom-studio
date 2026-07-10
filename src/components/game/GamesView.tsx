"use client";

/* ============================================================
   互動視覺化（模式二）— 清單 + 建檔 + AI 指令模板庫
   貼上 AI 生成的完整 HTML（或 iframe 嵌入碼）→ 沙箱執行
   模板庫：SDD 結構 prompt → 複製到 AI → 貼回結果
   ============================================================ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  Gamepad2,
  Plus,
  Trash2,
  Play,
  Pencil,
  ShieldCheck,
  Copy,
  Check,
  Sparkles,
  ClipboardPaste,
} from "lucide-react";
import { Card, EmptyState, Tag } from "@/components/ui/Card";
import { Button, IconButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useCollection, useHydrated } from "@/lib/hooks";
import { createItem, deleteItem, updateItem, StorageQuotaError } from "@/lib/storage";
import type { Game } from "@/lib/types";
import { Dialog } from "@/components/ui/Dialog";
import {
  TEMPLATE_CATEGORIES,
  buildPrompt,
  promptTemplates,
  type PromptTemplate,
  type TemplateCategory,
} from "@/data/promptTemplates";

/* ---------- 建檔 / 編輯對話框 ---------- */

function GameDialog({
  game,
  presetTitle,
  presetTags,
  onClose,
}: {
  game?: Game;
  presetTitle?: string;
  presetTags?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(game?.title ?? presetTitle ?? "");
  const [html, setHtml] = useState(game?.html ?? "");
  const [tags, setTags] = useState(game?.tags?.join("、") ?? presetTags ?? "");

  function save() {
    const t = title.trim() || "未命名視覺化";
    const tagList = tags.split(/[;；、,\s]+/).filter(Boolean);
    try {
      if (game) {
        updateItem("games", game.id, { title: t, html, tags: tagList });
        onClose();
      } else {
        const g = createItem("games", { title: t, html, tags: tagList });
        onClose();
        router.push(`/game/${g.id}`);
      }
    } catch (e) {
      if (e instanceof StorageQuotaError) alert(e.message);
      else throw e;
    }
  }

  return (
    <Dialog
      title={game ? "編輯互動視覺化" : "新增互動視覺化"}
      description="貼上完整 HTML 後，程式會在隔離沙箱中執行。建議先用一題小範例確認按鈕與字級適合投影。"
      onClose={onClose}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => { e.preventDefault(); save(); }}
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          名稱
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：分數大挑戰"
            className="h-11 rounded-sm border border-control bg-surface px-3 text-base placeholder:text-text-muted"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          HTML 程式碼
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            rows={12}
            placeholder={"貼上 AI 生成的完整 HTML（<!DOCTYPE html>…），或外部 <iframe> 嵌入碼"}
            className="rounded-sm border border-control bg-surface px-3 py-2 font-mono text-base leading-relaxed placeholder:text-text-muted sm:text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          標籤（以頓號或空白分隔，可留空）
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="數學、五年級"
            className="h-11 rounded-sm border border-control bg-surface px-3 text-base placeholder:text-text-muted"
          />
        </label>
        <p className="flex items-start gap-2 rounded-md border border-control bg-surface p-3 text-sm leading-relaxed text-text-muted">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-game" aria-hidden />
          程式碼在隔離沙箱中執行：無法讀取本站資料（名單、黑板）或你的瀏覽器 cookie。
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>取消</Button>
          <Button variant="primary" type="submit" disabled={!html.trim()}>
            {game ? "儲存" : "建立並開啟"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/* ---------- AI 指令模板庫 ---------- */

function TemplateCard({
  template,
  onPasteResult,
}: {
  template: PromptTemplate;
  onPasteResult: (t: PromptTemplate) => void;
}) {
  const [copied, setCopied] = useState(false);

  function copyPrompt() {
    navigator.clipboard
      .writeText(buildPrompt(template))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => alert("複製失敗：請手動選取內容。"));
  }

  return (
    <Card className="flex flex-col gap-2.5 p-4 transition-colors hover:border-border-strong">
      <div className="flex items-center justify-between gap-2">
        <Tag color="var(--game)">{template.category}</Tag>
      </div>
      <h3 className="text-base font-bold">{template.title}</h3>
      <p className="text-sm leading-relaxed text-text-muted">{template.summary}</p>
      <p className="text-xs leading-relaxed text-text-faint">{template.goal}</p>
      <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
        <Button variant={copied ? "primary" : "surface"} size="sm" onClick={copyPrompt}>
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? "已複製" : "複製指令"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onPasteResult(template)}>
          <ClipboardPaste className="size-4" aria-hidden />
          貼上結果
        </Button>
      </div>
    </Card>
  );
}

function TemplateLibrary({
  onPasteResult,
}: {
  onPasteResult: (t: PromptTemplate) => void;
}) {
  const [category, setCategory] = useState<TemplateCategory | "全部">("全部");
  const filtered =
    category === "全部"
      ? promptTemplates
      : promptTemplates.filter((t) => t.category === category);

  return (
    <section aria-labelledby="template-lib-title" className="mt-12 border-t border-border pt-8">
      <div className="mb-1 flex items-center gap-2">
        <Sparkles className="size-5 text-game" aria-hidden />
        <h2 id="template-lib-title" className="text-2xl font-bold">AI 指令模板庫</h2>
      </div>
      <p className="mb-5 max-w-2xl text-sm leading-relaxed text-text-muted">
        挑一個模板「複製指令」→ 貼到 Claude / ChatGPT / Gemini → 把生成的 HTML 用「貼上結果」建檔，立刻在課堂執行。
        每個模板都以「目標／規格／限制／驗收」結構撰寫，可自行修改內容再送出。
      </p>
      {/* 分類篩選 */}
      <div role="radiogroup" aria-label="模板分類" className="mb-5 flex flex-wrap gap-2">
        {(["全部", ...TEMPLATE_CATEGORIES] as const).map((c) => (
          <button
            key={c}
            role="radio"
            aria-checked={category === c}
            onClick={() => setCategory(c)}
            className={`h-10 cursor-pointer rounded-full border px-4 text-sm font-medium transition-colors ${
              category === c
                ? "border-border-strong bg-text text-on-dark [box-shadow:var(--shadow-inset)]"
                : "border-control bg-surface-raised text-text hover:bg-hover"
            }`}
          >
            {c}
            <span className="ml-1.5 text-xs opacity-60">
              {c === "全部"
                ? promptTemplates.length
                : promptTemplates.filter((t) => t.category === c).length}
            </span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => (
          <TemplateCard key={t.id} template={t} onPasteResult={onPasteResult} />
        ))}
      </div>
    </section>
  );
}

/* ---------- 清單 ---------- */

type DialogState =
  | { kind: "new"; presetTitle?: string; presetTags?: string }
  | { kind: "edit"; game: Game }
  | null;

function GamesList() {
  const games = useCollection("games");
  const hydrated = useHydrated();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dialog, setDialog] = useState<DialogState>(() =>
    searchParams.get("new") === "1" ? { kind: "new" } : null
  );

  function openFromTemplate(t: PromptTemplate) {
    setDialog({ kind: "new", presetTitle: t.title, presetTags: t.category });
  }

  return (
    <>
      <PageHeader
        title="互動視覺化"
        desc="貼上 AI 生成的 HTML 互動內容，沙箱安全執行、全螢幕投影。"
        actions={
          <Button variant="primary" onClick={() => setDialog({ kind: "new" })}>
            <Plus className="size-4.5" aria-hidden />
            新增視覺化
          </Button>
        }
      />
      {hydrated && games.length === 0 ? (
        <EmptyState
          icon={<Gamepad2 />}
          title="還沒有任何互動視覺化"
          hint="從下方模板庫挑一個指令，讓 Claude / ChatGPT / Gemini 生成 HTML，貼進來立刻就能在課堂執行。"
          action={
            <Button variant="primary" onClick={() => setDialog({ kind: "new" })}>
              <Plus className="size-4.5" aria-hidden />
              新增視覺化
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((g) => (
            <Card key={g.id} className="group relative flex flex-col gap-3 p-5 transition-colors hover:border-border-strong">
              <div className="flex items-start justify-between">
                <span className="flex size-11 items-center justify-center rounded-lg border border-border bg-surface-raised text-game" aria-hidden>
                  <Gamepad2 className="size-5.5" />
                </span>
                <span className="text-xs tabular-nums text-text-muted">
                  {(g.html.length / 1024).toFixed(0)} KB
                </span>
              </div>
              <h2 className="text-lg font-bold">
                <Link href={`/game/${g.id}`} className="after:absolute after:inset-0">
                  {g.title}
                </Link>
              </h2>
              {g.tags && g.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {g.tags.map((t) => (
                    <Tag key={t} color="var(--game)">{t}</Tag>
                  ))}
                </div>
              )}
              <div className="relative z-10 mt-auto flex gap-1.5">
                <IconButton label="執行" onClick={() => router.push(`/game/${g.id}`)}>
                  <Play className="size-4" />
                </IconButton>
                <IconButton label="編輯" onClick={() => setDialog({ kind: "edit", game: g })}>
                  <Pencil className="size-4" />
                </IconButton>
                <IconButton
                  label="刪除"
                  onClick={() => {
                    if (confirm(`確定刪除「${g.title}」？此動作無法復原。`))
                      deleteItem("games", g.id);
                  }}
                >
                  <Trash2 className="size-4 text-danger" />
                </IconButton>
              </div>
            </Card>
          ))}
        </div>
      )}

      <TemplateLibrary onPasteResult={openFromTemplate} />

      {dialog && (
        <GameDialog
          game={dialog.kind === "edit" ? dialog.game : undefined}
          presetTitle={dialog.kind === "new" ? dialog.presetTitle : undefined}
          presetTags={dialog.kind === "new" ? dialog.presetTags : undefined}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}

export function GamesView() {
  return (
    <Suspense>
      <GamesList />
    </Suspense>
  );
}
