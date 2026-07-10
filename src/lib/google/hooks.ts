"use client";

import { useSyncExternalStore } from "react";
import {
  getGoogleAuthState,
  subscribeGoogleAuth,
  type GoogleAuthState,
} from "./auth";

const SERVER_STATE: GoogleAuthState = { status: "unconfigured", profile: null };

export function useGoogleAuth(): GoogleAuthState {
  return useSyncExternalStore(
    subscribeGoogleAuth,
    getGoogleAuthState,
    () => SERVER_STATE
  );
}
