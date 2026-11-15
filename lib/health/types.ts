export type MK = "rhr" | "shr" | "hrv" | "slp" | "spo2" | "rr" | "tmp" | "stp" | "act" | "vo2" | "sed" | "irn";

export interface Day {
  d: string;
  rhr?: number;
  shr?: number;
  hrv?: number;
  slp?: number;
  deep?: number;
  rem?: number;
  spo2?: number;
  rr?: number;
  tmp?: number;
  stp?: number;
  act?: number;
  vo2?: number;
  sed?: number;
  irn?: number;
}

export type Src = "live" | "demo";

export interface Pull {
  days: Day[];
  missing: string[];
  at: number;
}

export interface HFlag {
  id: string;
  k: MK;
  msg: string;
}

export interface Meta {
  k: MK;
  t: string;
  unit: string;
  group: "Recovery" | "Overnight" | "Activity";
  worse: 1 | -1;
  fmt: (v: number) => string;
  what: string;
  space: string;
}
