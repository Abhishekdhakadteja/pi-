"use client";
import { useEffect, useRef } from "react";

// Cloudflare Turnstile widget (free, usually invisible to real people). Renders nothing until
// NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, so the app works the same without it.
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};

export function Turnstile({ onToken, lang }: { onToken: (t: string) => void; lang: "hi" | "en" }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !box.current) return;
    let id: string | null = null;
    let stopped = false;
    const draw = () => {
      const ts = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      if (stopped || !ts || !box.current) return;
      id = ts.render(box.current, {
        sitekey: TURNSTILE_SITE_KEY,
        language: lang,
        appearance: "interaction-only",
        callback: (t: string) => onToken(t),
        "expired-callback": () => onToken(""),
      });
    };
    if ((window as unknown as { turnstile?: TurnstileApi }).turnstile) draw();
    else {
      let s = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
      if (!s) {
        s = document.createElement("script");
        s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        s.async = true;
        s.dataset.turnstile = "1";
        document.head.appendChild(s);
      }
      s.addEventListener("load", draw);
    }
    return () => {
      stopped = true;
      const ts = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      if (id && ts) ts.remove(id);
    };
  }, [onToken, lang]);
  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={box} className="min-h-0" />;
}
