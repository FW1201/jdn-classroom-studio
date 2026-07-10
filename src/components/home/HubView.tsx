"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import {
  Presentation,
  Gamepad2,
  LayoutGrid,
  Users,
  Download,
  Upload,
  ArrowRight,
  Plus,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useCollection, useHydrated } from "@/lib/hooks";
import {
  createItem,
  downloadExport,
  importAll,
  validateBundle,
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
  },
  {
    key: "games" as const,
    href: "/games",
    label: "互動遊戲",
    desc: "貼上 AI 生成的 HTML 遊戲，沙箱安全執行、全螢幕投影",
    icon: Gamepad2,
    color: "var(--game)",
    unit: "個",
  },
  {
    key: "walls" as const,
    href: "/walls",
    label: "成果收集牆",
    desc: "匯入或建檔學生成果，卡片牆展示、聚光逐張揭示",
    icon: LayoutGrid,
    color: "var(--wall)",
    unit: "面",
  },
  {
    key: "rosters" as const,
    href: "/rosters",
    label: "學生名單",
    desc: "班級與學生建檔、CSV 匯入，供黑板與成果牆使用",
    icon: Users,
    color: "var(--roster)",
    unit: "班",
  },
];

export function HubView() {
  const hydrated = useHydrated();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const counts = {
    boards: useCollection("boards").length,
    games: useCollection("games").length,
    walls: useCollection("walls").length,
    rosters: useCollection("rosters").length,
  };

  function handleImport(file: File) {
    file.text().then((text) => {
      try {
        const data = JSON.parse(text);
        if (!validateBundle(data)) {
          alert("檔案格式不符：請選擇由本站匯出的 JSON 備份。");
          return;
        }
        const replace = confirm(
          "要「覆蓋」現有資料嗎？\n\n確定＝覆蓋（以備份為準）\n取消＝合併（保留現有，加入備份中的新項目）"
        );
        importAll(data, replace ? "replace" : "merge");
        alert("匯入完成。");
      } catch {
        alert("無法讀取檔案：請確認是有效的 JSON 備份。");
      }
    });
  }

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
      router.push("/rosters?new=1");
    }
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <header className="flex flex-col gap-4 pt-4 md:pt-8">
        <h1 className="display text-4xl md:text-5xl">
          上課要用什麼，
          <br className="md:hidden" />
          都在這裡。
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-text-muted">
          教學黑板、互動遊戲、成果收集牆——資料只存在你的瀏覽器，開頁即用，無需登入。
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
          <Button variant="ghost" size="md" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4.5" aria-hidden />
            匯入備份
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              e.target.value = "";
            }}
          />
        </div>
      </header>

      {/* 四張模式卡 */}
      <section
        aria-label="功能模式"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        {MODES.map(({ key, href, label, desc, icon: Icon, color, unit }) => (
          <Card
            key={key}
            className="group relative flex flex-col gap-3 p-6 transition-colors hover:border-border-strong"
          >
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
            <h2 className="text-xl font-bold">
              <Link href={href} className="after:absolute after:inset-0">
                {label}
              </Link>
            </h2>
            <p className="text-sm leading-relaxed text-text-muted">{desc}</p>
            <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-text-muted transition-colors group-hover:text-text">
              進入管理
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Card>
        ))}
      </section>
    </div>
  );
}
