# Second Opinion: build plan

Deadline: **Sunday 15 Nov 2026, 11:59 PM IST.** Submission is final. Demo video: 30 seconds max.

## The one sentence

Two astronauts examine each other for five minutes; the phone's own camera and motion sensor take the
measurements, the app compares each person against their own previous sessions, and tells them what to
do next using NASA's ISS Medical Checklist. The examiner holds and positions the phone; they do not judge.

## Design (decided)

### Roles in an exam
- **Subject**: the astronaut being examined.
- **Examiner**: the crewmate running the exam, holding the phone or laptop.
- Both crew take both roles, back to back. That is the "second opinion".

### The five stations (in order, about one minute each)
| # | Station | Hazard | How it is measured (automatic) | Stored | Fallback |
|---|---|---|---|---|---|
| 1 | Pupils | Neuro / radiation / SANS | Front camera 10-15 cm from the eye. Screen goes dark 1.5 s, then flashes white 2.5 s. MediaPipe finds the iris; dark pixels inside it = pupil. Pupil/iris ratio per frame gives latency and constriction. Both eyes. `lib/pupil.ts` | `pupils.lat` ms, `pupils.con` share, `pupils.asym` | Examiner rating brisk / sluggish / unequal (`l`, `r`) |
| 2 | Orthostatic HR | Altered gravity / cardiovascular | Subject's fingertip over the back camera, flashlight on: red channel pulses with each beat. 20 s sitting, stand, 1 min wait, 20 s standing. `lib/ppg.ts` | `hr.sit`, `hr.stand` (bpm / 4), `hr.cam = true` | Manual 15 s pulse count |
| 3 | Balance | Altered gravity / vestibular | Subject holds phone flat on the chest, feet together, eyes closed, 30 s. Motion sensor measures sway; a jolt means stepped out. `lib/sway.ts` | `bal.rms` m/s², `bal.secs`, `bal.sway` (derived) | Examiner sway rating |
| 4 | Mood and sleep | Isolation / behavioral health | Questions, answered with buttons. Cannot be automatic. | hours, 1 to 5, free text | none |
| 5 | Reaction | Cognition / CO2 | Tap when the screen turns green, 10 trials (already automatic) | median ms | none |

Gravity: stations 2 and 3 need gravity. They are for planetary surface ops and after landing (Krish,
`docs/CHECKLIST_MAP.md`). The flow should let the crew skip them when in transit.

Lighting: pupils need the room lights on (the camera must see the iris) and work best on lighter irises.
Dark brown eyes are the known risk; verify with `/lab/pupil` before relying on it.

### Scoring
- Each station produces a number. The first two exams are the **baseline** (mean).
- Later exams show **delta from baseline**. Flag when: pupil latency > baseline + 25%, constriction
  < baseline - 30%, or left/right constriction differs by > 0.1; orthostatic delta > 30 bpm; sway RMS
  > baseline + 50% or stepped out; sleep < 6 h two days running; mood <= 2; reaction median > baseline
  + 20%. Limits live in `LIMITS` in `lib/scoring.ts`. Manual ratings still score if a sensor fails.
- Each flag maps to one action card: what to do now, and when to contact the flight surgeon. The
  mapping lives in `docs/CHECKLIST_MAP.md` and is sourced from the ISS Medical Checklist.

### Voice (offline)
- Prompts are fixed text in `lib/prompts.ts`, pre-recorded once with Groq Orpheus (`npm run audio`)
  into `public/audio/*.mp3`. Play one with `say("hr_sit")` from `lib/say.ts`.
- No voice input. Every answer is a button or number pad.
- The exam needs no network. `public/sw.js` caches pages, scripts and audio on first load.
- `/api/stt`, `/api/tts`, `/api/parse` exist but the exam never calls them.

### Storage
- IndexedDB (`idb` package). One store: `exams` keyed by id, with `subjectId`, `examinerId`,
  `timestamp`, five station results. One store: `crew` with names and baselines.
