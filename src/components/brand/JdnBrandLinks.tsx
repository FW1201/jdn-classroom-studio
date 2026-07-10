import { AtSign, Camera, MessageCircle, PlaySquare } from "lucide-react";

const SOCIAL_LINKS = [
  {
    label: "Facebook",
    shortLabel: "FB",
    href: "https://www.facebook.com/Journal.of.Digital.Narrative",
    icon: MessageCircle,
  },
  {
    label: "Instagram",
    shortLabel: "IG",
    href: "https://www.instagram.com/journal_of_digital_narrative/",
    icon: Camera,
  },
  {
    label: "Threads",
    shortLabel: "TH",
    href: "https://www.threads.com/@journal_of_digital_narrative",
    icon: AtSign,
  },
  {
    label: "YouTube",
    shortLabel: "YT",
    href: "https://www.youtube.com/@Journal_of_Digital_Narrative",
    icon: PlaySquare,
  },
] as const;

export function JdnBrandLinks({ compact = false }: { compact?: boolean }) {
  if (compact) {
    // 側欄空間有限：純圖示按鈕，不佔文字寬度，僅靠 aria-label / title 傳達
    return (
      <div className="flex items-center gap-1.5" role="group" aria-label="數位敘事力期刊社群">
        {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noreferrer"
            title={label}
            aria-label={`前往數位敘事力期刊 ${label}（另開新分頁）`}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-control bg-surface-raised text-text transition-[transform,background-color,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:bg-hover hover:[box-shadow:var(--shadow-raised)] active:translate-y-0"
          >
            <Icon className="size-4 shrink-0" aria-hidden />
          </a>
        ))}
      </div>
    );
  }

  return (
    <section aria-label="數位敘事力期刊社群" className="flex flex-col gap-4">
      <div>
        <p className="text-base font-semibold text-text">數位敘事力期刊</p>
        <p className="text-sm text-text-muted">Journal of Digital Narrative 出品</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={`前往數位敘事力期刊 ${label}（另開新分頁）`}
            className="inline-flex min-h-11 items-center justify-start gap-2 rounded-md border border-control bg-surface-raised px-3 text-sm font-medium text-text transition-[transform,background-color,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:bg-hover hover:[box-shadow:var(--shadow-raised)] active:translate-y-0"
          >
            <Icon className="size-4.5 shrink-0" aria-hidden />
            <span>{label}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
