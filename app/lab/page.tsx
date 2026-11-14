import Link from "next/link";

const LABS = [
  ["/lab/pupil", "Pupil", "Front camera times the light reflex. The risky one: test this first."],
  ["/lab/hr", "Heart rate", "Fingertip over the back camera and flash."],
  ["/lab/sway", "Balance", "Phone on chest, motion sensor measures sway."],
];

export default function Lab() {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Sensor lab</h1>
      <p className="text-sm text-dim">Test pages for the automatic stations. Open on a phone.</p>
      {LABS.map(([href, t, d]) => (
        <Link key={href} href={href} className="rounded-lg border border-edge p-4 hover:border-dim">
          <p className="font-semibold">{t}</p>
          <p className="text-sm text-dim">{d}</p>
        </Link>
      ))}
    </main>
  );
}
