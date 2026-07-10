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
  return (
    <section
      aria-label="數位敘事力期刊社群"
      className={compact ? "flex flex-col gap-2" : "flex flex-col gap-4"}
    >
      <div>
        <p className={compact ? "text-xs font-semibold text-text" : "text-base font-semibold text-text"}>
          數位敘事力期刊
        </p>
        <p className={compact ? "text-[12px] leading-relaxed text-text-muted" : "text-sm text-text-muted"}>
          Journal of Digital Narrative 出品
        </p>
      </div>
      <div className={compact ? "grid grid-cols-4 gap-2" : "grid gap-2 sm:grid-cols-2"}>
        {SOCIAL_LINKS.map(({ label, shortLabel, href, icon: Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={`前往數位敘事力期刊 ${label}（另開新分頁）`}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-control bg-surface-raised px-3 text-sm font-medium text-text transition-[transform,background-color,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:bg-hover hover:[box-shadow:var(--shadow-raised)] active:translate-y-0 ${
              compact ? "min-w-11 px-2" : "justify-start"
            }`}
          >
            <Icon className="size-4.5 shrink-0" aria-hidden />
            <span>{compact ? shortLabel : label}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
