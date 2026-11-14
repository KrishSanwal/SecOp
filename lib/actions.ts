import type { FlagId } from "./types";

// Copied from docs/CHECKLIST_MAP.md. Change both together.
export const RULE = "Do the safe thing first, then send the message. Do not wait for a reply before acting.";

export const ACTIONS: Record<FlagId, { now: string; call: string; src: string }> = {
  pupil_uneq: {
    now: "In dim light, check again that both pupils are the same size and both get smaller in the light, and ask about headache, blurred or double vision, and any knock to the head.",
    call: "Now if the difference is new, a pupil does not react, or there is a head knock, confusion, vomiting, vision change, or weakness in an arm or leg.",
    src: "ISS Medical Checklist JSC-48522, Head or neck injury, p. 352",
  },
  pupil_slow: {
    now: "Recheck both eyes in dim light, holding the light steady for a few seconds, and ask about headache, vision change, or any new medicine.",
    call: "Now if either pupil does not react at all; the same day if it is still sluggish on recheck.",
    src: "ISS Medical Checklist JSC-48522, Head or neck injury, p. 352",
  },
  hr_high: {
    now: "Sit or lie them down now, legs raised if dizzy, give water, and do not let them stand alone until they feel normal.",
    call: "Now if they felt lightheaded, sick, had tunnel vision or fainted; otherwise if it is high again at the next exam.",
    src: "NASA HRP evidence report, Orthostatic Intolerance (2015); NASA-STD-3001 Vol 2",
  },
  bal_bad: {
    now: "Stay close enough to catch them, help them sit, and ask about dizziness, spinning or nausea; no climbing or EVA prep until rechecked.",
    call: "Now if they fall, cannot stand without help, or have a new headache, vision change, weakness on one side or slurred speech; otherwise if it fails again at the next exam.",
    src: "NASA JSC post-flight neuro exam (Wood 2021); NASA-STD-3001 Vol 1",
  },
  sleep_low: {
    now: "Protect the next sleep period: lights out on time, eye mask and earplugs in, sleep station dark and quiet.",
    call: "If short sleep goes on for more than a few nights, sleep medicine is needed more than a few nights in a row, or before EVA, landing or piloting.",
    src: "NASA HRP evidence report, Sleep Loss (2016); ISS Medical Checklist, Insomnia, p. 436",
  },
  mood_low: {
    now: "Ask in private how they are and what is weighing on them, listen without judging, and ask straight out whether they have had thoughts of harming themselves.",
    call: "Now, as an emergency, if they mention self-harm; the same day if mood is low again at the next exam or is affecting work or sleep.",
    src: "NASA HRP evidence report, Behavioral Conditions (2016); ISS Medical Checklist, p. 498",
  },
  rx_slow: {
    now: "Retake the test once after a short break, seated and with no distractions; if still slow, check last night's sleep and the cabin CO2 reading, and have a crewmate double-check critical steps today.",
    call: "If it is still slow on retest at two exams in a row, or it comes with headache, confusion or another flag.",
    src: "NASA PVT-B and Cognition battery (Basner 2011, 2015); NASA-STD-3001 Vol 2 CO2 limit",
  },
};
