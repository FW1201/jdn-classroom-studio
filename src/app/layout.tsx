import type { Metadata, Viewport } from "next";
import { Nunito, Noto_Sans_TC } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const notoSansTC = Noto_Sans_TC({
  variable: "--font-noto-tc",
  weight: ["400", "500", "700", "900"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "JDN 課堂工作站｜數位敘事力期刊",
  description:
    "數位敘事力期刊出品。教師單機、投影導向的課堂工作站：教學黑板、互動視覺化、成果收集牆，資料只存在你的瀏覽器。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ed" },
    { media: "(prefers-color-scheme: dark)", color: "#141310" },
  ],
};

// 於 hydration 前套用主題，避免閃爍（FOUC）
const themeScript = `(function(){try{var t=localStorage.getItem('jcs:theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant"
      className={`${nunito.variable} ${notoSansTC.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
