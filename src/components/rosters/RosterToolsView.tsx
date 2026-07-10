"use client";

/* ============================================================
   名單工具（G0-A2）— 選班級 → 隨機點名 / 隨機分組
   投影導向：大字結果、不重複抽選、缺席排除、分組可存成果牆
   ============================================================ */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import {
  Users,
  Dices,
  UsersRound,
  RotateCcw,
  Shuffle,
  Save,
  Check,
} from "lucide-react";
import { Card, EmptyState, Tag } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useCollection, useHydrated } from "@/lib/hooks";
import { createItem } from "@/lib/storage";
import type { Student } from "@/lib/types";

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- 隨機點名 ---------- */

function RandomPicker({ students }: { students: Student[] }) {
  const [noRepeat, setNoRepeat] = useState(true);
  const [drawn, setDrawn] = useState<Student[]>([]);
  const [current, setCurrent] = useState<Student | null>(null);
  const [rolling, setRolling] = useState(false);

  const pool = noRepeat
    ? students.filter((s) => !drawn.some((d) => d.id === s.id))
    : students;

  function draw() {
    if (!pool.length || rolling) return;
    setRolling(true);
    // 快速輪播動畫後定格
    let ticks = 0;
    const timer = setInterval(() => {
      setCurrent(pool[Math.floor(Math.random() * pool.length)]);
      ticks++;
      if (ticks >= 12) {
        clearInterval(timer);
        const winner = pool[Math.floor(Math.random() * pool.length)];
        setCurrent(winner);
        setDrawn((d) => [...d, winner]);
        setRolling(false);
      }
    }, 80);
  }

  function reset() {
    setDrawn([]);
    setCurrent(null);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 大字結果區 */}
      <Card className="flex min-h-64 flex-col items-center justify-center gap-4 p-8 text-center">
        {current ? (
          <>
            {current.number && (
              <span className="text-2xl tabular-nums text-text-muted">{current.number} 號</span>
            )}
            <span
              aria-live="polite"
              className={`display text-7xl md:text-8xl ${rolling ? "opacity-60" : ""}`}
            >
              {current.name}
            </span>
          </>
        ) : (
          <span className="text-2xl text-text-muted">按下「抽一位」開始點名</span>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" size="lg" onClick={draw} disabled={!pool.length || rolling}>
            <Dices className="size-5" aria-hidden />
            {pool.length ? "抽一位" : "全部抽完了"}
          </Button>
          <Button variant="ghost" onClick={reset} disabled={!drawn.length}>
            <RotateCcw className="size-4.5" aria-hidden />
            重新開始
          </Button>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              checked={noRepeat}
              onChange={(e) => setNoRepeat(e.target.checked)}
              className="size-4.5 accent-[var(--text)]"
            />
            不重複抽選
          </label>
        </div>
        <p className="text-sm tabular-nums text-text-faint">
          剩餘 {pool.length} / {students.length} 人
        </p>
      </Card>

      {/* 已抽名單 */}
      {drawn.length > 0 && (
        <Card className="flex flex-col gap-3 p-5">
          <h3 className="font-bold">已抽出（依順序）</h3>
          <ol className="flex flex-wrap gap-2">
            {drawn.map((s, i) => (
              <li
                key={`${s.id}-${i}`}
                className="flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1 text-sm"
              >
                <span className="tabular-nums text-text-faint">{i + 1}.</span>
                {s.name}
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}

/* ---------- 隨機分組 ---------- */

type GroupMode = "byGroups" | "bySize";

function GroupMaker({ students, rosterName }: { students: Student[]; rosterName: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<GroupMode>("byGroups");
  const [count, setCount] = useState(4);
  const [groups, setGroups] = useState<Student[][] | null>(null);
  const [saved, setSaved] = useState(false);

  function makeGroups() {
    const pool = shuffleArray(students);
    const groupCount =
      mode === "byGroups"
        ? Math.min(Math.max(2, count), pool.length)
        : Math.max(1, Math.ceil(pool.length / Math.max(2, count)));
    const result: Student[][] = Array.from({ length: groupCount }, () => []);
    pool.forEach((s, i) => result[i % groupCount].push(s));
    setGroups(result);
    setSaved(false);
  }

  function saveToWall() {
    if (!groups) return;
    const stamp = new Date().toLocaleDateString("zh-TW");
    const wall = createItem("walls", {
      title: `${rosterName} 分組結果 ${stamp}`,
      prompt: `共 ${groups.length} 組・${students.length} 人`,
      layout: "grid" as const,
      cards: groups.map((g, i) => ({
        id: nanoid(8),
        kind: "text" as const,
        content: g.map((s) => s.name).join("、"),
        author: `第 ${i + 1} 組（${g.length} 人）`,
      })),
    });
    setSaved(true);
    router.push(`/wall/${wall.id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-wrap items-end gap-4 p-5">
        <div role="radiogroup" aria-label="分組方式" className="flex gap-2">
          <Button
            variant={mode === "byGroups" ? "primary" : "surface"}
            role="radio"
            aria-checked={mode === "byGroups"}
            onClick={() => setMode("byGroups")}
          >
            分成 N 組
          </Button>
          <Button
            variant={mode === "bySize" ? "primary" : "surface"}
            role="radio"
            aria-checked={mode === "bySize"}
            onClick={() => setMode("bySize")}
          >
            每組 N 人
          </Button>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {mode === "byGroups" ? "組數" : "每組人數"}
          <input
            type="number"
            min={2}
            max={Math.max(2, students.length)}
            value={count}
            onChange={(e) => setCount(Number(e.target.value) || 2)}
            className="h-11 w-28 rounded-sm border border-control bg-surface px-3 text-lg tabular-nums"
          />
        </label>
        <Button variant="primary" size="md" onClick={makeGroups} disabled={students.length < 2}>
          <Shuffle className="size-4.5" aria-hidden />
          {groups ? "重新分組" : "開始分組"}
        </Button>
        {groups && (
          <Button variant="ghost" onClick={saveToWall} disabled={saved}>
            {saved ? <Check className="size-4.5" aria-hidden /> : <Save className="size-4.5" aria-hidden />}
            {saved ? "已存成果牆" : "存成果牆"}
          </Button>
        )}
      </Card>

      {groups && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g, i) => (
            <Card key={i} className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">第 {i + 1} 組</h3>
                <Tag color="var(--roster)">{g.length} 人</Tag>
              </div>
              <ul className="flex flex-wrap gap-2">
                {g.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-lg"
                  >
                    {s.name}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- 主頁 ---------- */

export function RosterToolsView() {
  const rosters = useCollection("rosters");
  const hydrated = useHydrated();
  const router = useRouter();
  const [rosterId, setRosterId] = useState<string>("");
  const [tab, setTab] = useState<"pick" | "group">("pick");
  const [absent, setAbsent] = useState<Set<string>>(new Set());

  const roster = rosters.find((r) => r.id === rosterId) ?? rosters[0];
  const activeStudents = useMemo(
    () => (roster ? roster.students.filter((s) => !absent.has(s.id)) : []),
    [roster, absent]
  );

  if (hydrated && rosters.length === 0) {
    return (
      <>
        <PageHeader title="點名與分組" desc="選擇班級後進行隨機點名或分組。" />
        <EmptyState
          icon={<Users />}
          title="還沒有任何班級名單"
          hint="先到「學生名單」建立班級並加入學生，就能使用點名與分組。"
          action={
            <Button variant="primary" onClick={() => router.push("/rosters")}>
              前往學生名單
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="點名與分組"
        desc="選擇班級 → 隨機點名（不重複）或隨機分組；點學生名字可標記缺席排除。"
      />
      {roster && (
        <div className="flex flex-col gap-6">
          {/* 班級選擇 + 缺席標記 */}
          <Card className="flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                班級
                <select
                  value={roster.id}
                  onChange={(e) => {
                    setRosterId(e.target.value);
                    setAbsent(new Set());
                  }}
                  className="h-11 rounded-sm border border-control bg-surface px-3 text-base"
                >
                  {rosters.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}（{r.students.length} 人）
                    </option>
                  ))}
                </select>
              </label>
              <span className="text-sm text-text-muted">
                出席 {activeStudents.length} 人
                {absent.size > 0 && `・缺席 ${absent.size} 人`}
              </span>
            </div>
            {roster.students.length > 0 && (
              <div className="flex flex-wrap gap-2" role="group" aria-label="點擊標記缺席">
                {roster.students.map((s) => {
                  const isAbsent = absent.has(s.id);
                  return (
                    <button
                      key={s.id}
                      aria-pressed={isAbsent}
                      aria-label={`${s.name}${isAbsent ? "（缺席，點擊恢復）" : "（出席，點擊標記缺席）"}`}
                      onClick={() =>
                        setAbsent((prev) => {
                          const next = new Set(prev);
                          if (next.has(s.id)) next.delete(s.id);
                          else next.add(s.id);
                          return next;
                        })
                      }
                      className={`min-h-9 cursor-pointer rounded-full border px-3 text-sm transition-all ${
                        isAbsent
                          ? "border-border bg-transparent text-text-faint line-through opacity-60"
                          : "border-control bg-surface-raised text-text hover:bg-hover"
                      }`}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* 模式切換 */}
          <div role="radiogroup" aria-label="工具" className="flex gap-2">
            <Button
              variant={tab === "pick" ? "primary" : "surface"}
              size="lg"
              role="radio"
              aria-checked={tab === "pick"}
              onClick={() => setTab("pick")}
            >
              <Dices className="size-5" aria-hidden />
              隨機點名
            </Button>
            <Button
              variant={tab === "group" ? "primary" : "surface"}
              size="lg"
              role="radio"
              aria-checked={tab === "group"}
              onClick={() => setTab("group")}
            >
              <UsersRound className="size-5" aria-hidden />
              隨機分組
            </Button>
          </div>

          {activeStudents.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title="這個班級目前沒有可用的學生"
              hint="請先到「學生名單」加入學生，或取消缺席標記。"
            />
          ) : tab === "pick" ? (
            <RandomPicker key={roster.id} students={activeStudents} />
          ) : (
            <GroupMaker key={roster.id} students={activeStudents} rosterName={roster.name} />
          )}
        </div>
      )}
    </>
  );
}
