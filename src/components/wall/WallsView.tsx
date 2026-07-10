"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, Plus, Trash2, Play, StickyNote } from "lucide-react";
import { Card, EmptyState } from "@/components/ui/Card";
import { Button, IconButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useCollection, useHydrated } from "@/lib/hooks";
import { createItem, deleteItem } from "@/lib/storage";

export function WallsView() {
  const walls = useCollection("walls");
  const hydrated = useHydrated();
  const router = useRouter();

  function createWall() {
    const w = createItem("walls", {
      title: `新成果牆 ${walls.length + 1}`,
      layout: "grid" as const,
      cards: [],
    });
    router.push(`/wall/${w.id}`);
  }

  return (
    <>
      <PageHeader
        title="成果收集牆"
        desc="匯入或建檔學生成果，卡片牆展示、聚光逐張揭示。"
        actions={
          <Button variant="primary" onClick={createWall}>
            <Plus className="size-4.5" aria-hidden />
            新增成果牆
          </Button>
        }
      />
      {hydrated && walls.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid />}
          title="還沒有任何成果牆"
          hint="開一面牆，把學生的答案、作品或想法整批貼上來展示。"
          action={
            <Button variant="primary" onClick={createWall}>
              <Plus className="size-4.5" aria-hidden />
              新增成果牆
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {walls.map((w) => (
            <Card key={w.id} className="group relative flex flex-col gap-3 p-5 transition-colors hover:border-border-strong">
              <div className="flex items-start justify-between">
                <span className="flex size-11 items-center justify-center rounded-lg border border-border bg-surface-raised text-wall" aria-hidden>
                  <LayoutGrid className="size-5.5" />
                </span>
                <span className="flex items-center gap-1 text-sm tabular-nums text-text-muted">
                  <StickyNote className="size-4" aria-hidden />
                  {w.cards.length} 張
                </span>
              </div>
              <h2 className="text-lg font-bold">
                <Link href={`/wall/${w.id}`} className="after:absolute after:inset-0">
                  {w.title}
                </Link>
              </h2>
              {w.prompt && (
                <p className="line-clamp-2 text-sm text-text-muted">{w.prompt}</p>
              )}
              <div className="relative z-10 mt-auto flex gap-1.5">
                <IconButton label="直接投影" onClick={() => router.push(`/wall/${w.id}?present=1`)}>
                  <Play className="size-4" />
                </IconButton>
                <IconButton
                  label="刪除成果牆"
                  onClick={() => {
                    if (confirm(`確定刪除「${w.title}」？此動作無法復原。`))
                      deleteItem("walls", w.id);
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
