// Next.js calls onRequestError for every uncaught error on the server (pages, server actions,
// API routes). Each one is written to the owner's error log, without patient details.
export async function onRequestError(err: unknown, request: { path: string }) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logError } = await import("@/lib/error-log");
  const e = err as { message?: string; digest?: string };
  await logError({ source: "server", path: request.path, message: e?.message, digest: e?.digest });
}
