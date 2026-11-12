"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** QR of a upi:// link. Rendered in the browser, nothing leaves the phone. */
export function UpiQr({ link, size = 220 }: { link: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(link, { width: size, margin: 1 }).then(setSrc).catch(() => setSrc(null));
  }, [link, size]);
  if (!src) return <div style={{ width: size, height: size }} className="animate-pulse rounded-xl bg-slate-100" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} width={size} height={size} alt="UPI QR" className="rounded-xl border" />;
}
