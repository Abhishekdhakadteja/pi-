/**
 * Clinic Easy logo mark: a white medical cross with a "done" tick, on a teal-to-emerald tile.
 * The same drawing lives in public/brand/clinic-easy-mark.svg and src/app/icon.svg.
 */
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className="shrink-0 drop-shadow-md"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="clinic-easy-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="120" fill="url(#clinic-easy-tile)" />
      <rect width="510" height="510" x="1" y="1" rx="119" fill="none" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="2" />
      <g fill="#ffffff">
        <rect x="176" y="80" width="160" height="352" rx="44" />
        <rect x="80" y="176" width="352" height="160" rx="44" />
      </g>
      <path
        d="M198 258l40 40 78-80"
        fill="none"
        stroke="#0f766e"
        strokeWidth="32"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
