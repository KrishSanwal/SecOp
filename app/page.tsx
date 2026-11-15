import Link from "next/link";
import CrewPick from "@/components/crew-pick";
import Demo from "@/components/demo";
import CrewBoard from "@/components/crew-board";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-10 px-4 pt-6">
      <header className="flex items-center gap-3">
        <svg viewBox="0 0 28 20" className="h-5 w-7 text-accent" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <circle cx="10" cy="10" r="8" />
          <circle cx="18" cy="10" r="8" />
        </svg>
        <span className="text-base leading-none font-bold whitespace-nowrap text-chalk">Second Opinion</span>
        <Link href="/lab" className="ml-auto min-h-11 content-center px-2 text-sm whitespace-nowrap text-dim hover:text-accent">
          Sensors
        </Link>
        <Demo />
      </header>
      <CrewPick />
      <CrewBoard />
    </main>
  );
}
