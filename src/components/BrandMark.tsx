/**
 * Clinic Easy logo mark: a neon stethoscope (the doctor's first tool) whose chest piece
 * shows a live heartbeat, with glowing AI signal nodes along the tube, on a deep-space tile.
 * Source: public/brand/clinic-easy-mark.svg (also src/app/icon.svg for the favicon).
 */
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    // A plain <img> keeps the SVG's glow filters and gradients isolated and cached.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/clinic-easy-mark.svg"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className="shrink-0 rounded-[23%] shadow-[0_4px_18px_rgba(34,184,245,0.35)]"
    />
  );
}

/** "CLINIC EASY" wordmark: futuristic Sora type, with EASY in the neon gradient. */
export function BrandName({ className = "" }: { className?: string }) {
  return (
    <span className={`font-brand font-bold uppercase tracking-wide ${className}`}>
      Clinic{" "}
      <span className="bg-gradient-to-r from-[#22F5D0] via-[#22B8F5] to-[#A78BFA] bg-clip-text text-transparent">
        Easy
      </span>
    </span>
  );
}
