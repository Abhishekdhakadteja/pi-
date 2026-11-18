import { LandingIcon } from "@/components/LandingIcon";
import type { Icon } from "@/lib/landing-content";

/** Glowing square "logo" for an agent or service. */
export function LogoTile({ icon, accent, size = "h-12 w-12" }: { icon: Icon; accent: [string, string]; size?: string }) {
  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center rounded-2xl text-white ring-1 ring-white/15`}
      style={{
        backgroundImage: `linear-gradient(135deg, ${accent[0]}, ${accent[1]})`,
        boxShadow: `0 6px 24px -6px ${accent[0]}99`,
      }}
    >
      <LandingIcon name={icon} className="h-6 w-6" />
    </span>
  );
}
