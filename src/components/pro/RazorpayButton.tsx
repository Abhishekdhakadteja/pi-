"use client";
import { useEffect, useRef } from "react";

// Razorpay Payment Button (made in the Razorpay dashboard). The button id is public embed
// code, not a secret. Razorpay's script must sit inside a <form>, so we add it on mount.
// A payment here is not linked to a clinic automatically: the owner sees it in Razorpay
// and switches the plan on from /owner.
export const BASIC_PAYMENT_BUTTON_ID = "pl_U4UL80fPmuBrp3";

export function RazorpayButton({ buttonId = BASIC_PAYMENT_BUTTON_ID }: { buttonId?: string }) {
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const f = form.current;
    if (!f || f.querySelector("script")) return;
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/payment-button.js";
    s.async = true;
    s.dataset.payment_button_id = buttonId;
    f.appendChild(s);
    return () => {
      f.innerHTML = "";
    };
  }, [buttonId]);
  return <form ref={form} className="flex min-h-11 justify-center" data-testid="razorpay-button" />;
}
