import type { Meta } from "./types";

const n0 = (v: number) => Math.round(v).toString();
const n1 = (v: number) => v.toFixed(1);
const hm = (v: number) => {
  const m = Math.round(v);
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
};

export const META: Meta[] = [
  {
    k: "rhr", t: "Resting heart rate", unit: "bpm", group: "Recovery", worse: 1, fmt: (v) => `${n0(v)} bpm`,
    what: "Your heart rate when you are calm and still. It sits low when you are rested. A rise of several beats over your usual often follows poor sleep, stress, illness or dehydration.",
    space: "On a long mission, a slow climb can be an early sign of fluid shifts, short sleep or a coming infection.",
  },
  {
    k: "shr", t: "Sleeping heart rate", unit: "bpm", group: "Recovery", worse: 1, fmt: (v) => `${n0(v)} bpm`,
    what: "Heart rate during deep, non-dreaming sleep. It is the lowest your heart goes each day. If it stays high, your body did not fully recover overnight.",
    space: "Cabin noise, light and temperature change in orbit. A high sleeping rate can show the night was not restful even if you slept long enough.",
  },
  {
    k: "hrv", t: "Heart rate variability", unit: "ms", group: "Recovery", worse: -1, fmt: (v) => `${n0(v)} ms`,
    what: "The small changes in time between heartbeats, measured during sleep. Higher usually means your body is recovered and coping well. Compare only with your own usual, not with other people.",
    space: "A drop below your usual, together with a higher resting heart rate, is a common sign of heavy load: stress, short sleep or illness.",
  },
  {
    k: "slp", t: "Sleep", unit: "min", group: "Recovery", worse: -1, fmt: hm,
    what: "Time asleep last night, from your band. Most adults need 7 to 9 hours. Deep and REM stages matter as much as the total.",
    space: "Crews often sleep less than planned in space. Two short nights in a row is worth acting on.",
  },
  {
    k: "spo2", t: "Blood oxygen", unit: "%", group: "Overnight", worse: -1, fmt: (v) => `${n1(v)}%`,
    what: "Average oxygen saturation in your blood overnight. Healthy readings are usually 95% or higher. The wrist sensor can drift, so one low night matters less than a pattern.",
    space: "Cabin CO2 and pressure changes can show up here. A lasting drop below your usual is worth a recheck of the air and a call to the flight surgeon.",
  },
  {
    k: "rr", t: "Breathing rate", unit: "breaths/min", group: "Overnight", worse: 1, fmt: (v) => `${n1(v)} per min`,
    what: "Breaths per minute while you sleep. It is very steady in healthy people. A rise of two or more over your usual can mean illness, congestion or high CO2.",
    space: "Rising CO2 in a cabin pushes breathing rate up before you feel anything.",
  },
  {
    k: "tmp", t: "Skin temperature", unit: "°C", group: "Overnight", worse: 1, fmt: (v) => `${v >= 0 ? "+" : ""}${n1(v)} °C`,
    what: "How far your skin temperature last night was from your own normal. Small swings are common. A jump of a degree or more can come with fever or a changed room temperature.",
    space: "Habitat temperature changes affect this reading, so check the room before suspecting illness.",
  },
  {
    k: "stp", t: "Steps", unit: "steps", group: "Activity", worse: -1, fmt: (v) => Math.round(v).toLocaleString("en"),
    what: "Steps counted by the band today. It is a rough measure of how much you moved.",
    space: "In microgravity steps stay low, so use it for surface days and exercise sessions, not as a health signal in transit.",
  },
  {
    k: "act", t: "Active minutes", unit: "min", group: "Activity", worse: -1, fmt: (v) => `${n0(v)} min`,
    what: "Minutes of moderate or hard effort today. Regular activity protects your heart, bones and mood.",
    space: "Crew exercise time is a medical requirement in space. A sudden fall can mean fatigue, pain or low mood.",
  },
  {
    k: "vo2", t: "Cardio fitness", unit: "mL/kg/min", group: "Activity", worse: -1, fmt: (v) => `${n1(v)}`,
    what: "An estimate of how well your body uses oxygen (VO2 max). It changes slowly over weeks, so look at the trend, not a single day.",
    space: "Fitness falls in microgravity without exercise. A steady slide shows training is not keeping up.",
  },
  {
    k: "sed", t: "Sedentary time", unit: "min", group: "Activity", worse: 1, fmt: hm,
    what: "Time spent sitting or lying still while awake. Long unbroken stretches add up.",
    space: "Long still periods during work shifts or transit are normal. Break them up when you can.",
  },
  {
    k: "irn", t: "Irregular rhythm alerts", unit: "alerts", group: "Overnight", worse: 1, fmt: (v) => (v === 0 ? "None" : `${n0(v)} today`),
    what: "The band can notice a pulse pattern that looks irregular and send an alert. It is a prompt to check in, not a diagnosis.",
    space: "Any alert should be reported to the flight surgeon, who can ask for an ECG.",
  },
];

export const byK = Object.fromEntries(META.map((m) => [m.k, m])) as Record<string, (typeof META)[number]>;
