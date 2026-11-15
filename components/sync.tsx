"use client";

import jsQR from "jsqr";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { dump, examsOf, getCrew, listCrew, putCrew, putExam } from "@/lib/db";
import { encode, Receiver, type Bundle } from "@/lib/sync";
import type { Crew } from "@/lib/types";
import { Back, ghost, primary } from "./ui";

type Mode = "pick" | "show" | "scan";

export default function Sync() {
  const q = useSearchParams();
  const [mode, setMode] = useState<Mode>(q.get("crew") ? "show" : "pick");
  const [crew, setCrew] = useState<Crew[]>([]);
  const [who, setWho] = useState<string>(q.get("crew") ?? "all");

  useEffect(() => {
    listCrew().then(setCrew).catch(() => {});
  }, []);

  return (
    <>
      <Back href="/" label="Crew" />
      <header className="flex flex-col gap-2">
        <h1 className="text-[2.25rem] leading-tight font-bold tracking-tight">Phone to phone</h1>
        <p className="text-dim">Move records between two phones with no network. One shows a code, the other points its camera at it.</p>
      </header>

      {mode === "pick" && (
        <section className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="font-semibold">What to share</span>
            <select value={who} onChange={(e) => setWho(e.target.value)} className="min-h-12 rounded-lg border border-edge bg-cabin px-3">
              <option value="all">Everyone on this phone</option>
              {crew.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => setMode("show")} className={primary}>
            Show code on this phone
          </button>
          <button type="button" onClick={() => setMode("scan")} className={ghost}>
            Receive from another phone
          </button>
        </section>
      )}
      {mode === "show" && <Show who={who} onBack={() => setMode("pick")} />}
      {mode === "scan" && <Scan onBack={() => setMode("pick")} />}
    </>
  );
}

function Show({ who, onBack }: { who: string; onBack: () => void }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const [frames, setFrames] = useState<string[] | null>(null);
  const [i, setI] = useState(0);
  const [what, setWhat] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      let b: Bundle;
      if (who === "all") b = await dump();
      else {
        const c = await getCrew(who);
        if (!c) throw new Error("Crew member not found.");
        b = { crew: [c], exams: await examsOf(who) };
      }
      setWhat(`${b.crew.map((c) => c.name).join(", ") || "nobody"}: ${b.exams.length} exams`);
      setFrames(await encode(b));
    })().catch((e) => setErr(e instanceof Error ? e.message : "Could not prepare the transfer."));
  }, [who]);

  useEffect(() => {
    if (!frames) return;
    const id = setInterval(() => setI((k) => (k + 1) % frames.length), 450);
    return () => clearInterval(id);
  }, [frames]);

  useEffect(() => {
    if (!frames || !cv.current) return;
    QRCode.toCanvas(cv.current, frames[i], { errorCorrectionLevel: "L", margin: 2, width: 360, color: { dark: "#111111", light: "#ffffff" } }).catch(() => {});
  }, [frames, i]);

  return (
    <section className="flex flex-col gap-4">
      {err && <p className="text-alert">{err}</p>}
      <p>
        Sharing <b>{what || "…"}</b>. On the other phone, open Phone to phone and tap Receive. Hold it steady about 20 cm away until it says done.
      </p>
      <div className="self-center rounded-xl bg-white p-2">
        <canvas ref={cv} className="block size-[min(80vw,360px)]" />
      </div>
      {frames && (
        <p className="text-center text-dim tabular-nums">
          Frame {i + 1} of {frames.length}, looping
        </p>
      )}
      <button type="button" onClick={onBack} className={ghost}>
        Back
      </button>
    </section>
  );
}

