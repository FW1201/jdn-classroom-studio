"use client";

/* ============================================================
   首次使用範本 — 初次開啟自動建立四份教學級示範資料
   （示範班級 / 教學黑板 / 互動視覺化 / 成果收集牆）
   內容本身就是該模式的使用教學；使用者可隨時整份刪除。
   ============================================================ */

import { nanoid } from "nanoid";
import type { Board, Game, Roster, Wall } from "./types";
import { getCollection, setCollection } from "./storage";

const SEED_FLAG = "jcs:seeded";

/* ---------- 示範班級 ---------- */

function seedRoster(): Roster {
  const now = Date.now();
  const names: [string, string, string?][] = [
    ["1", "林小美", "班長"],
    ["2", "陳大文", undefined],
    ["3", "張雅筑", "副班長"],
    ["4", "李承翰", undefined],
    ["5", "王思涵", undefined],
    ["6", "劉冠廷", "體育股長"],
    ["7", "黃郁婷", undefined],
    ["8", "吳建志", undefined],
  ];
  return {
    id: nanoid(10),
    name: "示範班級（可刪除）",
    students: names.map(([number, name, tag]) => ({
      id: nanoid(8),
      name,
      number,
      tags: tag ? [tag] : undefined,
    })),
    createdAt: now,
    updatedAt: now,
  };
}

/* ---------- 示範黑板：內容即教學 ---------- */

