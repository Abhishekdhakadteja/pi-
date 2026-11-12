"use client";
export function PrintButton({ label }: { label: string }) {
  return (
    <button className="no-print btn-primary mt-6 w-full" onClick={() => window.print()}>
      🖨 {label}
    </button>
  );
}
