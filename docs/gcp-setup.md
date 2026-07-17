# GCP OAuth 設定手冊（Google 雲端同步啟用步驟）

> 完成後把 **Client ID** 與 **Picker API 金鑰** 交給 Claude Code / Codex 寫入環境變數即可。
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

## 5. 建立 Google Picker API 金鑰（雲端匯入教材用）

> 這支金鑰跟第 4 步的 OAuth Client ID 是**兩個不同的憑證**：Client ID 負責登入授權，
> 這支 API 金鑰負責讓「選擇 Google 雲端硬碟教材」的檔案選擇視窗（Picker）能開啟。
> 沒設定這步，畫面上會顯示「需設定 Google API Key」，「從 Google 雲端硬碟」按鈕會被停用。

1. 「API 和服務」→「程式庫」→ 搜尋 **Google Picker API** → 啟用
   （這是跟第 2 步 Drive API 分開的另一個 API，要各自啟用）
2. 「API 和服務」→「憑證」→「建立憑證」→「API 金鑰」
3. 建立後點進去「編輯 API 金鑰」設定限制（務必設定，避免金鑰被盜用在其他網站）：
   - **應用程式限制**：選「HTTP 參照網址（網站）」，加入三筆：
     - `http://localhost:3000/*`
     - `http://localhost:4700/*`
     - `https://jdn-classroom-studio.vercel.app/*`
   - **API 限制**：選「限制金鑰」，只勾選 **Google Picker API**
4. 複製金鑰（形如 `AIzaSy...`）

## 6. 交付

把 Client ID 與 API 金鑰一起貼給 Claude Code，或自行設定：

```bash
# 本機開發：專案根目錄 .env.local
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_API_KEY=AIzaSy...

# Vercel
vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID production
vercel env add NEXT_PUBLIC_GOOGLE_API_KEY production
```

## 7. 上線前（可先不做）

- Testing 階段：只有測試使用者能連接，**開發與自用已足夠**
- 要開放所有老師使用時：OAuth 同意畫面 →「發布應用程式」→ In production
  （非敏感 scopes 只需基本品牌審查：隱私權政策網址 + 網域驗證）

## 安全備忘

- access token 只存在瀏覽器記憶體，重新整理即消失（會靜默重新取得）
- 本站只能存取「自己建立」的 Drive 檔案，無法讀取使用者雲端硬碟的其他內容
- 備份存於 `appDataFolder`（應用程式專屬空間），使用者在 Drive 設定中可隨時整批刪除