function seedBoard(rosterId: string): Board {
  const now = Date.now();
  const W = (
    type: Board["pages"][0]["widgets"][0]["type"],
    x: number, y: number, w: number, h: number, z: number,
    props: Record<string, unknown>
  ) => ({ id: nanoid(8), type, x, y, w, h, z, props });

  return {
    id: nanoid(10),
    title: "歡迎使用教學黑板（示範）",
    rosterId,
    pages: [
      {
        id: nanoid(8),
        widgets: [
          W("text", 60, 40, 760, 100, 10, {
            content: "歡迎！這塊黑板就是使用教學 👇",
            fontSize: 52,
          }),
          W("text", 60, 160, 620, 260, 11, {
            content:
              "下方工具列由左到右：\n· 選取／平移：拖曳畫布、移動物件\n· 手寫筆＋橡皮擦：直接在畫面上書寫\n· 聚光燈：聚焦某個區域（雙擊退出）\n· 班級名單：綁定班級、課中快速抽人",
            fontSize: 26,
          }),
          W("sticky", 720, 180, 260, 190, 12, {
            content: "我是便利貼！\n\n點我一下→拖角落可縮放；再點一下可編輯文字。",
            color: "#fff6c9",
          }),
          W("sticky", 720, 390, 260, 170, 13, {
            content: "選取物件後，上方會出現工具列：字級、圖層、鎖定、刪除。",
            color: "#e8f4f0",
          }),
          W("text", 60, 450, 620, 150, 14, {
            content:
              "右下角可以翻頁／新增頁面。\n右上角「投影」進入全螢幕上課模式，編輯按鈕會自動收起。",
            fontSize: 26,
          }),
          W("qr", 1020, 180, 220, 250, 15, {
            url: "https://jdn-classroom-studio.vercel.app",
            label: "掃我開啟工作站",
          }),
        ],
        strokes: [],
      },
      {
        id: nanoid(8),
        widgets: [
          W("text", 60, 40, 700, 90, 10, {
            content: "第二頁：這裡留給你練習",
            fontSize: 44,
          }),
          W("sticky", 60, 170, 300, 180, 11, {
            content: "試試看：\n1. 加一段文字\n2. 畫一筆\n3. 按「投影」看看差別",
            color: "#eee9fb",
          }),
        ],
        strokes: [],
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

/* ---------- 示範視覺化：可直接玩的快問快答 ---------- */

const SEED_GAME_HTML = `<!DOCTYPE html>
<html lang="zh-Hant"><head><meta charset="utf-8"><style>
  body{font-family:"Noto Sans TC",sans-serif;margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(160deg,#f7f4ed,#e8f4f0);color:#1c1c1c;text-align:center}
  h1{font-size:30px;margin:0 0 6px}
  .hint{color:#5f5f5d;font-size:15px;margin-bottom:22px}
  #q{font-size:56px;font-weight:700;margin:10px 0 24px}
  .opts{display:flex;gap:14px;flex-wrap:wrap;justify-content:center}
  button{font-size:34px;padding:18px 40px;border:2px solid #1c1c1c;border-radius:14px;background:#fff;cursor:pointer;transition:transform .12s}
  button:hover{transform:translateY(-3px)}
  button.right{background:#2f6f6a;color:#fff;border-color:#2f6f6a}
  button.wrong{background:#c0392b;color:#fff;border-color:#c0392b;animation:shake .3s}
  #score{font-size:22px;margin-top:26px;color:#5f5f5d}
  @keyframes shake{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
</style></head><body>
<h1>快問快答（示範）</h1>
<p class="hint">這是「互動視覺化」範例：貼上 AI 生成的 HTML，立刻變課堂活動。試著答題看看！</p>
<div id="q"></div>
<div class="opts" id="opts"></div>
<div id="score">得分 0</div>
<script>
let score=0,cur;
function next(){
  const a=2+Math.floor(Math.random()*8),b=2+Math.floor(Math.random()*8);
  cur=a*b;
  document.getElementById('q').textContent=a+' × '+b+' = ?';
  const wrong=cur+[-2,-1,1,2,10][Math.floor(Math.random()*5)];
  const pair=Math.random()<.5?[cur,wrong]:[wrong,cur];
  const box=document.getElementById('opts');box.innerHTML='';
  pair.forEach(v=>{
    const btn=document.createElement('button');btn.textContent=v;
    btn.onclick=()=>{
      if(v===cur){btn.className='right';score++;setTimeout(next,450)}
      else{btn.className='wrong'}
      document.getElementById('score').textContent='得分 '+score;
    };
    box.appendChild(btn);
  });
}
next();
</script></body></html>`;

function seedGame(): Game {
  const now = Date.now();
  return {
    id: nanoid(10),
    title: "快問快答（示範，可直接玩）",
    html: SEED_GAME_HTML,
    tags: ["示範", "數學"],
    createdAt: now,
    updatedAt: now,
  };
}

/* ---------- 示範成果牆：卡片即教學 ---------- */

function seedWall(): Wall {
  const now = Date.now();
  const card = (
    content: string,
    author?: string,
    extra?: Partial<Wall["cards"][0]>
  ) => ({ id: nanoid(8), kind: "text" as const, content, author, ...extra });

  return {
    id: nanoid(10),
    title: "成果收集牆使用教學（示範）",
    prompt: "這面牆的每張卡片，都是一個功能說明——照著做一遍就上手了。",
    layout: "grid",
    cards: [
      card("點右上角「投影」進入展示模式：隱藏的卡片不會出現、編輯按鈕全部收起。", "① 先認識投影"),
      card("「批次貼上」可以一次貼一整段文字，每行變一張卡；「姓名：內容」會自動拆出作者。", "② 快速收集"),
      card("從 Google 表單收學生回答 → 下載 CSV → 用「匯入 CSV」倒進來，姓名與內容自動對應。", "③ 表單匯入"),
      card("滑鼠移到卡片上：加星（值得全班看）、隱藏（暫不展示）、刪除。", "④ 卡片管理", { starred: true }),
      card("點任何卡片可以「聚光放大」逐張揭示，適合投影討論。", "⑤ 聚光揭示"),
      card("上方可切換三種佈局、洗牌重排；「投稿入口」貼表單連結可產生 QR 給學生掃。", "⑥ 佈局與投稿"),
      card("這張卡被隱藏了——投影時你不會看到我。", "⑦ 隱藏示範", { hidden: true }),
    ],
    createdAt: now,
    updatedAt: now,
  };
}

/* ---------- 進入點 ---------- */

/** 首次開啟（四集合皆空且未播種過）時建立示範資料；回傳是否有播種 */
export function ensureSeeded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(SEED_FLAG)) return false;
    const empty =
      getCollection("rosters").length === 0 &&
      getCollection("boards").length === 0 &&
      getCollection("games").length === 0 &&
      getCollection("walls").length === 0;
    if (!empty) {
      localStorage.setItem(SEED_FLAG, "1");
      return false;
    }
    const roster = seedRoster();
    setCollection("rosters", [roster]);
    setCollection("boards", [seedBoard(roster.id)]);
    setCollection("games", [seedGame()]);
    setCollection("walls", [seedWall()]);
    localStorage.setItem(SEED_FLAG, "1");
    return true;
  } catch {
    return false;
  }
}
