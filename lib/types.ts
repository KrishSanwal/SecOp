export type Pupil = "brisk" | "sluggish" | "unequal";
export type Sway = "none" | "mild" | "marked" | "out";

export interface Results {
  pupils: { l: Pupil; r: Pupil; lat?: number; con?: number; asym?: number; curve?: number[] }; // camera: ms, share, |L-R| con, size vs before flash per 100 ms
  hr: { sit: number; stand: number; cam?: boolean }; // beats per 15 s (camera writes bpm / 4)
  bal: { sway: Sway; secs: number; rms?: number }; // rms: m/s^2 from motion sensor
  mood: { sleep: number; score: 1 | 2 | 3 | 4 | 5; note: string };
  rx: { ms: number[] };
  space?: boolean; // done in microgravity: no standing HR or balance
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
  plat: number;
  pcon: number;
  brms: number;
}

export interface Report {
  exam: Exam;
  m: Metrics;
  base: Metrics | null;
  delta: Metrics | null;
  flags: Flag[];
}
