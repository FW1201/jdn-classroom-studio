"use client";

/* ============================================================
   使用說明（初次使用引導）
   五步驟課堂工作流 + 示範資料直達連結 + 資料安全說明
   動效：步驟卡階梯式 fade-up 進場（尊重 reduced-motion）
   ============================================================ */

import Link from "next/link";
import {
  Users,
  Dices,
  Presentation,
  Gamepad2,
  LayoutGrid,
  ShieldCheck,
  HardDriveDownload,
  Cloud,
  ArrowRight,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useCollection } from "@/lib/hooks";

const STEPS = [
  {
    icon: Users,
    color: "var(--roster)",
    title: "建立學生名單",
    href: "/rosters",
    linkLabel: "去建名單",
    points: [
      "新增班級後，逐一輸入學生（座號／姓名／標籤），或用 CSV 一次匯入整班",
      "CSV 格式：「座號,姓名,標籤」，也接受每行一個姓名",
      "名單建好後，點名分組、黑板抽人都會用到它",
    ],
  },
  {
    icon: Dices,
    color: "var(--roster)",
    title: "點名與分組",
    href: "/roster-tools",
    linkLabel: "試試點名",
    points: [
      "選班級後：隨機點名（大字投影、不重複抽）或隨機分組（分 N 組／每組 N 人）",
      "點學生名字可標記缺席，抽選與分組會自動排除",
      "分組結果可一鍵存成成果牆，直接投影給全班看",
    ],
  },
  {
    icon: Presentation,
    color: "var(--board)",
    title: "教學黑板",
    href: "/boards",
    linkLabel: "打開示範黑板",
    points: [
      "自由畫布：文字、便利貼、圖片、影片、QR、嵌入內容，隨意拖拉縮放",
      "手寫筆＋橡皮擦＋聚光燈，投影講解最順手",
      "工具列的「班級名單」可綁定班級，課堂中隨時抽人回答",
      "示範黑板的第一頁就是完整操作教學",
    ],
  },
  {
    icon: Gamepad2,
    color: "var(--game)",
    title: "互動視覺化",
    href: "/games",
    linkLabel: "玩示範遊戲",
    points: [
      "從「AI 指令模板庫」挑一個模板（24 個，含目標／規格／限制／驗收）",
      "複製指令 → 貼到 Claude / ChatGPT / Gemini → 把生成的 HTML 貼回來",
      "程式在隔離沙箱執行，無法讀取你的任何資料，可放心貼",
    ],
  },
  {
    icon: LayoutGrid,
    color: "var(--wall)",
    title: "成果收集牆",
    href: "/walls",
    linkLabel: "看教學範例牆",
    points: [
      "三種收集方式：手動建卡、批次貼上（「姓名：內容」自動拆作者）、Google 表單 CSV 匯入",
      "卡片可加星、隱藏、洗牌；點卡片聚光放大逐張揭示",
      "「投稿入口」貼表單連結產生 QR，學生掃碼提交後匯回展示",
    ],
  },
] as const;

