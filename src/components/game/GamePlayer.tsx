"use client";

/* ============================================================
   GamePlayer — 全螢幕沙箱執行（模式二）
   ============================================================ */

import { useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Home, RotateCcw, Maximize, Gamepad2 } from "lucide-react";
import { useItem } from "@/lib/hooks";
import { Button, IconButton } from "@/components/ui/Button";
import { SandboxFrame } from "@/components/sandbox/SandboxFrame";

export function GamePlayer() {
  const params = useParams<{ id: string }>();
  const game = useItem("games", params.id);
  const router = useRouter();
  const [runKey, setRunKey] = useState(0); // 重新載入用

  if (!game) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <p className="text-lg text-text-muted">找不到這個遊戲（可能已被刪除）</p>
        <Button variant="primary" onClick={() => router.push("/games")}>回遊戲列表</Button>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/games" aria-label="回遊戲列表" className="flex size-11 items-center justify-center rounded-md hover:bg-hover">
            <Home className="size-5" />
          </Link>
          <Gamepad2 className="size-5 shrink-0 text-game" aria-hidden />
          <h1 className="truncate text-lg font-bold">{game.title}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <IconButton label="重新開始" onClick={() => setRunKey((k) => k + 1)}>
            <RotateCcw className="size-4.5" />
          </IconButton>
          <IconButton
            label="全螢幕"
            onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
          >
            <Maximize className="size-4.5" />
          </IconButton>
        </div>
      </header>
      <main className="min-h-0 flex-1 bg-white">
        <SandboxFrame key={runKey} html={game.html} title={game.title} allowFullscreen />
      </main>
    </div>
  );
}
