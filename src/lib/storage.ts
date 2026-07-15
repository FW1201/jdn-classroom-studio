"use client";

/* ============================================================
   共用資料層 — IndexedDB 後端 + 記憶體快取（無登入、單機）
   - 對外 API 全部維持同步（讀取皆從記憶體快取），元件端零改動
   - 實際持久化非同步寫入 IndexedDB，容量從 localStorage 的 ~5MB
     提升到瀏覽器實際配額（通常數百 MB 以上，視裝置剩餘空間而定）
   - 首次啟動會自動把舊版 localStorage 資料一次性搬進 IndexedDB
   ============================================================ */

import { nanoid } from "nanoid";
import type {
  Board,
  ExportBundle,
  Game,
  Roster,
  Settings,
  Wall,
} from "./types";
import { SCHEMA_VERSION } from "./types";

export type CollectionKey = "rosters" | "boards" | "games" | "walls";

type CollectionMap = {
  rosters: Roster;
  boards: Board;
  games: Game;
  walls: Wall;
};

const LS_PREFIX = "jcs:"; // 舊版 localStorage key 前綴（僅搬遷用途，之後不再寫入）
const DB_NAME = "jcs-store";
const DB_VERSION = 1;
const COLLECTION_STORES = ["rosters", "boards", "games", "walls"] as const;
const ALL_STORES = [...COLLECTION_STORES, "settings", "meta"] as const;
const RECORD_KEY = "data"; // 每個 store 整包存成單一 record（沿用舊版「一集合一 blob」模型）

const isBrowser = typeof window !== "undefined";

/* ---------- 訂閱機制（同步讀取 + React 重繪）---------- */

const listeners = new Set<() => void>();
const cache = new Map<string, unknown>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/* ---------- IndexedDB 基礎操作 ---------- */

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const name of ALL_STORES) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readonly");
        const req = tx.objectStore(store).get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      })
  );
}

function idbPut(store: string, key: string, value: unknown): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        tx.objectStore(store).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

function idbClearAll(): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(ALL_STORES, "readwrite");
        ALL_STORES.forEach((s) => tx.objectStore(s).clear());
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

/* ---------- 初始化：搬遷舊資料 → 讀入記憶體快取 ---------- */

interface MetaRecord {
  migrated?: boolean;
  schemaVersion: number;
}

async function migrateFromLocalStorage(): Promise<void> {
  if (!isBrowser) return;
  try {
    for (const key of COLLECTION_STORES) {
      const raw = window.localStorage.getItem(`${LS_PREFIX}${key}`);
      if (raw) await idbPut(key, RECORD_KEY, JSON.parse(raw));
    }
    const rawSettings = window.localStorage.getItem(`${LS_PREFIX}settings`);
    if (rawSettings) await idbPut("settings", RECORD_KEY, JSON.parse(rawSettings));
  } catch {
    // 舊資料格式損毀時略過搬遷，不阻擋新架構啟用（不刪除 localStorage，保留手動救援可能）
  }
  await idbPut("meta", RECORD_KEY, { migrated: true, schemaVersion: SCHEMA_VERSION });
}

let readyPromise: Promise<void> | null = null;

/** 等待 IndexedDB 完成初始化（含舊資料搬遷）；元件掛載時可視需要 await */
export function whenReady(): Promise<void> {
  if (!readyPromise) readyPromise = init();
  return readyPromise;
}

async function init(): Promise<void> {
  if (!isBrowser) return;
  const meta = await idbGet<MetaRecord>("meta", RECORD_KEY);
  if (!meta?.migrated) {
    await migrateFromLocalStorage();
  }
  for (const key of COLLECTION_STORES) {
    const data = (await idbGet<unknown[]>(key, RECORD_KEY)) ?? [];
    cache.set(`${LS_PREFIX}${key}`, data);
  }
  const settings = (await idbGet<Settings>("settings", RECORD_KEY)) ?? DEFAULT_SETTINGS;
  cache.set(SETTINGS_CACHE_KEY, settings);
  await refreshQuotaEstimate();
  emit();
}

if (isBrowser) void whenReady();

/* ---------- 容量估算（真實瀏覽器配額，取代舊版寫死的 5MB）---------- */

let cachedUsage = 0;
let cachedQuota = 5 * 1024 * 1024; // 尚未取得真實配額前的保守預設值

async function refreshQuotaEstimate(): Promise<void> {
  if (!isBrowser || !navigator.storage?.estimate) return;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    if (typeof usage === "number") cachedUsage = usage;
    if (typeof quota === "number" && quota > 0) cachedQuota = quota;
  } catch {
    /* 部分瀏覽器（如 Safari 私密瀏覽）可能不支援，維持預設值 */
  }
}

/** 目前已用位元組數（同步讀取最後一次量測結果，非即時） */
export function estimateUsageBytes(): number {
  return cachedUsage;
}

/** 瀏覽器授予本站的總配額（同步讀取最後一次量測結果） */
export function estimateQuotaBytes(): number {
  return cachedQuota;
}

export class StorageQuotaError extends Error {
  constructor() {
    super("儲存空間不足：請先匯出備份並刪除舊資料，或縮小圖片後再試。");
    this.name = "StorageQuotaError";
  }
}

function guardIncomingSize(incomingBytes: number) {
  // 用最後一次量測到的配額/用量做同步守門；IndexedDB 實際配額遠大於舊版 localStorage 的 5MB，
  // 但仍保留守門避免裝置本身空間見底時無預警寫入失敗
  if (cachedUsage + incomingBytes > cachedQuota) {
    throw new StorageQuotaError();
  }
}