- Export as JSON from the results screen.

### Screens (query params, not [id] folders, so the offline cache covers every exam)
1. `/` Crew: pick subject and examiner (two cards, swap button).
2. `/exam` Station flow: one station per screen, big timer, voice prompt, buttons.
3. `/result?id=` Result card: five rows, delta vs baseline, flags, action cards.
4. `/history?crew=` Timeline of that crew member's exams.

Dark UI. One accent colour. No NASA logos anywhere.

### Not building
- No wearables, no Bluetooth, no camera-based pupil measurement, no rPPG.
- No accounts, no server database, no Mission Control view.
- No Hindi in v1 unless everything else is done by Sunday 6 PM.

## Task split

Owner A = Shaurya. Owner B = teammate. Each task is a GitHub issue. Claim it by assigning yourself.

| # | Task | Owner | Done when |
|---|---|---|---|
| 1 | Repo, scaffold, deploy to Vercel, env vars | A | Vercel URL loads the home page |
| 2 | `lib/scoring.ts`: station types, baseline, delta, flag rules, with unit tests | A | `npm test` green |
| 3 | `lib/db.ts`: IndexedDB crew + exams store, export JSON | A | add/list/get work in browser |
| 4 | Groq routes (now build-time only, for prompt audio) | A | done |
| 5 | Crew screen `/` | B | pick subject + examiner, continue to exam |
| 6 | Station flow `/exam`: 5 station screens, timers, buttons | B | full exam completes and saves |
| 7 | Result card `/result?id=` with flags and action cards | B | shows deltas against seeded baseline |
| 8 | `docs/CHECKLIST_MAP.md`: flag to action mapping from ISS Medical Checklist, with citations | B | every flag has an action and a source |
| 9 | Offline: prompt audio + service worker + installable app | A | exam works in airplane mode |
| 10 | Seed data: two crew with two baseline exams each, one "drifted" exam for the demo | A | result card shows a real flag |
| 11 | Demo video, 30 seconds, uploaded unlisted on YouTube | B | public link works in incognito |
| 12 | Submission form text, NASA links, SI disclosure, Submit for Judging | A + B | status shows Submitted |

## Sensor build (added Sat 14 Nov evening)

| # | Task | Owner | Done when |
|---|---|---|---|
| 13 | Sensor libs: `lib/pupil.ts`, `lib/ppg.ts`, `lib/sway.ts`, scoring fields, lab pages `/lab/*` | A | done: 24 tests, labs live |
| 14 | Test `/lab/pupil` on own eyes on a phone; report if the red disc tracks the pupil | A + B | go / no-go for camera pupils |
| 15 | Wire camera HR + motion balance into `components/exam.tsx` with manual fallback | B | full exam runs with phone sensors |
| 16 | Wire camera pupils into the exam (only if 14 is a go) | B | pupil station automatic |
| 17 | Result card shows the new numbers vs usual (latency, constriction, sway) | B | numbers visible with "usual" |
| 18 | In-transit toggle: skip stations 2 and 3 | B | toggle on intro screen |

## Timeline (IST)

- **Sat 14 Nov, by 18:00**: tasks 1, 2, 3, 5 done. App runs locally with a fake exam.
- **Sat 14 Nov, by 23:00**: tasks 4, 6, 7, 8. Full exam, result card, no voice yet.
- **Sun 15 Nov, by 14:00**: task 10. Seeded demo path. Film the demo in airplane mode.
- **Sun 15 Nov, by 18:00**: freeze features. Task 11 (video) and 12 (form) only.
- **Sun 15 Nov, 21:00**: Submit for Judging. Three hours of buffer. Do not use it for features.

## How we work in one repo

- `main` always runs. Never push a broken build to `main`.
- One branch per task: `git checkout -b task-6-station-flow`.
- Push often, open a PR, the other person merges (or merge your own if the other is asleep).
- Before starting work each time: `git checkout main && git pull`.
- Never commit `.env.local`.
