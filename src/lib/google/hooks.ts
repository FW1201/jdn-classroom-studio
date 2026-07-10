"use client";

import { useSyncExternalStore } from "react";
import {
  GOOGLE_CLIENT_ID,
  getGoogleAuthState,
  subscribeGoogleAuth,
  type GoogleAuthState,
} from "./auth";

// 預渲染／SSR 快照：不能連網取得使用者授權狀態，但 Client ID 是否設定
// 屬建置期常數（NEXT_PUBLIC_ 已內聯），可如實反映，避免 hydration 後畫面閃爍。
const SERVER_STATE: GoogleAuthState = {
  status: GOOGLE_CLIENT_ID ? "disconnected" : "unconfigured",
  profile: null,
};

export function useGoogleAuth(): GoogleAuthState {
  return useSyncExternalStore(
    subscribeGoogleAuth,
    getGoogleAuthState,
    () => SERVER_STATE
  );
}
