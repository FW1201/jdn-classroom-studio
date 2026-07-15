"use client";

/* ============================================================
   Google 選配同步層 — GIS (Google Identity Services) token model
   - 純前端：access token 只存在記憶體，不落 localStorage
   - scopes 僅用非敏感：drive.file + drive.appdata + userinfo
   - 未設定 NEXT_PUBLIC_GOOGLE_CLIENT_ID 時整層停用（local-first 不受影響）
   ============================================================ */

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.appdata",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export interface GoogleProfile {
  name: string;
  email: string;
  picture?: string;
}

export type GoogleAuthStatus =
  | "unconfigured" // 未設定 Client ID
  | "disconnected"
  | "connecting"
  | "connected";

export interface GoogleAuthState {
  status: GoogleAuthStatus;
  profile: GoogleProfile | null;
  error?: string;
}

/* ---------- GIS 型別（避免引整包 @types/google.accounts）---------- */

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken: (config?: { prompt?: string }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: TokenResponse) => void;
            error_callback?: (err: { type?: string; message?: string }) => void;
          }) => TokenClient;
          revoke: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

/* ---------- 記憶體狀態（token 絕不落地）---------- */

let accessToken: string | null = null;
let tokenExpiresAt = 0; // epoch ms
let tokenClient: TokenClient | null = null;
let pendingTokenResolvers: {
  resolve: (t: string) => void;
  reject: (e: Error) => void;
}[] = [];

let state: GoogleAuthState = {
  status: GOOGLE_CLIENT_ID ? "disconnected" : "unconfigured",
  profile: null,
};

const listeners = new Set<() => void>();

function setState(patch: Partial<GoogleAuthState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribeGoogleAuth(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getGoogleAuthState(): GoogleAuthState {
  return state;
}

/* ---------- GIS script 載入 ---------- */

let gisLoading: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoading) return gisLoading;
  gisLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisLoading = null;
      reject(new Error("無法載入 Google 登入元件（請檢查網路）"));
    };
    document.head.appendChild(script);
  });
  return gisLoading;
}

// 提前預載 GIS script：若等到使用者點擊當下才開始載入，requestAccessToken()
// 會在腳本下載完成後才觸發，這段非同步延遲常讓瀏覽器不再視為「使用者點擊直接觸發」，
// 進而擋下授權彈出視窗（出現「有時候能連、有時候不能連」的假隨機現象）。
if (typeof window !== "undefined" && GOOGLE_CLIENT_ID) {
  loadGis().catch(() => {
    /* 預載失敗不影響流程，getAccessToken() 呼叫時會再重試並回報錯誤 */
  });
}

/** 把 GIS 回傳的原始（多為英文）錯誤代碼，轉成可操作的中文提示 */
function friendlyAuthError(raw: string | undefined): string {
  const msg = raw ?? "";
  if (/popup/i.test(msg)) {
    return "瀏覽器封鎖了 Google 登入彈出視窗，請允許本網站的彈出視窗後再試一次（通常網址列右側會出現被封鎖的圖示，點開允許）。";
  }
  if (/access_denied/i.test(msg)) {
    return "這個 Google 帳號未獲授權存取。若應用程式仍在 Testing 階段，請確認已在 Google Cloud Console 的 OAuth 同意畫面把這個帳號加入「測試使用者」名單。";
  }
  if (/closed/i.test(msg)) {
    return "Google 授權視窗被關閉，請再試一次並完成登入流程。";
  }
  return msg || "Google 連接失敗，請稍後再試。";
}

async function ensureTokenClient(): Promise<TokenClient> {
  if (tokenClient) return tokenClient;
  await loadGis();
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) throw new Error("Google 登入元件初始化失敗");
  tokenClient = oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GOOGLE_SCOPES,
    callback: (resp) => {
      const pending = pendingTokenResolvers;
      pendingTokenResolvers = [];
      if (resp.error || !resp.access_token) {
        const err = new Error(friendlyAuthError(resp.error_description || resp.error));
        pending.forEach((p) => p.reject(err));
        return;
      }
      accessToken = resp.access_token;
      tokenExpiresAt = Date.now() + ((resp.expires_in ?? 3600) - 60) * 1000;
      pending.forEach((p) => p.resolve(resp.access_token!));
    },
    error_callback: (err) => {
      const pending = pendingTokenResolvers;
      pendingTokenResolvers = [];
      pending.forEach((p) =>
        p.reject(new Error(friendlyAuthError(err.message)))
      );
    },
  });
  return tokenClient;
}

/** 取得有效 access token；必要時觸發（靜默或彈窗）授權 */
export async function getAccessToken(): Promise<string> {
  if (state.status === "unconfigured") {
    throw new Error("尚未設定 Google Client ID");
  }
  if (accessToken && Date.now() < tokenExpiresAt) return accessToken;
  const client = await ensureTokenClient();
  return new Promise<string>((resolve, reject) => {
    pendingTokenResolvers.push({ resolve, reject });
    if (pendingTokenResolvers.length === 1) {
      // 已授權過的帳號通常會靜默通過；否則彈出授權視窗
      client.requestAccessToken({ prompt: "" });
    }
  });
}

/* ---------- 連接 / 中斷 ---------- */

export async function connectGoogle(): Promise<void> {
  if (state.status === "unconfigured") return;
  setState({ status: "connecting", error: undefined });
  try {
    const token = await getAccessToken();
    const resp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error("讀取帳號資訊失敗");
    const info = (await resp.json()) as { name?: string; email?: string; picture?: string };
    setState({
      status: "connected",
      profile: {
        name: info.name ?? info.email ?? "Google 使用者",
        email: info.email ?? "",
        picture: info.picture,
      },
    });
  } catch (e) {
    accessToken = null;
    setState({
      status: "disconnected",
      profile: null,
      error: e instanceof Error ? e.message : "連接失敗",
    });
    throw e;
  }
}

export function disconnectGoogle() {
  const token = accessToken;
  accessToken = null;
  tokenExpiresAt = 0;
  if (token) {
    try {
      window.google?.accounts?.oauth2?.revoke(token);
    } catch {
      /* noop */
    }
  }
  setState({ status: "disconnected", profile: null, error: undefined });
}
