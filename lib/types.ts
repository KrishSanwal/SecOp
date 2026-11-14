export type Pupil = "brisk" | "sluggish" | "unequal";
export type Sway = "none" | "mild" | "marked" | "out";

export interface Results {
  pupils: { l: Pupil; r: Pupil };
  hr: { sit: number; stand: number }; // beats per 15 s
  bal: { sway: Sway; secs: number };
  mood: { sleep: number; score: 1 | 2 | 3 | 4 | 5; note: string };
  rx: { ms: number[] };
}

export interface Exam {
  id: string;
  subj: string;
  exr: string;
  at: number;
  res: Results;
}

export interface Crew {
  id: string;
  name: string;
  role?: string;
}

export type FlagId =
  | "pupil_slow"
  | "pupil_uneq"
  | "hr_high"
  | "bal_bad"
  | "sleep_low"
  | "mood_low"
  | "rx_slow";

export interface Flag {
  id: FlagId;
  stn: keyof Results;
  msg: string;
}

export interface Metrics {
  pupil: number;
  hr: number;
  bal: number;
  sleep: number;
  mood: number;
  rx: number;
}

export interface Report {
  exam: Exam;
  m: Metrics;
  base: Metrics | null;
  delta: Metrics | null;
  flags: Flag[];
}
