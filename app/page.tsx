import Link from "next/link";
import CrewPick from "@/components/crew-pick";
import Demo from "@/components/demo";
import CrewBoard from "@/components/crew-board";
import { Logo } from "@/components/logo";
import { LangSwitch } from "@/components/lang";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-10 px-4 pt-6">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Logo />
        <Link href="/wearables" className="ml-auto min-h-11 content-center px-1.5 text-sm whitespace-nowrap text-dim hover:text-accent">Wearables</Link>
        <Link href="/lab" className="min-h-11 content-center px-1.5 text-sm whitespace-nowrap text-dim hover:text-accent">
          Sensors
        </Link>
        <Demo />
        <LangSwitch />
      </header>
      <CrewPick />
      <CrewBoard />
    </main>
  );
}