/* ---------- 集合 CRUD（同步讀寫記憶體快取；非同步落盤到 IndexedDB）---------- */

const EMPTY: unknown[] = [];

export function getCollection<K extends CollectionKey>(
  key: K
): CollectionMap[K][] {
  return (cache.get(`${LS_PREFIX}${key}`) as CollectionMap[K][]) ?? (EMPTY as CollectionMap[K][]);
}

export function setCollection<K extends CollectionKey>(
  key: K,
  items: CollectionMap[K][]
) {
  const incomingBytes = JSON.stringify(items).length * 2; // UTF-16 粗估
  guardIncomingSize(incomingBytes);
  cache.set(`${LS_PREFIX}${key}`, items);
  emit();
  idbPut(key, RECORD_KEY, items)
    .then(() => {
      cachedUsage += incomingBytes;
      void refreshQuotaEstimate();
    })
    .catch((e) => {
      console.error(`[jcs] 寫入 IndexedDB 失敗（${key}）：`, e);
    });
}

export function getItem<K extends CollectionKey>(
  key: K,
  id: string
): CollectionMap[K] | undefined {
  return getCollection(key).find((item) => item.id === id);
}

export function createItem<K extends CollectionKey>(
  key: K,
  data: Omit<CollectionMap[K], "id" | "createdAt" | "updatedAt">
): CollectionMap[K] {
  const now = Date.now();
  const item = { ...data, id: nanoid(10), createdAt: now, updatedAt: now } as CollectionMap[K];
  setCollection(key, [item, ...getCollection(key)]);
  return item;
}

export function updateItem<K extends CollectionKey>(
  key: K,
  id: string,
  patch: Partial<CollectionMap[K]>
): CollectionMap[K] | undefined {
  let updated: CollectionMap[K] | undefined;
  const next = getCollection(key).map((item) => {
    if (item.id !== id) return item;
    updated = { ...item, ...patch, id, updatedAt: Date.now() };
    return updated;
  });
  if (updated) setCollection(key, next);
  return updated;
}

export function deleteItem<K extends CollectionKey>(key: K, id: string) {
  setCollection(
    key,
    getCollection(key).filter((item) => item.id !== id)
  );
}

/* ---------- Settings ---------- */

const SETTINGS_CACHE_KEY = `${LS_PREFIX}settings`;
const DEFAULT_SETTINGS: Settings = { theme: "system" };

export function getSettings(): Settings {
  return (cache.get(SETTINGS_CACHE_KEY) as Settings) ?? DEFAULT_SETTINGS;
}

export function setSettings(patch: Partial<Settings>) {
  const next = { ...getSettings(), ...patch };
  cache.set(SETTINGS_CACHE_KEY, next);
  emit();
  idbPut("settings", RECORD_KEY, next).catch((e) => {
    console.error("[jcs] 寫入設定失敗：", e);
  });
  if (patch.theme) {
    if (patch.theme === "system") {
      document.documentElement.removeAttribute("data-theme");
      window.localStorage.removeItem(`${LS_PREFIX}theme`);
    } else {
      document.documentElement.setAttribute("data-theme", patch.theme);
      // 主題另存一份輕量 key 於 localStorage，供 layout 的防閃爍 script 同步讀取
      window.localStorage.setItem(`${LS_PREFIX}theme`, patch.theme);
    }
  }
}

/* ---------- 全站匯入匯出 ---------- */

export function exportAll(): ExportBundle {
  return {
    app: "jdn-classroom-studio",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: Date.now(),
    rosters: getCollection("rosters"),
    boards: getCollection("boards"),
    games: getCollection("games"),
    walls: getCollection("walls"),
    settings: getSettings(),
  };
}

export function downloadExport() {
  const bundle = exportAll();
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `jdn-classroom-studio-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function validateBundle(data: unknown): data is ExportBundle {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    d.app === "jdn-classroom-studio" &&
    typeof d.schemaVersion === "number" &&
    Array.isArray(d.rosters) &&
    Array.isArray(d.boards) &&
    Array.isArray(d.games) &&
    Array.isArray(d.walls)
  );
}

export function importAll(bundle: ExportBundle, mode: "merge" | "replace") {
  for (const key of COLLECTION_STORES) {
    const incoming = bundle[key] as CollectionMap[typeof key][];
    if (mode === "replace") {
      setCollection(key, incoming);
    } else {
      const existing = getCollection(key);
      const existingIds = new Set(existing.map((i) => i.id));
      const merged = [
        ...existing,
        ...incoming.filter((i) => !existingIds.has(i.id)),
      ];
      setCollection(key, merged);
    }
  }
}

export function clearAll() {
  if (!isBrowser) return;
  cache.clear();
  // 舊版 localStorage 殘留（若尚未搬遷或搬遷後留存）一併清除
  const lsKeys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(LS_PREFIX)) lsKeys.push(k);
  }
  lsKeys.forEach((k) => window.localStorage.removeItem(k));
  idbClearAll()
    .then(() => {
      cachedUsage = 0;
      readyPromise = null; // 允許下次 whenReady() 重新初始化（例如重新播種示範資料）
      dbPromise = null;
      return whenReady();
    })
    .catch((e) => console.error("[jcs] 清除 IndexedDB 失敗：", e));
}
