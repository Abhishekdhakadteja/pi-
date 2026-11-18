// The Clinic Easy Pro badge: a holographic neon hexagon with a crowned spark, and a shimmering
// "PRO" pill. Pure SVG + CSS (classes in globals.css), so it works on server and client pages.

type Size = "sm" | "md" | "lg";

/** The hexagon emblem on its own. */
export function ProEmblem({ size = 40, id = "pro" }: { size?: number; id?: string }) {
  const g = `${id}-g`;
  const h = `${id}-h`;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="pro-emblem shrink-0" aria-hidden>
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FDE68A" />
          <stop offset=".35" stopColor="#F59E0B" />
          <stop offset=".7" stopColor="#EC4899" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
        <radialGradient id={h} cx=".5" cy=".35" r=".7">
          <stop offset="0" stopColor="#3b1d5e" />
          <stop offset="1" stopColor="#0a0618" />
        </radialGradient>
      </defs>
      <path d="M32 3l25 14.5v29L32 61 7 46.5v-29z" fill={`url(#${h})`} stroke={`url(#${g})`} strokeWidth="3" strokeLinejoin="round" />
      <path d="M32 11l18 10.5v21L32 53 14 42.5v-21z" fill="none" stroke={`url(#${g})`} strokeOpacity=".35" strokeWidth="1" />
      {/* crown */}
      <path d="M20 39l-2-14 8 6 6-10 6 10 8-6-2 14z" fill={`url(#${g})`} />
      <rect x="20" y="41" width="24" height="4" rx="2" fill={`url(#${g})`} />
      {/* AI nodes */}
      <circle cx="18" cy="25" r="2.2" fill="#FDE68A" />
      <circle cx="32" cy="21" r="2.2" fill="#FDE68A" />
      <circle cx="46" cy="25" r="2.2" fill="#FDE68A" />
    </svg>
  );
}

/** The "PRO" badge. `label` lets a page say "PRO TRIAL" or "PRO MAX". */
export function ProBadge({ size = "sm", label = "PRO" }: { size?: Size; label?: string }) {
  if (size === "lg") {
    return (
      <span className="pro-badge pro-badge-lg inline-flex items-center gap-3 rounded-2xl py-2 pl-2 pr-5" data-testid="pro-badge">
        <ProEmblem size={52} id="pro-lg" />
        <span className="flex flex-col leading-none">
          <span className="font-brand text-[10px] font-bold tracking-[0.35em] text-amber-200/80">CLINIC EASY</span>
          <span className="pro-text font-brand text-3xl font-extrabold tracking-[0.18em]">{label}</span>
        </span>
      </span>
    );
  }
  const big = size === "md";
  return (
    <span
      className={`pro-badge inline-flex shrink-0 items-center gap-1 rounded-full ${big ? "py-1 pl-1 pr-3" : "py-0.5 pl-0.5 pr-2"}`}
      data-testid="pro-badge"
    >
      <ProEmblem size={big ? 22 : 16} id={big ? "pro-md" : "pro-sm"} />
      <span className={`pro-text font-brand font-extrabold tracking-[0.2em] ${big ? "text-xs" : "text-[10px]"}`}>{label}</span>
    </span>
  );
}

/** Small lock tag for a service that needs Pro. */
export function ProLock({ text = "PRO" }: { text?: string }) {
  return (
    <span className="pro-badge inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-amber-200" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
      <span className="pro-text font-brand text-[10px] font-extrabold tracking-[0.2em]">{text}</span>
    </span>
  );
}
