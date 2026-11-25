"use client";
import { useEffect, useRef } from "react";

/**
 * Razorpay "Payment Button" made in the Razorpay dashboard. React does not run an
 * inline <script> written in JSX, so the script is added to the form after mount;
 * Razorpay's script then draws its own Pay button inside the form.
 */
export function RazorpayPaymentButton({ buttonId, note }: { buttonId: string; note?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    form.replaceChildren();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/payment-button.js";
    s.async = true;
    s.setAttribute("data-payment_button_id", buttonId);
    form.appendChild(s);
    return () => form.replaceChildren();
  }, [buttonId]);
  return (
    <div className="flex flex-col items-center gap-2" data-testid="razorpay-payment-button">
      <form ref={formRef} className="flex min-h-12 justify-center" />
      {note && <p className="text-center text-xs text-slate-400">{note}</p>}
    </div>
  );
}
