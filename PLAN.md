# Second Opinion: build plan

Deadline: **Sunday 15 Nov 2026, 11:59 PM IST.** Submission is final. Demo video: 30 seconds max.

## The one sentence

Two astronauts examine each other for five minutes; the app guides the exam by voice, scores each
person against their own baseline, and tells them what to do next using NASA's ISS Medical Checklist.

## Design (decided)

### Roles in an exam
- **Subject**: the astronaut being examined.
- **Examiner**: the crewmate running the exam, holding the phone or laptop.
- Both crew take both roles, back to back. That is the "second opinion".

### The five stations (in order, about one minute each)
| # | Station | Hazard it covers | How it is measured | Score stored |
|---|---|---|---|---|
| 1 | Pupils | Neuro / radiation / SANS | Examiner shines phone light into each eye; app times it; examiner rates each pupil: brisk / sluggish / unequal | 0 to 2 per eye |
| 2 | Orthostatic HR | Altered gravity / cardiovascular | Subject sits 1 min, app times 15-second pulse count; stands; app times 15-second count at 1 min standing. Examiner enters both counts | delta bpm |
| 3 | Balance | Altered gravity / vestibular | Romberg: subject stands feet together, eyes closed, 30 seconds. App times it; examiner rates sway: none / mild / marked / stepped out | 0 to 3 |
| 4 | Mood and sleep | Isolation / behavioral health | Three spoken questions to the subject (sleep hours, mood 1 to 5, "anything bothering you"), answered by voice or buttons | hours, 1 to 5, free text |
| 5 | Reaction | Cognition / closed environment (CO2) | Subject taps when the screen flashes, 10 trials | median ms |

### Scoring
- Each station produces a number. The first two exams are the **baseline** (mean).
- Later exams show **delta from baseline**. Flag when: pupil asymmetry or sluggish; orthostatic
  delta > 30 bpm; Romberg marked or stepped out; sleep < 6 h two days running; mood <= 2; reaction
  median > baseline + 20%.
- Each flag maps to one action card: what to do now, and when to contact the flight surgeon. The
  mapping lives in `docs/CHECKLIST_MAP.md` and is sourced from the ISS Medical Checklist.

### Voice
- The app **speaks** every instruction (Groq Orpheus TTS via `/api/tts`).
- The app **listens** for examiner and subject answers (Groq Whisper via `/api/stt`), then a small
  Groq LLM call turns the transcript into a structured value (`/api/parse`).
- **Buttons always work.** Voice is a layer on top, never the only path.

### Storage
- IndexedDB (`idb` package). One store: `exams` keyed by id, with `subjectId`, `examinerId`,
  `timestamp`, five station results. One store: `crew` with names and baselines.
- Export as JSON from the results screen.

### Screens
1. `/` Crew: pick subject and examiner (two cards, swap button).
2. `/exam` Station flow: one station per screen, big timer, voice prompt, buttons.
3. `/result/[id]` Result card: five rows, delta vs baseline, flags, action cards.
4. `/history/[crewId]` Timeline of that crew member's exams.

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
| 4 | `/api/stt`, `/api/tts`, `/api/parse` Groq routes | A | curl each route and get audio / text / JSON back |
| 5 | Crew screen `/` | B | pick subject + examiner, continue to exam |
| 6 | Station flow `/exam`: 5 station screens, timers, buttons | B | full exam completes and saves |
| 7 | Result card `/result/[id]` with flags and action cards | B | shows deltas against seeded baseline |
| 8 | `docs/CHECKLIST_MAP.md`: flag to action mapping from ISS Medical Checklist, with citations | B | every flag has an action and a source |
| 9 | Wire voice into the station flow (speak prompt, listen, fill field) | A | exam runs hands-free on phone |
| 10 | Seed data: two crew with two baseline exams each, one "drifted" exam for the demo | A | result card shows a real flag |
| 11 | Demo video, 30 seconds, uploaded unlisted on YouTube | B | public link works in incognito |
| 12 | Submission form text, NASA links, SI disclosure, Submit for Judging | A + B | status shows Submitted |

## Timeline (IST)

- **Sat 14 Nov, by 18:00**: tasks 1, 2, 3, 5 done. App runs locally with a fake exam.
- **Sat 14 Nov, by 23:00**: tasks 4, 6, 7, 8. Full exam, result card, no voice yet.
- **Sun 15 Nov, by 14:00**: tasks 9, 10. Voice works on a phone. Seeded demo path.
- **Sun 15 Nov, by 18:00**: freeze features. Task 11 (video) and 12 (form) only.
- **Sun 15 Nov, 21:00**: Submit for Judging. Three hours of buffer. Do not use it for features.

## How we work in one repo

- `main` always runs. Never push a broken build to `main`.
- One branch per task: `git checkout -b task-6-station-flow`.
- Push often, open a PR, the other person merges (or merge your own if the other is asleep).
- Before starting work each time: `git checkout main && git pull`.
- Never commit `.env.local`.
