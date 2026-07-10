"use client";

/* ============================================================
   教材匯入 — 把 PDF / DOCX / PPT(X) 轉成逐頁圖片
   - PDF：pdfjs-dist 於瀏覽器端逐頁渲染成 JPEG dataURL
   - DOCX / PPT(X)：無可靠的純前端渲染器 → 已連接 Google 時，
     上傳到 Drive 觸發格式轉換，再以 PDF 匯出走同一條 pdf.js 管線
     （drive.file scope 可存取自己上傳的檔案）
   ============================================================ */

import { getAccessToken } from "./google/auth";

export interface MaterialPage {
  dataUrl: string; // JPEG dataURL
  w: number;
  h: number;
}

/** 渲染參數：投影可讀與 localStorage 容量的折衷 */
const RENDER_SCALE = 1.6; // 一般 A4 → 約 1300px 寬
const JPEG_QUALITY = 0.82;

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((pdfjs) => {
      // Turbopack 下 workerSrc 握手會靜默卡住：改自行建立 module worker
      // 交給 workerPort（同一份 pdfjs-dist 資產，版本必然一致）
      const worker = new Worker(
        new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
        { type: "module" }
      );
      pdfjs.GlobalWorkerOptions.workerPort = worker;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

/** PDF（ArrayBuffer）→ 逐頁 JPEG dataURL */
export async function pdfToPages(
  data: ArrayBuffer,
  onProgress?: (done: number, total: number) => void
): Promise<MaterialPage[]> {
  console.log("[mat] loading pdfjs…");
  const pdfjs = await loadPdfjs();
  console.log("[mat] pdfjs loaded, version:", pdfjs.version, "port:", !!pdfjs.GlobalWorkerOptions.workerPort);
  // useSystemFonts：非內嵌的標準 14 字體改用系統字體，
  // 避免 render 卡在 standardFontDataUrl 資源抓取
  const loadingTask = pdfjs.getDocument({ data, useSystemFonts: true });
  loadingTask.promise.then(
    () => console.log("[mat] getDocument resolved"),
    (e) => console.log("[mat] getDocument REJECTED:", e?.message)
  );
  const doc = await loadingTask.promise;
  const pages: MaterialPage[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d")!;
    console.log("[mat] rendering page", i, canvas.width, "x", canvas.height);
    // intent:'print'：不走 requestAnimationFrame 分段排程（部分內嵌/背景環境 rAF 不觸發會使 display intent 懸置）
    const task = page.render({ canvas, canvasContext: ctx, viewport, intent: "print" });
    task.promise.then(
      () => console.log("[mat] page", i, "rendered"),
      (e) => console.log("[mat] page", i, "render REJECTED:", e?.message)
    );
    await task.promise;
    pages.push({
      dataUrl: canvas.toDataURL("image/jpeg", JPEG_QUALITY),
      w: canvas.width,
      h: canvas.height,
    });
    onProgress?.(i, doc.numPages);
    page.cleanup();
  }
  await loadingTask.destroy();
  return pages;
}

/* ---------- DOCX / PPT(X) → 經 Google Drive 轉檔為 PDF ---------- */

const CONVERT_TARGETS: Record<string, string> = {
  doc: "application/vnd.google-apps.document",
  docx: "application/vnd.google-apps.document",
  ppt: "application/vnd.google-apps.presentation",
  pptx: "application/vnd.google-apps.presentation",
};

export function fileKind(name: string): "pdf" | "docx" | "pptx" | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (ext === "doc" || ext === "docx") return "docx";
  if (ext === "ppt" || ext === "pptx") return "pptx";
  return null;
}

/** 透過 Drive 把 Office 檔轉成 PDF bytes（需已連接 Google）；轉完即刪暫存檔 */
export async function officeToPdfViaDrive(file: File): Promise<ArrayBuffer> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const target = CONVERT_TARGETS[ext];
  if (!target) throw new Error(`不支援的格式：.${ext}`);
  const token = await getAccessToken();

  // multipart 上傳＋觸發轉檔
  const boundary = `jcs${Date.now()}`;
  const body = new Blob(
    [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
      JSON.stringify({ name: `jcs-convert-${file.name}`, mimeType: target }),
      `\r\n--${boundary}\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`,
      file,
      `\r\n--${boundary}--`,
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );
  const up = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body }
  );
  if (!up.ok) throw new Error(`Drive 轉檔上傳失敗（${up.status}）`);
  const { id } = (await up.json()) as { id: string };

  try {
    const ex = await fetch(
      `https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=application/pdf`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!ex.ok) throw new Error(`Drive PDF 匯出失敗（${ex.status}）`);
    return await ex.arrayBuffer();
  } finally {
    // 清掉暫存轉檔（失敗不影響結果）
    fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
}