function Scan({ onBack }: { onBack: () => void }) {
  const vid = useRef<HTMLVideoElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const [st, setSt] = useState<"open" | "scan" | "done" | "fail">("open");
  const [have, setHave] = useState(0);
  const [total, setTotal] = useState(0);
  const [got, setGot] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const k = { live: true, s: null as MediaStream | null, raf: 0 };
    const rx = new Receiver();
    type BD = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
    const BDC = (globalThis as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => BD }).BarcodeDetector;
    const det = BDC ? new BDC({ formats: ["qr_code"] }) : null;

    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (!k.live) return s.getTracks().forEach((t) => t.stop());
        k.s = s;
        const v = vid.current!;
        v.srcObject = s;
        await v.play().catch(() => {});
        setSt("scan");
        let busy = false;
        const tick = async () => {
          if (!k.live) return;
          if (!busy && v.readyState >= 2) {
            busy = true;
            let text: string | null = null;
            try {
              if (det) text = (await det.detect(v))[0]?.rawValue ?? null;
              else {
                const c = cv.current!;
                const w = (c.width = Math.min(640, v.videoWidth)), h = (c.height = Math.round((v.videoHeight / v.videoWidth) * w));
                const g = c.getContext("2d", { willReadFrequently: true })!;
                g.drawImage(v, 0, 0, w, h);
                text = jsQR(g.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" })?.data ?? null;
              }
            } catch {}
            if (text && rx.take(text)) {
              setHave(rx.have);
              setTotal(rx.total);
              if (rx.done) {
                k.live = false;
                k.s?.getTracks().forEach((t) => t.stop());
                const b = await rx.bundle();
                const mine = new Set((await listCrew()).map((c) => c.id));
                for (const c of b.crew) if (!mine.has(c.id)) await putCrew(c);
                for (const e of b.exams) await putExam(e);
                setGot(`${b.crew.map((c) => c.name).join(", ") || "records"}: ${b.exams.length} exams`);
                setSt("done");
                return;
              }
            }
            busy = false;
          }
          k.raf = requestAnimationFrame(tick);
        };
        k.raf = requestAnimationFrame(tick);
      } catch (e) {
        k.s?.getTracks().forEach((t) => t.stop());
        if (!k.live) return;
        const m = e instanceof Error ? e : new Error(String(e));
        setErr(m.name === "NotAllowedError" ? "Camera permission was blocked. Allow it in the browser settings." : `Could not open the camera: ${m.message || m.name}`);
        setSt("fail");
      }
    })();
    return () => {
      k.live = false;
      cancelAnimationFrame(k.raf);
      k.s?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <section className="flex flex-col gap-4">
      {st !== "done" && <p>Point the camera at the code on the other phone. Keep the whole code in view; it loops until every frame has arrived.</p>}
      <video ref={vid} playsInline muted autoPlay className={`aspect-[4/3] w-full rounded-xl bg-black object-cover ${st === "scan" || st === "open" ? "" : "hidden"}`} />
      <canvas ref={cv} className="hidden" />
      {st === "scan" && (
        <div role="status" className="rounded-lg border border-edge p-4">
          <p className="text-sm text-dim">{total ? "Receiving" : "Looking for a code"}</p>
          <p className="text-3xl font-bold tabular-nums">{total ? `${have} of ${total}` : "…"}</p>
          {total > 0 && (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-rule">
              <div className="h-full bg-accent transition-[width]" style={{ width: `${(have / total) * 100}%` }} />
            </div>
          )}
        </div>
      )}
      {st === "done" && (
        <div role="status" className="rounded-lg border border-accent p-4">
          <p className="text-sm text-accent">Received</p>
          <p className="text-xl font-semibold">{got}</p>
          <p className="text-dim">Saved on this phone. Existing records with the same id were updated, nothing was duplicated.</p>
        </div>
      )}
      {err && <p className="text-alert">{err}</p>}
      {st === "done" ? (
        <Link href="/" className={primary}>
          Back to crew
        </Link>
      ) : (
        <button type="button" onClick={onBack} className={ghost}>
          Back
        </button>
      )}
    </section>
  );
}
