import Link from "next/link";

const LABS = [
  ["/lab/pupil", "Pupil light test", "Back camera and flash, about 1 minute"],
  ["/lab/hr", "Heart rate", "Fingertip on the back camera, 20 seconds"],
  ["/lab/sway", "Balance", "Phone on your chest, eyes closed, 30 seconds"],
];

export default function Lab() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 pt-4 pb-10">
      <Link href="/" className="flex min-h-11 w-fit items-center gap-1 text-dim hover:text-foreground">
        <span aria-hidden>←</span> Back
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">Sensor tests</h1>
        <p className="mt-1 text-dim">Try each measurement on its own before it goes into the full exam. Use a phone.</p>
      </div>
      <ul className="flex flex-col divide-y divide-rule border-y border-rule">
        {LABS.map(([href, t, d]) => (
          <li key={href}>
            <Link href={href} className="flex min-h-16 items-center justify-between gap-3 py-3">
              <span>
                <span className="block font-semibold">{t}</span>
                <span className="block text-sm text-dim">{d}</span>
              </span>
              <span aria-hidden className="text-dim">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
