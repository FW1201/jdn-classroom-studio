"use client";

/* ============================================================
   Google Drive REST（fetch 版，無 SDK）
   - appDataFolder 雲端備份：上傳 / 列表 / 下載 / 滾動保留 5 份
   - 檔案匯出：files.create multipart，可指定 Google 目標 mimeType
     （HTML→Docs/Slides、CSV→Sheets 由 Drive 自動轉檔）
   權限僅 drive.file + drive.appdata（非敏感）
   ============================================================ */

import { getAccessToken } from "./auth";

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";

export const GOOGLE_MIME = {
  doc: "application/vnd.google-apps.document",
  sheet: "application/vnd.google-apps.spreadsheet",
  slides: "application/vnd.google-apps.presentation",
} as const;

async function driveFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  const resp = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Drive API ${resp.status}：${body.slice(0, 200)}`);
  }
  return resp;
}

/** multipart 上傳（metadata + 內容），可透過 metadata.mimeType 觸發 Google 格式轉檔 */
async function multipartUpload(
  metadata: Record<string, unknown>,
  content: Blob,
  fields = "id,name,webViewLink"
): Promise<{ id: string; name: string; webViewLink?: string }> {
  const boundary = `jcs${Date.now()}`;
  const body = new Blob(
    [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
      JSON.stringify(metadata),
      `\r\n--${boundary}\r\nContent-Type: ${content.type}\r\n\r\n`,
      content,
      `\r\n--${boundary}--`,
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );
  const resp = await driveFetch(
    `${UPLOAD}/files?uploadType=multipart&fields=${encodeURIComponent(fields)}`,
    { method: "POST", body }
  );
  return resp.json();
}

/* ---------- appDataFolder 備份 ---------- */

export interface BackupFileMeta {
  id: string;
  name: string;
  size?: string;
  modifiedTime: string;
}

const BACKUP_PREFIX = "jcs-backup";
const KEEP_BACKUPS = 5;

export async function listBackups(): Promise<BackupFileMeta[]> {
  const q = encodeURIComponent(`name contains '${BACKUP_PREFIX}'`);
  const resp = await driveFetch(
    `${API}/files?spaces=appDataFolder&q=${q}&orderBy=modifiedTime desc&fields=files(id,name,size,modifiedTime)&pageSize=20`
  );
  const data = (await resp.json()) as { files?: BackupFileMeta[] };
  return data.files ?? [];
}

export async function uploadBackup(json: string): Promise<BackupFileMeta> {
  const stamp = new Date()
    .toISOString()
    .replace(/[:T]/g, "-")
    .slice(0, 16);
  const created = await multipartUpload(
    { name: `${BACKUP_PREFIX}-${stamp}.json`, parents: ["appDataFolder"] },
    new Blob([json], { type: "application/json" }),
    "id,name,size,modifiedTime"
  );
  // 滾動保留最近 KEEP_BACKUPS 份
  try {
    const all = await listBackups();
    for (const old of all.slice(KEEP_BACKUPS)) {
      await driveFetch(`${API}/files/${old.id}`, { method: "DELETE" });
    }
  } catch {
    /* 清舊檔失敗不影響備份本身 */
  }
  return created as unknown as BackupFileMeta;
}

export async function downloadBackup(id: string): Promise<string> {
  const resp = await driveFetch(`${API}/files/${id}?alt=media`);
  return resp.text();
}

/* ---------- 匯出到 Drive（含 Google 格式轉檔）---------- */

export interface ExportResult {
  id: string;
  name: string;
  webViewLink?: string;
}

/** CSV → Google Sheets */
export function exportCsvAsSheet(name: string, csv: string): Promise<ExportResult> {
  // 加 BOM 讓中文在轉檔時正確判讀為 UTF-8
  return multipartUpload(
    { name, mimeType: GOOGLE_MIME.sheet },
    new Blob(["﻿" + csv], { type: "text/csv" })
  );
}

/** HTML → Google Docs */
export function exportHtmlAsDoc(name: string, html: string): Promise<ExportResult> {
  return multipartUpload(
    { name, mimeType: GOOGLE_MIME.doc },
    new Blob([html], { type: "text/html" })
  );
}

/** HTML → Google Slides（轉檔保真度有限，失敗時呼叫端 fallback） */
export function exportHtmlAsSlides(name: string, html: string): Promise<ExportResult> {
  return multipartUpload(
    { name, mimeType: GOOGLE_MIME.slides },
    new Blob([html], { type: "text/html" })
  );
}

/** 原樣上傳檔案（如互動視覺化 HTML） */
export function exportRawFile(
  name: string,
  content: string,
  mime = "text/html"
): Promise<ExportResult> {
  return multipartUpload({ name }, new Blob([content], { type: mime }));
}

/* ---------- Classroom 分享（免 API、免驗證）---------- */

function classroomShareUrl(url: string): string {
  return `https://classroom.google.com/share?url=${encodeURIComponent(url)}`;
}

export function openClassroomShare(url: string) {
  window.open(classroomShareUrl(url), "_blank", "noopener,width=680,height=640");
}
