"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { Presentation, Plus, Trash2, Play, Layers } from "lucide-react";
import { Card, EmptyState } from "@/components/ui/Card";
import { Button, IconButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useCollection, useHydrated } from "@/lib/hooks";
import { createItem, deleteItem } from "@/lib/storage";

export function BoardsView() {
  const boards = useCollection("boards");
  const hydrated = useHydrated();
  const router = useRouter();

  function createBoard() {
    const b = createItem("boards", {
      title: `新黑板 ${boards.length + 1}`,
      pages: [{ id: nanoid(8), widgets: [], strokes: [] }],
    });
    router.push(`/board/${b.id}`);
  }

  return (
    <>
      <PageHeader
        title="教學黑板"
        desc="自由畫布：文字、圖片、影片、QR、嵌入內容，加上手寫與聚光燈。"
        actions={
          <Button variant="primary" onClick={createBoard}>
            <Plus className="size-4.5" aria-hidden />
            開新黑板
          </Button>
        }
      />
      {hydrated && boards.length === 0 ? (
        <EmptyState
          icon={<Presentation />}
          title="還沒有任何黑板"
          hint="開一塊新黑板，開始排你的課堂畫面。"
          action={
            <Button variant="primary" onClick={createBoard}>
              <Plus className="size-4.5" aria-hidden />
              開新黑板
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((b) => (
            <Card key={b.id} className="group relative flex flex-col gap-3 p-5 transition-colors hover:border-border-strong">
              <div className="flex items-start justify-between">
                <span className="flex size-11 items-center justify-center rounded-lg border border-border bg-surface-raised text-board" aria-hidden>
                  <Presentation className="size-5.5" />
                </span>
                <span className="flex items-center gap-1 text-sm tabular-nums text-text-muted">
                  <Layers className="size-4" aria-hidden />
                  {b.pages.length} 頁
                </span>
              </div>
              <h2 className="text-lg font-bold">
                <Link href={`/board/${b.id}`} className="after:absolute after:inset-0">
                  {b.title}
                </Link>
              </h2>
              <p className="text-xs text-text-faint">
                更新於 {new Date(b.updatedAt).toLocaleDateString("zh-TW")}
              </p>
              <div className="relative z-10 mt-auto flex gap-1.5">
                <IconButton
                  label="直接投影"
                  onClick={() => router.push(`/board/${b.id}?present=1`)}
                >
                  <Play className="size-4" />
                </IconButton>
                <IconButton
                  label="刪除黑板"
                  onClick={() => {
                    if (confirm(`確定刪除「${b.title}」？此動作無法復原。`))
                      deleteItem("boards", b.id);
                  }}
                >
                  <Trash2 className="size-4 text-danger" />
                </IconButton>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
