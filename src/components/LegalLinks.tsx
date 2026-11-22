import Link from "next/link";

const WORDS = { privacy: "Privacy Policy", terms: "Terms of Use" };

/** Small "Privacy Policy · Terms of Use" links for footers. */
export function LegalLinks({ className = "" }: { className?: string }) {
  const w = WORDS; // both names stay in English, the way Indian apps show them
  return (
    <nav className={`flex flex-wrap items-center gap-3 text-sm ${className}`} aria-label="Legal">
      <Link href="/privacy" className="text-cyan-300 underline-offset-4 hover:underline">{w.privacy}</Link>
      <span className="text-slate-500">·</span>
      <Link href="/terms" className="text-cyan-300 underline-offset-4 hover:underline">{w.terms}</Link>
    </nav>
  );
}
