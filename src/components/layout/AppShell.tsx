"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Presentation,
  Gamepad2,
  LayoutGrid,
  Users,
  Settings,
  Home,
  Menu,
  X,
  Moon,
  Sun,
  MonitorSmartphone,
} from "lucide-react";
import { useSettings } from "@/lib/hooks";
import { setSettings } from "@/lib/storage";
import { JdnBrandLinks } from "@/components/brand/JdnBrandLinks";

const NAV = [
  { href: "/", label: "總覽", icon: Home },
  { href: "/boards", label: "教學黑板", icon: Presentation, color: "var(--board)" },
  { href: "/games", label: "互動視覺化", icon: Gamepad2, color: "var(--game)" },
  { href: "/walls", label: "成果收集牆", icon: LayoutGrid, color: "var(--wall)" },
  { href: "/rosters", label: "學生名單", icon: Users, color: "var(--roster)" },
  { href: "/settings", label: "設定", icon: Settings },
] as const;

function ThemeToggle() {
  const settings = useSettings();
  const order = ["system", "light", "dark"] as const;
  const next = order[(order.indexOf(settings.theme) + 1) % order.length];
  const Icon =
    settings.theme === "dark" ? Moon : settings.theme === "light" ? Sun : MonitorSmartphone;
  const label =
    settings.theme === "dark" ? "深色" : settings.theme === "light" ? "淺色" : "跟隨系統";
  return (
    <button
      onClick={() => setSettings({ theme: next })}
      className="flex min-h-11 w-full cursor-pointer touch-manipulation items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-muted transition-colors hover:bg-hover"
      aria-label={`主題：${label}，點擊切換`}
    >
      <Icon className="size-4.5 shrink-0" aria-hidden />
      <span>主題：{label}</span>
    </button>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1" aria-label="主導覽">
      {NAV.map(({ href, label, icon: Icon, ...rest }) => {
        const color = "color" in rest ? (rest.color as string) : undefined;
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 touch-manipulation items-center gap-3 rounded-md px-3 py-2.5 text-[15px] transition-[transform,background-color,color] duration-200 active:scale-[0.99] ${
              active
                ? "bg-text font-semibold text-on-dark [box-shadow:var(--shadow-inset)]"
                : "text-text hover:bg-hover"
            }`}
          >
            <Icon
              className="size-4.5 shrink-0"
              style={active ? undefined : color ? { color } : undefined}
              aria-hidden
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** 全站外殼：桌機側欄 / 行動裝置抽屜。投影模式（?present=1）的頁面不使用此殼。 */
export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        requestAnimationFrame(() => menuButtonRef.current?.focus());
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function closeDrawer() {
    setOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }

  return (
    <div className="flex min-h-dvh">
      <a className="skip-link" href="#main-content">
        跳至主要內容
      </a>
      {/* 桌機側欄 */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-border bg-surface px-4 py-6 md:flex">
        <Link href="/" className="flex min-h-11 items-center gap-2.5 px-2">
          <span
            aria-hidden
            className="flex size-9 items-center justify-center rounded-lg bg-text text-on-dark [box-shadow:var(--shadow-inset)]"
          >
            <Presentation className="size-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">課堂工作站</span>
        </Link>
        <NavLinks />
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <ThemeToggle />
          <p className="px-3 text-xs leading-relaxed text-text-muted">
            資料只存在此瀏覽器
            <br />
            記得定期匯出備份
          </p>
          <div className="border-t border-border px-1 pt-3">
            <JdnBrandLinks compact />
          </div>
        </div>
      </aside>

      {/* 行動裝置頂欄 */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-surface px-4 md:hidden">
        <Link href="/" className="flex min-h-11 items-center gap-2">
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-md bg-text text-on-dark"
          >
            <Presentation className="size-4.5" />
          </span>
          <span className="font-bold">課堂工作站</span>
        </Link>
        <button
          ref={menuButtonRef}
          onClick={() => setOpen(true)}
          aria-label="開啟選單"
          className="flex size-11 cursor-pointer items-center justify-center rounded-md hover:bg-hover"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {/* 行動裝置抽屜 */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal aria-label="主選單">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeDrawer}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 bg-surface px-4 py-6">
            <div className="flex items-center justify-between px-2">
              <span className="text-lg font-bold">課堂工作站</span>
              <button
                ref={closeButtonRef}
                onClick={closeDrawer}
                aria-label="關閉選單"
                className="flex size-11 cursor-pointer items-center justify-center rounded-md hover:bg-hover"
              >
                <X className="size-5" />
              </button>
            </div>
            <NavLinks onNavigate={closeDrawer} />
            <ThemeToggle />
            <div className="border-t border-border px-2 pt-4">
              <JdnBrandLinks compact />
            </div>
          </div>
        </div>
      )}

      {/* 主內容 */}
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 px-4 pb-16 pt-20 md:px-10 md:pt-10">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
