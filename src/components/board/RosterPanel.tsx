"use client";

/* ============================================================
   RosterPanel — 黑板的名單側欄（名單 ↔ 黑板串接）
   選班級（綁定 board.rosterId）→ 顯示學生 → 課中快速隨機抽人
   ============================================================ */

import { useState } from "react";
import Link from "next/link";
import { Users, Dices, X, RotateCcw } from "lucide-react";
import type { Board } from "@/lib/types";
import { useCollection } from "@/lib/hooks";
import { updateItem } from "@/lib/storage";
import { Button, IconButton } from "@/components/ui/Button";

export function RosterPanel({
  board,
  onClose,
}: {
  board: Board;
  onClose: () => void;
}) {
  const rosters = useCollection("rosters");
  const roster = rosters.find((r) => r.id === board.rosterId);
  const [drawn, setDrawn] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);

  const pool = roster
    ? roster.students.filter((s) => !drawn.includes(s.name)).map((s) => s.name)
    : [];

  function draw() {
    if (!pool.length || rolling) return;
    setRolling(true);
    let ticks = 0;
    const timer = setInterval(() => {
      setCurrent(pool[Math.floor(Math.random() * pool.length)]);
      if (++ticks >= 10) {
        clearInterval(timer);
        const winner = pool[Math.floor(Math.random() * pool.length)];
        setCurrent(winner);
        setDrawn((d) => [...d, winner]);
        setRolling(false);
      }
    }, 70);
  }

  return (
    <aside
      data-ui
      aria-label="班級名單面板"
      className="absolute right-3 top-16 z-50 flex max-h-[70vh] w-72 flex-col gap-3 overflow-y-auto rounded-xl border border-control bg-surface-raised p-4 [box-shadow:var(--shadow-raised)] motion-safe:animate-[panel-in_200ms_ease-out]"
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold">
          <Users className="size-4.5 text-roster" aria-hidden />
          班級名單
        </h2>
        <IconButton label="關閉名單面板" className="!size-9" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </div>

      {rosters.length === 0 ? (
        <p className="text-sm leading-relaxed text-text-muted">
          還沒有任何班級。先到
          <Link href="/rosters" className="mx-1 underline">學生名單</Link>
          建立，再回來綁定這塊黑板。
        </p>
      ) : (
        <>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-muted">
            綁定班級
            <select
              value={board.rosterId ?? ""}
              onChange={(e) =>
                updateItem("boards", board.id, {
                  rosterId: e.target.value || undefined,
                })
              }
              className="h-10 rounded-sm border border-control bg-surface px-2 text-sm text-text"
            >
              <option value="">未綁定</option>
              {rosters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}（{r.students.length} 人）
                </option>
              ))}
            </select>
          </label>

          {roster && (
            <>
              {/* 快速抽人 */}
              <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface p-3">
                <p
                  aria-live="polite"
                  className={`min-h-10 text-center text-2xl font-bold ${rolling ? "opacity-60" : ""}`}
                >
                  {current ?? "——"}
                </p>
                <div className="flex gap-1.5">
                  <Button variant="primary" size="sm" onClick={draw} disabled={!pool.length || rolling}>
                    <Dices className="size-4" aria-hidden />
                    {pool.length ? "抽一位" : "抽完了"}
                  </Button>
                  <IconButton label="重置抽選" className="!size-9" onClick={() => { setDrawn([]); setCurrent(null); }}>
                    <RotateCcw className="size-4" />
                  </IconButton>
                </div>
                <p className="text-xs tabular-nums text-text-faint">
                  剩 {pool.length} / {roster.students.length} 人
                </p>
              </div>

              {/* 學生清單 */}
              <ul className="flex flex-wrap gap-1.5" aria-label="學生清單">
                {roster.students.map((s) => (
                  <li
                    key={s.id}
                    className={`rounded-full border px-2.5 py-1 text-xs transition-opacity ${
                      drawn.includes(s.name)
                        ? "border-border text-text-faint line-through opacity-50"
                        : "border-control bg-surface text-text"
                    }`}
                  >
                    {s.number && <span className="mr-1 tabular-nums text-text-faint">{s.number}</span>}
                    {s.name}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </aside>
  );
}
