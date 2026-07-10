# GCP OAuth 設定手冊（Google 雲端同步啟用步驟）

> 完成後把 **Client ID** 交給 Claude Code / Codex 寫入環境變數即可。
> 全程只用「非敏感」scopes（`drive.file`、`drive.appdata`），不需要安全評估。

## 1. 建立 GCP 專案

1. 開啟 [console.cloud.google.com](https://console.cloud.google.com)
2. 頂欄專案選單 →「新增專案」→ 名稱 `jdn-classroom-studio` → 建立

## 2. 啟用 Google Drive API

1. 左側選單「API 和服務」→「程式庫」
2. 搜尋 **Google Drive API** → 啟用

## 3. 設定 OAuth 同意畫面

1. 「API 和服務」→「OAuth 同意畫面」
2. User Type 選 **External**（外部）→ 建立
3. 填寫：
   - 應用程式名稱：`JDN 課堂工作站`
   - 使用者支援電子郵件：你的 Gmail
   - 開發人員聯絡資訊：你的 Gmail
4. **範圍（Scopes）**：點「新增或移除範圍」，勾選：
   - `.../auth/drive.file`（查看及管理透過本應用程式開啟或建立的檔案）
   - `.../auth/drive.appdata`（查看及管理應用程式專屬設定資料）
   - `.../auth/userinfo.profile`、`.../auth/userinfo.email`
   > 這四個都是「非敏感」，不會觸發 Google 安全審查
5. **測試使用者**：加入你自己的 Gmail（Testing 階段只有測試使用者能登入）

## 4. 建立 OAuth Client ID

1. 「API 和服務」→「憑證」→「建立憑證」→「OAuth 用戶端 ID」
2. 應用程式類型：**網頁應用程式**
3. 名稱：`jdn-classroom-studio-web`
4. **已授權的 JavaScript 來源**（三筆都要加）：
   - `http://localhost:3000`
   - `http://localhost:4700`
   - `https://jdn-classroom-studio.vercel.app`
5. 「已授權的重新導向 URI」**留空**（GIS token model 不需要）
6. 建立 → 複製 **用戶端 ID**（形如 `xxxx.apps.googleusercontent.com`）

## 5. 交付

把 Client ID 貼給 Claude Code，或自行設定：

```bash
# 本機開發：專案根目錄 .env.local
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com

# Vercel
vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID production
```

## 6. 上線前（可先不做）

- Testing 階段：只有測試使用者能連接，**開發與自用已足夠**
- 要開放所有老師使用時：OAuth 同意畫面 →「發布應用程式」→ In production
  （非敏感 scopes 只需基本品牌審查：隱私權政策網址 + 網域驗證）

## 安全備忘

- access token 只存在瀏覽器記憶體，重新整理即消失（會靜默重新取得）
- 本站只能存取「自己建立」的 Drive 檔案，無法讀取使用者雲端硬碟的其他內容
- 備份存於 `appDataFolder`（應用程式專屬空間），使用者在 Drive 設定中可隨時整批刪除
