export function Mark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 20" className={className} aria-hidden>
      <circle cx="11" cy="10" r="8" fill="none" strokeWidth="1.6" className="stroke-chalk" />
      <circle cx="21" cy="10" r="8" fill="none" strokeWidth="1.6" className="stroke-chalk" />
      <path d="M16 3.755A8 8 0 0 1 16 16.245A8 8 0 0 1 16 3.755Z" className="fill-accent" />
      <circle cx="16" cy="10" r="1.9" className="fill-cabin" />
    </svg>
  );
}

export function Logo() {
  return (
    <span role="img" aria-label="SecOp" className="inline-flex items-center gap-2">
      <Mark className="h-6 w-[2.4rem] shrink-0" />
      <span aria-hidden className="text-xl leading-none font-extrabold tracking-[-0.03em] whitespace-nowrap text-chalk">
        Sec<span className="text-accent">Op</span>
      </span>
    </span>
  );
}
