"use client";
import { useRef, useState, useTransition } from "react";
import { useT } from "@/components/LangProvider";
import { addDevice, addNode, removeDevice, setNodeActive } from "./actions";
import { trackWords } from "./words";

export function AddNodeForm() {
  const { lang } = useT();
  const w = trackWords(lang);
  const [pending, start] = useTransition();
  const [token, setToken] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          const r = await addNode(f);
          if (r.ok) {
            setToken(r.token ?? null);
            setErr(null);
          } else setErr(w.err[r.error]);
        });
      }}
    >
      <div className="flex gap-2">
        <input name="name" className="input flex-1" placeholder={w.nodeName} required maxLength={60} />
        <button className="btn-secondary shrink-0" disabled={pending}>{w.addNode}</button>
      </div>
      {err && <p className="error-box">{err}</p>}
      {token && (
        <div className="ok-box break-all" data-testid="node-token">
          <p className="mb-1">{w.tokenOnce}</p>
          <code className="select-all font-mono text-sm">{token}</code>
        </div>
      )}
    </form>
  );
}

export function NodeToggle({ id, active }: { id: string; active: boolean }) {
  const { lang } = useT();
  const w = trackWords(lang);
  const [pending, start] = useTransition();
  return (
    <button className="btn-small" disabled={pending} onClick={() => start(async () => void (await setNodeActive(id, !active)))}>
      {active ? w.pause : w.resume}
    </button>
  );
}

export function AddDeviceForm({ staff }: { staff: { id: string; name: string }[] }) {
  const { lang } = useT();
  const w = trackWords(lang);
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form
      ref={ref}
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          const r = await addDevice(f);
          setMsg(r.ok ? { ok: true, text: w.saved } : { ok: false, text: w.err[r.error] });
          if (r.ok) ref.current?.reset();
        });
      }}
    >
      <select name="user_id" className="input" required>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <input name="identifier" className="input font-mono" placeholder={w.tagId} required maxLength={80} />
      <div className="flex gap-2">
        <select name="kind" className="input w-36 shrink-0" defaultValue="ble_tag">
          {Object.entries(w.kind).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input name="label" className="input flex-1" placeholder={w.label} maxLength={60} />
      </div>
      {msg && <p className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</p>}
      <button className="btn-secondary" disabled={pending}>{w.addDevice}</button>
    </form>
  );
}

export function RemoveDevice({ id }: { id: string }) {
  const { lang } = useT();
  const [pending, start] = useTransition();
  return (
    <button className="btn-small" disabled={pending} onClick={() => start(async () => void (await removeDevice(id)))}>
      {trackWords(lang).remove}
    </button>
  );
}
