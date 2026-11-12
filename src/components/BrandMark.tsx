/** ClinicEase logo: a medical cross inside a soft gradient tile. */
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-md shadow-teal-900/20 ring-1 ring-white/30"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="white">
        <path d="M9.5 3h5a1 1 0 0 1 1 1v4.5H20a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-4.5V20a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-4.5H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h4.5V4a1 1 0 0 1 1-1z" />
      </svg>
    </span>
  );
}
