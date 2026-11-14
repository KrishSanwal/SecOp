import { putCrew, putExam, uid } from "./db";
import type { Exam, Results } from "./types";

const DAY = 86_400_000;
const ms = (base: number) => Array.from({ length: 10 }, (_, i) => base + ((i * 37) % 40) - 20);

const norm = (rx: number, sleep: number): Results => ({
  pupils: { l: "brisk", r: "brisk" },
  hr: { sit: 17, stand: 20 },
  bal: { sway: "none", secs: 30 },
  mood: { sleep, score: 4, note: "" },
  rx: { ms: ms(rx) },
});

// Two crew, two baseline exams each, then one drifted exam for Asha. Returns that exam's id.
export async function seed(): Promise<string> {
  const a = { id: uid(), name: "Asha", role: "Commander" };
  const r = { id: uid(), name: "Ravi", role: "Flight engineer" };
  await putCrew(a);
  await putCrew(r);

  const now = Date.now();
  const ex = (subj: string, exr: string, daysAgo: number, res: Results): Exam => ({ id: uid(), subj, exr, at: now - daysAgo * DAY, res });

  // Asha drifts slowly over two weeks; Ravi stays steady.
  const xs: Exam[] = [
    ex(a.id, r.id, 14, norm(290, 7.5)),
    ex(a.id, r.id, 11, norm(300, 7)),
    ex(a.id, r.id, 7, norm(312, 6.5)),
    ex(a.id, r.id, 4, { ...norm(338, 5.5), hr: { sit: 18, stand: 24 }, mood: { sleep: 5.5, score: 3, note: "Not sleeping well" } }),
    ex(r.id, a.id, 14, norm(320, 7)),
    ex(r.id, a.id, 11, norm(310, 6.5)),
    ex(r.id, a.id, 7, norm(318, 7)),
    ex(r.id, a.id, 4, norm(315, 7.5)),
  ];
  const drift = ex(a.id, r.id, 0, {
    pupils: { l: "brisk", r: "sluggish" },
    hr: { sit: 18, stand: 27 },
    bal: { sway: "mild", secs: 30 },
    mood: { sleep: 5, score: 3, note: "Headaches since the dust storm" },
    rx: { ms: ms(384) },
  });
  for (const e of [...xs, drift]) await putExam(e);
  return drift.id;
}
