"use client";

/* ============================================================
   React hooks — 以 useSyncExternalStore 綁定 storage
   SSR 期間回傳空集合，client hydrate 後讀取 localStorage
   ============================================================ */

import { useSyncExternalStore } from "react";
import type { Board, Game, Roster, Settings, Wall } from "./types";
import {
  type CollectionKey,
  getCollection,
  getSettings,
  subscribe,
} from "./storage";

type CollectionMap = {
  rosters: Roster;
  boards: Board;
  games: Game;
  walls: Wall;
};

const EMPTY: never[] = [];

/** 訂閱整個集合（列表頁用） */
export function useCollection<K extends CollectionKey>(
  key: K
): CollectionMap[K][] {
  return useSyncExternalStore(
    subscribe,
    () => getCollection(key),
    () => EMPTY as CollectionMap[K][]
  );
}

/** 訂閱單一項目（編輯頁用） */
export function useItem<K extends CollectionKey>(
  key: K,
  id: string | undefined
): CollectionMap[K] | undefined {
  const items = useCollection(key);
  return id ? items.find((i) => i.id === id) : undefined;
}

const SERVER_SETTINGS: Settings = { theme: "system" };

/** 全站設定 */
export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, () => SERVER_SETTINGS);
}

/** localStorage 資料只在 client 存在——用來 gate「載入中/空狀態」誤判 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}
