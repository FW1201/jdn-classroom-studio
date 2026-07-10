/* ============================================================
   jdn-classroom-studio — 核心資料模型
   四個集合：rosters / boards / games / walls（localStorage）
   ============================================================ */

export interface BaseEntity {
  id: string;
  createdAt: number;
  updatedAt: number;
}

/* ---------- 學生名單 ---------- */

export interface Student {
  id: string;
  name: string;
  number?: string; // 座號
  tags?: string[];
}

export interface Roster extends BaseEntity {
  name: string; // 班級名稱
  students: Student[];
}

/* ---------- 教學黑板 ---------- */

export type WidgetType =
  | "text"
  | "image"
  | "video"
  | "link"
  | "qr"
  | "embed"
  | "sticky";

export interface Widget {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  rotation?: number;
  locked?: boolean;
  /** 依 type 決定內容：
   *  text: { content, fontSize, color, align }
   *  image: { src(dataURL), alt }
   *  video: { url }（YouTube embed）
   *  link: { url, label }
   *  qr: { url, label }
   *  embed: { html }（沙箱 iframe srcdoc）
   *  sticky: { content, color }
   */
  props: Record<string, unknown>;
}

export interface Stroke {
  id: string;
  points: [number, number][]; // 畫布座標
  color: string;
  size: number;
}

export interface BoardPage {
  id: string;
  background?: string; // 顏色 token 或 dataURL
  widgets: Widget[];
  strokes: Stroke[];
}

export interface Board extends BaseEntity {
  title: string;
  pages: BoardPage[];
  rosterId?: string;
}

/* ---------- 互動遊戲 ---------- */

export interface Game extends BaseEntity {
  title: string;
  html: string; // 完整 HTML，以沙箱 iframe srcdoc 執行
  tags?: string[];
  thumbnail?: string; // 可選 dataURL
}

/* ---------- 成果收集牆 ---------- */

export type WallCardKind = "text" | "image" | "link";
export type WallLayout = "grid" | "masonry" | "columns";

export interface WallCard {
  id: string;
  kind: WallCardKind;
  content: string; // text: 內文 / image: dataURL / link: URL
  author?: string;
  group?: string;
  starred?: boolean;
  hidden?: boolean;
}

export interface Wall extends BaseEntity {
  title: string;
  prompt?: string; // 給學生的題目 / 說明
  layout: WallLayout;
  submitUrl?: string; // 外部表單橋接（Google 表單等）
  cards: WallCard[];
}

/* ---------- 全站 ---------- */

export interface Settings {
  theme: "system" | "light" | "dark";
}

export interface ExportBundle {
  app: "jdn-classroom-studio";
  schemaVersion: number;
  exportedAt: number;
  rosters: Roster[];
  boards: Board[];
  games: Game[];
  walls: Wall[];
  settings: Settings;
}

export const SCHEMA_VERSION = 1;
