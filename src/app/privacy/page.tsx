import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "隱私權政策｜JDN 課堂工作站",
  description: "JDN 課堂工作站的資料處理與隱私權政策說明。",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-3 p-6">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-text-muted">
        {children}
      </div>
    </Card>
  );
}

export default function PrivacyPage() {
  const updated = "2026 年 7 月";
  return (
    <AppShell>
      <PageHeader
        title="隱私權政策"
        desc={`最後更新：${updated}。適用於 JDN 課堂工作站（jdn-classroom-studio.vercel.app）。`}
      />
      <div className="flex flex-col gap-4">
        <Section title="一、核心原則：本機優先，資料不上傳">
          <p>
            本工具預設<strong className="text-text">無需登入、無需帳號</strong>。你在教學黑板、互動視覺化、成果收集牆、學生名單中建立的所有資料，
            只會儲存在你目前使用瀏覽器的本機儲存空間（IndexedDB）。這些資料<strong className="text-text">不會被傳送到我們的伺服器</strong>——
            事實上，本工具沒有後端伺服器，也沒有資料庫。清除瀏覽器資料、換裝置或換瀏覽器都會導致資料遺失，請養成使用「設定 → 匯出備份」的習慣。
          </p>
        </Section>

        <Section title="二、Google 雲端同步（選配功能）">
          <p>
            若你選擇在「設定」頁點擊「連接 Google」，本工具會透過 Google 官方的 OAuth 2.0 流程，向你請求以下權限：
          </p>
          <ul className="list-disc pl-5">
            <li>
              <code className="rounded bg-surface px-1.5 py-0.5 text-xs">drive.file</code>
              ：僅能查看、建立、修改「由本工具建立」的 Google Drive 檔案——無法讀取、瀏覽或修改你雲端硬碟中其他既有的檔案。
            </li>
            <li>
              <code className="rounded bg-surface px-1.5 py-0.5 text-xs">drive.appdata</code>
              ：用於存放本工具的自動備份，存放在 Google Drive 的「應用程式資料夾」（一個對你隱藏、不會出現在雲端硬碟畫面中的專屬空間）。
            </li>
            <li>
              <code className="rounded bg-surface px-1.5 py-0.5 text-xs">userinfo.profile</code> /{" "}
              <code className="rounded bg-surface px-1.5 py-0.5 text-xs">userinfo.email</code>
              ：僅用於在介面上顯示你目前登入的姓名、大頭貼與 Email，方便你確認連接的帳號。
            </li>
          </ul>
          <p>
            連接後，授權存取權杖（access token）只存在你瀏覽器的記憶體中，重新整理頁面後即消失；我們不會將任何權杖或帳號資訊儲存到我們自己的伺服器
            （因為本工具沒有伺服器）。你可以隨時在「設定」頁點擊「中斷連接」，或直接到你的 Google 帳號權限管理頁面撤銷本工具的存取權限。
          </p>
        </Section>

        <Section title="三、我們不會做的事">
          <ul className="list-disc pl-5">
            <li>不會蒐集、儲存或分析你的個人資料、學生姓名或任何教學內容</li>
            <li>不會使用任何第三方追蹤、分析或廣告服務（無 Cookie 追蹤、無 Analytics）</li>
            <li>不會將學生資料或教學內容分享、出售給任何第三方</li>
            <li>不會讀取你 Google 雲端硬碟中「非本工具建立」的任何檔案</li>
          </ul>
        </Section>

        <Section title="四、互動視覺化的沙箱隔離">
          <p>
            「互動視覺化」模式允許你貼上 AI 生成的 HTML 程式碼並執行。這些程式碼一律在隔離的沙箱（iframe sandbox，不含
            <code className="mx-1 rounded bg-surface px-1.5 py-0.5 text-xs">allow-same-origin</code>
            權限）中執行，無法存取本工具的頁面內容、localStorage 資料，或你的瀏覽器 Cookie。
          </p>
        </Section>

        <Section title="五、聯絡我們">
          <p>
            本工具由數位敘事力期刊（Journal of Digital Narrative）出品。若你對本隱私權政策有任何疑問，或想申請刪除已連接的 Google
            授權，歡迎透過期刊社群管道與我們聯繫（詳見網站頁尾社群連結）。
          </p>
        </Section>

        <p className="text-center text-xs text-text-faint">
          <Link href="/" className="underline hover:text-text-muted">
            返回課堂工作站首頁
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
