import CrewPick from "@/components/crew-pick";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-10 px-4 pt-6">
      <header className="flex items-center gap-2.5 text-[0.95rem] font-semibold">
        <svg viewBox="0 0 28 20" className="h-5 w-7 text-accent" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="10" cy="10" r="8" />
          <circle cx="18" cy="10" r="8" />
        </svg>
        Second Opinion
      </header>
      <CrewPick />
    </main>
  );
}
