/* ============================================================
   共用資料層 — localStorage store（無登入、單機）
   - 四集合 CRUD + settings
   - useSyncExternalStore 訂閱（跨元件即時同步）
   - 容量守門（~5MB）
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

const PREFIX = "jcs:";
const SETTINGS_KEY = `${PREFIX}settings`;
const META_KEY = `${PREFIX}meta`;
const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024; // 保守估 5MB
export const STORAGE_WARN_RATIO = 0.85;

const isBrowser = typeof window !== "undefined";

/* ---------- 訂閱機制 ---------- */

const listeners = new Set<() => void>();
// 快取每個 key 的解析結果，維持 getSnapshot 參照穩定
const cache = new Map<string, unknown>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/* ---------- 基本讀寫 ---------- */

function read<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  if (cache.has(key)) return cache.get(key) as T;
  try {
    const raw = window.localStorage.getItem(key);
    const value = raw ? (JSON.parse(raw) as T) : fallback;
    cache.set(key, value);
    return value;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!isBrowser) return;
  const serialized = JSON.stringify(value);
  window.localStorage.setItem(key, serialized);
  cache.set(key, value);
  ensureMeta();
  emit();
}

function ensureMeta() {
  try {
    if (!window.localStorage.getItem(META_KEY)) {
      window.localStorage.setItem(
        META_KEY,
        JSON.stringify({ schemaVersion: SCHEMA_VERSION })
      );
    }
  } catch {
    /* noop */
  }
}

/* ---------- 容量守門 ---------- */

export function estimateUsageBytes(): number {
  if (!isBrowser) return 0;
  let total = 0;
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (!k || !k.startsWith(PREFIX)) continue;
    const v = window.localStorage.getItem(k) ?? "";
    total += (k.length + v.length) * 2; // UTF-16
  }
  return total;
}

export function usageRatio(): number {
  return estimateUsageBytes() / STORAGE_LIMIT_BYTES;
}

export class StorageQuotaError extends Error {
  constructor() {
    super("儲存空間不足：請先匯出備份並刪除舊資料，或縮小圖片後再試。");
    this.name = "StorageQuotaError";
  }
}

function guardedWrite<T>(key: string, value: T) {
  const incoming = JSON.stringify(value).length * 2;
  if (estimateUsageBytes() + incoming > STORAGE_LIMIT_BYTES) {
    throw new StorageQuotaError();
  }
  try {
    write(key, value);
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      throw new StorageQuotaError();
    }
    throw e;
  }
}

/* ---------- 集合 CRUD ---------- */

const EMPTY: unknown[] = [];

export function getCollection<K extends CollectionKey>(
  key: K
): CollectionMap[K][] {
  return read(`${PREFIX}${key}`, EMPTY as CollectionMap[K][]);
}

export function setCollection<K extends CollectionKey>(
  key: K,
  items: CollectionMap[K][]
) {
  guardedWrite(`${PREFIX}${key}`, items);
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

const DEFAULT_SETTINGS: Settings = { theme: "system" };

export function getSettings(): Settings {
  return read(SETTINGS_KEY, DEFAULT_SETTINGS);
}

export function setSettings(patch: Partial<Settings>) {
  const next = { ...getSettings(), ...patch };
  write(SETTINGS_KEY, next);
  // 主題另存一份輕量 key，供 layout 的防閃爍 script 讀取
  if (patch.theme) {
    if (patch.theme === "system") {
      window.localStorage.removeItem(`${PREFIX}theme`);
      document.documentElement.removeAttribute("data-theme");
    } else {
      window.localStorage.setItem(`${PREFIX}theme`, patch.theme);
      document.documentElement.setAttribute("data-theme", patch.theme);
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
  const keys: CollectionKey[] = ["rosters", "boards", "games", "walls"];
  for (const key of keys) {
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
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(PREFIX)) keys.push(k);
  }
  keys.forEach((k) => window.localStorage.removeItem(k));
  cache.clear();
  emit();
}
