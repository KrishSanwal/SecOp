import CrewPick from "@/components/crew-pick";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-4 py-10">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Second Opinion</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Who is examining whom?</h1>
        <p className="mt-2 text-zinc-400">
          You can&apos;t see your own decline. Your crewmate can. Pick who is examined and who runs the exam.
        </p>
      </header>
      <CrewPick />
    </main>
  );
}