/* ---------- Google Picker（雲端來源選檔）---------- */

export const GOOGLE_PICKER_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";

declare global {
  interface Window {
    gapi?: { load: (api: string, cb: () => void) => void };
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Picker 掛在 GIS 的 window.google 命名空間下（auth.ts 已宣告該型別，這裡以 any 存取 picker 分支）
function pickerNs(): any {
  return (window as unknown as { google?: any }).google?.picker;
}

let pickerReady: Promise<void> | null = null;

function loadPicker(): Promise<void> {
  if (pickerNs()) return Promise.resolve();
  if (pickerReady) return pickerReady;
  pickerReady = new Promise((resolve, reject) => {
    const done = () => window.gapi!.load("picker", () => resolve());
    if (window.gapi) return done();
    const s = document.createElement("script");
    s.src = "https://apis.google.com/js/api.js";
    s.async = true;
    s.onload = done;
    s.onerror = () => {
      pickerReady = null;
      reject(new Error("無法載入 Google Picker"));
    };
    document.head.appendChild(s);
  });
  return pickerReady;
}

export interface PickedDriveFile {
  id: string;
  name: string;
  mimeType: string;
}

/** 開啟 Google Picker 選一個檔案（PDF / Office / 圖片依 views 而定） */
export async function pickDriveFile(
  mimeTypes: string
): Promise<PickedDriveFile | null> {
  if (!GOOGLE_PICKER_API_KEY) throw new Error("尚未設定 Google API Key（NEXT_PUBLIC_GOOGLE_API_KEY）");
  const token = await getAccessToken();
  await loadPicker();
  const picker = pickerNs();
  return new Promise((resolve) => {
    const view = new picker.DocsView(picker.ViewId.DOCS).setMimeTypes(mimeTypes);
    new picker.PickerBuilder()
      .setOAuthToken(token)
      .setDeveloperKey(GOOGLE_PICKER_API_KEY)
      .addView(view)
      .setCallback((data: any) => {
        if (data.action === picker.Action.PICKED) {
          const d = data.docs?.[0];
          resolve(d ? { id: d.id, name: d.name, mimeType: d.mimeType } : null);
        } else if (data.action === picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .build()
      .setVisible(true);
  });
}

/** 下載 Picker 選到的 Drive 檔案內容（Google 文件類自動匯出為 PDF） */
export async function downloadDriveFile(
  f: PickedDriveFile
): Promise<{ data: ArrayBuffer; kind: "pdf" | "binary" }> {
  const token = await getAccessToken();
  const isGoogleDoc = f.mimeType.startsWith("application/vnd.google-apps");
  const url = isGoogleDoc
    ? `https://www.googleapis.com/drive/v3/files/${f.id}/export?mimeType=application/pdf`
    : `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!resp.ok) throw new Error(`下載 Drive 檔案失敗（${resp.status}）`);
  return {
    data: await resp.arrayBuffer(),
    kind: isGoogleDoc || f.mimeType === "application/pdf" ? "pdf" : "binary",
  };
}
