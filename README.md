# JDN 課堂工作站（jdn-classroom-studio）

教師單機、投影導向、**無登入** 的課堂工作站。三大模式 + 一個管理中樞，所有資料只存在瀏覽器 localStorage。

> 舊專案 `jdn-teaching-toolbox`（30+ 無 AI 小工具）大規模重構後的新定位，靈感取自 TeacherSay 的互動白板概念。

## 三大模式

| 模式 | 路由 | 說明 |
|------|------|------|
| 🖥 教學黑板 | `/board/[id]` | 自由畫布：文字、便利貼、圖片、影片、超連結、QR、嵌入內容（沙箱），加上 perfect-freehand 手寫、橡皮擦、聚光燈；多頁、平移縮放、投影模式 |
| 🎮 互動視覺化 | `/game/[id]` | 貼上 AI 生成的 HTML 互動內容 → 沙箱 iframe（無 `allow-same-origin`）安全執行、全螢幕投影；內建 **AI 指令模板庫**（24 個 SDD 結構 prompt，6 分類） |
| 🗂 成果收集牆 | `/wall/[id]` | 匯入式卡片牆：手動建卡、批次貼上（`姓名：內容`）、CSV 匯入（Google 表單）；三種佈局、加星、隱藏、洗牌、聚光逐張揭示；外部表單 QR 橋接 |

**管理中樞**（`/`）：四類資料（名單/黑板/視覺化/成果牆）統計與建檔入口；全站 JSON 匯出/匯入備份；學生名單 CSV 匯入（`座號,姓名,標籤`）。
**點名與分組**（`/roster-tools`）：選班級 → 隨機點名（投影大字、不重複、缺席排除）／隨機分組（分 N 組或每組 N 人，結果一鍵存成果牆）。

## Google 雲端同步（選配）

無登入依然 100% 可用；設定 `NEXT_PUBLIC_GOOGLE_CLIENT_ID` 後（步驟見 [docs/gcp-setup.md](docs/gcp-setup.md)）多出：

- **雲端備份**：全站資料 JSON 備份到 Drive `appDataFolder`（滾動保留 5 份），可合併／覆蓋還原
- **匯出 Google Workspace**：名單/成果牆 → 試算表、成果牆 → 文件、黑板 → 簡報、視覺化 HTML → Drive 檔案
- **分享到 Classroom**：任何匯出檔或投稿入口一鍵發佈（免 Classroom API、免審核的分享網址）
- 僅使用非敏感 scopes（`drive.file` + `drive.appdata`）：本站只能存取自己建立的檔案；token 只存記憶體

## Roadmap

- **暫緩**：課節工作區（把黑板＋視覺化＋成果牆綁成一堂課的劇本）、成果牆即時投稿後端、Classroom API 完整整合

## 技術棧

- Next.js 16（App Router）+ React 19 + TypeScript 5
- Tailwind CSS 4（runtime CSS 變數 tokens，深淺雙主題）
- react-rnd / @use-gesture/react / perfect-freehand / qrcode / papaparse
- **無後端**：資料層 `src/lib/storage.ts`（localStorage + useSyncExternalStore），約 5MB 容量守門

## 設計語言

- 底層：**Lovable**（`DESIGN.md`）— 暖奶油 `#f7f4ed`、炭黑 `#1c1c1c`、不透明度灰階、`#eceae4` 邊線、inset-shadow 深色按鈕
- 優化層：**ui-ux-pro-max** — 投影可讀性優先（大字級高對比）、44px 觸控目標、無障礙（aria/focus/reduced-motion）
- 字型：Nunito（拉丁）+ Noto Sans TC（中文），next/font 自代管

## 開發

```bash
npm install
npm run dev    # http://localhost:3000
npm run build
```

## 資料原則

1. 學生資料只存在瀏覽器 localStorage，可隨時匯出 JSON 或清除。
2. 貼入的遊戲程式碼一律在隔離沙箱執行，無法讀取本站資料。
3. 全站無追蹤、無第三方資料上傳。

---

Built with Claude Code · 2026
