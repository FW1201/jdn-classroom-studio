"use client";

/* ============================================================
   互動遊戲（模式二）— 清單 + 建檔
   貼上 AI 生成的完整 HTML（或 iframe 嵌入碼）→ 沙箱執行
   ============================================================ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Gamepad2, Plus, Trash2, Play, Pencil, ShieldCheck } from "lucide-react";
import { Card, EmptyState, Tag } from "@/components/ui/Card";
import { Button, IconButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useCollection, useHydrated } from "@/lib/hooks";
import { createItem, deleteItem, updateItem, StorageQuotaError } from "@/lib/storage";
import type { Game } from "@/lib/types";
import { Dialog } from "@/components/ui/Dialog";

/* ---------- 建檔 / 編輯對話框 ---------- */

function GameDialog({
  game,
  onClose,
}: {
  game?: Game;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(game?.title ?? "");
  const [html, setHtml] = useState(game?.html ?? "");
  const [tags, setTags] = useState(game?.tags?.join("、") ?? "");

  function save() {
    const t = title.trim() || "未命名遊戲";
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
      title={game ? "編輯遊戲" : "新增遊戲"}
      description="貼上完整 HTML 後，程式會在隔離沙箱中執行。建議先用一題小範例確認按鈕與字級適合投影。"
      onClose={onClose}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => { e.preventDefault(); save(); }}
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          遊戲名稱
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
          遊戲在隔離沙箱中執行：程式碼無法讀取本站資料（名單、黑板）或你的瀏覽器 cookie。
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

/* ---------- 清單 ---------- */

function GamesList() {
  const games = useCollection("games");
  const hydrated = useHydrated();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dialog, setDialog] = useState<"new" | Game | null>(() =>
    searchParams.get("new") === "1" ? "new" : null
  );

  return (
    <>
      <PageHeader
        title="互動遊戲"
        desc="貼上 AI 生成的 HTML 遊戲，沙箱安全執行、全螢幕投影。"
        actions={
          <Button variant="primary" onClick={() => setDialog("new")}>
            <Plus className="size-4.5" aria-hidden />
            新增遊戲
          </Button>
        }
      />
      {hydrated && games.length === 0 ? (
        <EmptyState
          icon={<Gamepad2 />}
          title="還沒有任何遊戲"
          hint="用 Claude / ChatGPT / Gemini 生成一個 HTML 小遊戲，貼進來立刻就能在課堂執行。"
          action={
            <Button variant="primary" onClick={() => setDialog("new")}>
              <Plus className="size-4.5" aria-hidden />
              新增遊戲
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
                <IconButton label="執行遊戲" onClick={() => router.push(`/game/${g.id}`)}>
                  <Play className="size-4" />
                </IconButton>
                <IconButton label="編輯" onClick={() => setDialog(g)}>
                  <Pencil className="size-4" />
                </IconButton>
                <IconButton
                  label="刪除遊戲"
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
      {dialog && (
        <GameDialog
          game={dialog === "new" ? undefined : dialog}
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
