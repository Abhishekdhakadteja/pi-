import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4 text-center">
      <div className="text-6xl font-black text-slate-300">404</div>
      <p className="text-2xl font-bold">यह पेज नहीं मिला</p>
      <p className="text-lg text-slate-600">This page was not found.</p>
      <Link className="btn-primary" href="/">होम · Home</Link>
    </main>
  );
}
