// Edit text here, then run `npm run audio` to regenerate public/audio.
export const PROMPTS = {
  start: "Second Opinion. Five stations, about five minutes. Examiner, hold the device. Subject, sit down and relax.",
  pupil_intro: "Station one. Pupils. Dim the lights if you can.",
  pupil_left: "Shine the light into the left eye for two seconds. Watch the pupil shrink.",
  pupil_right: "Now the right eye. Two seconds.",
  pupil_rate: "Rate each pupil. Brisk, sluggish, or unequal.",
  hr_intro: "Station two. Heart rate. Subject stays seated. Find the pulse at the wrist.",
  hr_sit: "Count the beats. Go.",
  hr_stand: "Subject, stand up now. Stay still. We count again in one minute.",
  hr_stand_go: "Count the beats again. Go.",
  stop: "Stop. Enter the count.",
  bal_intro: "Station three. Balance. Feet together, arms by your side.",
  bal_go: "Close your eyes. Hold still for thirty seconds. Examiner, stand close.",
  bal_done: "Open your eyes. Rate the sway.",
  mood_intro: "Station four. Sleep and mood. Examiner, ask these out loud.",
  mood_sleep: "How many hours did you sleep last night?",
  mood_score: "On a scale of one to five, how is your mood today?",
  mood_note: "Is anything bothering you?",
  rx_intro: "Station five. Reaction. Subject, take the device. Tap as soon as the screen flashes.",
  done: "Exam complete. Swap roles when you are ready.",
  flag: "One or more results need attention. Read the action card together.",
  clear: "All results are within your normal range for today.",
} as const;

export type PromptId = keyof typeof PROMPTS;