export function GuideView() {
  const boards = useCollection("boards");
  const games = useCollection("games");
  const walls = useCollection("walls");

  // 示範資料直達（若還在的話）
  const demoBoard = boards.find((b) => b.title.includes("示範"));
  const demoGame = games.find((g) => g.title.includes("示範"));
  const demoWall = walls.find((w) => w.title.includes("示範"));

  const stepHref = (i: number, fallback: string) => {
    if (i === 2 && demoBoard) return `/board/${demoBoard.id}`;
    if (i === 3 && demoGame) return `/game/${demoGame.id}`;
    if (i === 4 && demoWall) return `/wall/${demoWall.id}`;
    return fallback;
  };

  return (
    <>
      <PageHeader
        title="使用說明"
        desc="五個步驟走完一堂課：備課 → 上課 → 收成果。每一步都有可以直接打開的示範。"
      />

      {/* 首次提示 */}
      <div className="fade-up mb-6" style={{ "--stagger": "0ms" } as React.CSSProperties}>
        <Card className="flex items-start gap-3 border-l-4 p-5" style={{ borderLeftColor: "var(--star)" }}>
          <Sparkles className="mt-0.5 size-5 shrink-0 text-star" aria-hidden />
          <div className="text-sm leading-relaxed text-text-muted">
            <p className="font-semibold text-text">初次開啟已為你準備好一套示範資料</p>
            <p className="mt-1">
              「示範班級」「示範黑板」「示範遊戲」「示範成果牆」——內容本身就是教學，照著玩一遍就上手。
              全部看完後可以直接刪掉，不影響任何功能。
            </p>
          </div>
        </Card>
      </div>

      {/* 五步驟 */}
      <ol className="flex flex-col gap-4" aria-label="五步驟課堂工作流">
        {STEPS.map(({ icon: Icon, color, title, href, linkLabel, points }, i) => (
          <li
            key={title}
            className="fade-up"
            style={{ "--stagger": `${(i + 1) * 90}ms` } as React.CSSProperties}
          >
            <Card className="group relative flex flex-col gap-4 overflow-hidden p-6 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:[box-shadow:var(--shadow-raised)] sm:flex-row sm:items-start">
              <span className="absolute inset-y-0 left-0 w-1" style={{ background: color }} aria-hidden />
              <div className="flex shrink-0 items-center gap-3 sm:w-56">
                <span
                  className="flex size-12 items-center justify-center rounded-lg border border-border bg-surface"
                  style={{ color }}
                  aria-hidden
                >
                  <Icon className="size-6" />
                </span>
                <div>
                  <p className="text-xs font-semibold tabular-nums text-text-faint">STEP {i + 1}</p>
                  <h2 className="text-lg font-bold">{title}</h2>
                </div>
              </div>
              <ul className="min-w-0 flex-1 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-text-muted">
                {points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <div className="shrink-0 sm:self-center">
                <Link href={stepHref(i, href)}>
                  <Button variant="surface" size="sm">
                    {linkLabel}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Button>
                </Link>
              </div>
            </Card>
          </li>
        ))}
      </ol>

      {/* 資料安全三張卡 */}
      <section
        aria-label="資料安全"
        className="fade-up mt-8 grid gap-4 sm:grid-cols-3"
        style={{ "--stagger": "560ms" } as React.CSSProperties}
      >
        <Card className="flex flex-col gap-2 p-5">
          <ShieldCheck className="size-5 text-roster" aria-hidden />
          <h3 className="font-bold">資料只在你手上</h3>
          <p className="text-sm leading-relaxed text-text-muted">
            所有內容存在此瀏覽器的 localStorage，沒有伺服器、無需登入。換裝置或清瀏覽器資料會遺失。
          </p>
        </Card>
        <Card className="flex flex-col gap-2 p-5">
          <HardDriveDownload className="size-5 text-board" aria-hidden />
          <h3 className="font-bold">記得定期備份</h3>
          <p className="text-sm leading-relaxed text-text-muted">
            「設定 → 匯出全部資料」下載 JSON 備份；換電腦時匯入即可還原（可選合併或覆蓋）。
          </p>
        </Card>
        <Card className="flex flex-col gap-2 p-5">
          <Cloud className="size-5 text-game" aria-hidden />
          <h3 className="font-bold">選配 Google 同步</h3>
          <p className="text-sm leading-relaxed text-text-muted">
            連接 Google 後可雲端備份、把黑板／名單／成果牆匯出成簡報／試算表／文件，一鍵分享到 Classroom。
          </p>
        </Card>
      </section>

      {/* 底部動線 */}
      <div
        className="fade-up mt-8 flex flex-wrap items-center justify-center gap-3"
        style={{ "--stagger": "660ms" } as React.CSSProperties}
      >
        <Link href="/">
          <Button variant="primary">
            開始使用
            <ArrowRight className="size-4.5" aria-hidden />
          </Button>
        </Link>
        <Link href="/settings">
          <Button variant="ghost">
            <RotateCcw className="size-4.5" aria-hidden />
            到設定備份／連接 Google
          </Button>
        </Link>
      </div>
    </>
  );
}
