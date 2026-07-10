"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Presentation,
  Gamepad2,
  LayoutGrid,
  Users,
  Download,
  Upload,
  ArrowRight,
  Plus,
  Clock3,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useCollection, useHydrated } from "@/lib/hooks";
import {
  createItem,
  downloadExport,
} from "@/lib/storage";
import { nanoid } from "nanoid";

const MODES = [
  {
    key: "boards" as const,
    href: "/boards",
    label: "教學黑板",
    desc: "自由畫布：文字、圖片、影片、QR、嵌入內容，加上手寫與聚光燈",
    icon: Presentation,
    color: "var(--board)",
    unit: "塊",
    phase: "備課與講解",
    quickLabel: "開新黑板",
  },
  {
    key: "games" as const,
    href: "/games",
    label: "互動遊戲",
    desc: "貼上 AI 生成的 HTML 遊戲，沙箱安全執行、全螢幕投影",
    icon: Gamepad2,
    color: "var(--game)",
    unit: "個",
    phase: "課中互動",
    quickLabel: "加入遊戲",
  },
  {
    key: "walls" as const,
    href: "/walls",
    label: "成果收集牆",
    desc: "匯入或建檔學生成果，卡片牆展示、聚光逐張揭示",
    icon: LayoutGrid,
    color: "var(--wall)",
    unit: "面",
    phase: "收集與展示",
    quickLabel: "開成果牆",
  },
  {
    key: "rosters" as const,
    href: "/rosters",
    label: "學生名單",
    desc: "集中管理班級、座號、姓名與標籤，支援 CSV 匯入",
    icon: Users,
    color: "var(--roster)",
    unit: "班",
    phase: "班級資料",
    quickLabel: "管理名單",
  },
];

export function HubView() {
  const hydrated = useHydrated();
  const router = useRouter();
  const boards = useCollection("boards");
  const games = useCollection("games");
  const walls = useCollection("walls");
  const rosters = useCollection("rosters");
  const counts = {
    boards: boards.length,
    games: games.length,
    walls: walls.length,
    rosters: rosters.length,
  };
  const recent = [
    ...boards.map((item) => ({
      id: item.id,
      title: item.title,
      updatedAt: item.updatedAt,
      href: `/board/${item.id}`,
      label: "教學黑板",
      color: "var(--board)",
      icon: Presentation,
    })),
    ...games.map((item) => ({
      id: item.id,
      title: item.title,
      updatedAt: item.updatedAt,
      href: `/game/${item.id}`,
      label: "互動遊戲",
      color: "var(--game)",
      icon: Gamepad2,
    })),
    ...walls.map((item) => ({
      id: item.id,
      title: item.title,
      updatedAt: item.updatedAt,
      href: `/wall/${item.id}`,
      label: "成果牆",
      color: "var(--wall)",
      icon: LayoutGrid,
    })),
  ]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 3);

  function quickCreate(key: (typeof MODES)[number]["key"]) {
    if (key === "boards") {
      const b = createItem("boards", {
        title: "未命名黑板",
        pages: [{ id: nanoid(8), widgets: [], strokes: [] }],
      });
      router.push(`/board/${b.id}`);
    } else if (key === "games") {
      router.push("/games?new=1");
    } else if (key === "walls") {
      const w = createItem("walls", {
        title: "未命名成果牆",
        layout: "grid",
        cards: [],
      });
      router.push(`/wall/${w.id}`);
    } else {
      router.push("/rosters");
    }
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <header className="relative flex flex-col gap-4 overflow-hidden rounded-xl border border-border bg-surface-raised p-6 [box-shadow:var(--shadow-card)] md:p-9">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--board),var(--game),var(--wall),var(--roster))]" aria-hidden />
        <p className="inline-flex w-fit items-center gap-2 rounded-full border border-control bg-bg px-3 py-1.5 text-sm font-medium text-text-muted">
          <Sparkles className="size-4" aria-hidden />
          教師單機 · 投影導向 · 無需登入
        </p>
        <h1 className="display text-4xl md:text-5xl">
          上課要用什麼，
          <br className="md:hidden" />
          都在這裡。
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-text-muted">
          教學黑板、互動遊戲、成果收集牆——資料只存在你的瀏覽器，開頁即用，無需登入。
        </p>
        <p className="text-sm font-medium text-text-muted" aria-label="課堂工作流程：備課、上課、收成果">
          備課 <span aria-hidden>→</span> 上課 <span aria-hidden>→</span> 收成果，一個工作站完成
        </p>
        <div className="mt-1 flex flex-wrap gap-3">
          <Button variant="primary" size="md" onClick={() => quickCreate("boards")}>
            <Plus className="size-4.5" aria-hidden />
            開新黑板
          </Button>
          <Button variant="ghost" size="md" onClick={() => downloadExport()}>
            <Download className="size-4.5" aria-hidden />
            匯出備份
          </Button>
          <Button variant="ghost" size="md" onClick={() => router.push("/settings#backup")}>
            <Upload className="size-4.5" aria-hidden />
            備份與還原
          </Button>
        </div>
      </header>

      {hydrated && recent.length > 0 && (
        <section aria-labelledby="recent-heading" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-text-muted">
                <Clock3 className="size-4" aria-hidden />
                課前快速開啟
              </p>
              <h2 id="recent-heading" className="text-2xl font-bold">繼續最近的課堂內容</h2>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {recent.map(({ id, title, href, label, color, icon: Icon }) => (
              <Link
                key={`${label}-${id}`}
                href={href}
                className="group flex min-h-20 items-center gap-3 rounded-lg border border-control bg-surface-raised p-4 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:[box-shadow:var(--shadow-raised)] active:translate-y-0"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-bg" style={{ color }} aria-hidden>
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-text-muted">{label}</span>
                  <span className="block truncate font-semibold">{title}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 四張模式卡 */}
      <section
        aria-label="功能模式"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        {MODES.map(({ key, href, label, desc, icon: Icon, color, unit, phase, quickLabel }) => (
          <Card
            key={key}
            className="group relative flex flex-col gap-4 overflow-hidden p-6 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-border-strong hover:[box-shadow:var(--shadow-raised)]"
          >
            <span className="absolute inset-x-0 top-0 h-1" style={{ background: color }} aria-hidden />
            <div className="flex items-start justify-between">
              <span
                className="flex size-12 items-center justify-center rounded-lg border border-border bg-surface-raised"
                style={{ color }}
                aria-hidden
              >
                <Icon className="size-6" />
              </span>
              <span className="text-3xl font-bold tabular-nums" aria-label={`${counts[key]} ${unit}`}>
                {hydrated ? counts[key] : "–"}
                <span className="ml-1 text-sm font-normal text-text-muted">{unit}</span>
              </span>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">{phase}</p>
              <h2 className="text-xl font-bold">{label}</h2>
            </div>
            <p className="text-sm leading-relaxed text-text-muted">{desc}</p>
            <div className="mt-auto flex flex-wrap gap-2 pt-1">
              <Button variant="primary" size="sm" onClick={() => quickCreate(key)}>
                <Plus className="size-4" aria-hidden />
                {quickLabel}
              </Button>
              <Link
                href={href}
                className="inline-flex min-h-11 items-center justify-center gap-1 rounded-sm border border-control px-3 text-sm font-medium transition-colors hover:bg-hover"
              >
                查看與管理
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
