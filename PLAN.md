# SecOp: build plan

Deadline: Sunday 15 Nov 2026, 11:59 PM IST. The submission is final. Demo video is 30 seconds max.

## The idea

Two astronauts examine each other for five minutes. The phone's camera and motion sensor take the
measurements, the app compares each person with their own earlier exams, and then it tells them what to
do next using NASA's ISS Medical Checklist. The examiner holds and positions the phone. They don't have
to judge anything.

## How an exam works

### Roles
- Subject: the astronaut being examined.
- Examiner: the crewmate running the exam and holding the phone.
- Both crew take both roles, one after the other. That's the second opinion.

### The five stations (about a minute each)
| # | Station | Hazard | How it's measured | Stored | Fallback |
|---|---|---|---|---|---|
| 1 | Pupils | Neuro / radiation / SANS | Front camera 10-15 cm from the eye. The screen goes dark for 1.5 s, then flashes white for 2.5 s. MediaPipe finds the iris and the dark pixels inside it are the pupil. The pupil/iris ratio per frame gives latency and constriction, for both eyes. `lib/pupil.ts` | `pupils.lat` ms, `pupils.con` share, `pupils.asym` | Examiner rates brisk / sluggish / unequal |
| 2 | Orthostatic HR | Altered gravity / heart | Fingertip over the back camera with the flashlight on, so the red channel pulses with each beat. 20 s sitting, stand up, wait a minute, 20 s standing. `lib/ppg.ts`. If the subject's band is connected on that phone, the app can take the band's heart rate for those minutes instead. | `hr.sit`, `hr.stand` (bpm / 4), plus `hr.cam` or `hr.band` | Manual 15 s pulse count |
| 3 | Balance | Altered gravity / vestibular | Phone held flat on the chest, feet together, eyes closed, 30 s. The motion sensor measures sway, and a jolt means they stepped out. `lib/sway.ts` | `bal.rms` m/s², `bal.secs`, `bal.sway` | Examiner rates the sway |
| 4 | Mood and sleep | Isolation / behavioural health | Questions with button answers. This one can't be automatic. | hours, 1 to 5, free text | none |
| 5 | Reaction | Cognition / CO2 | Tap when the screen turns green, 10 trials | median ms | none |

Stations 2 and 3 need gravity, so they're for surface ops and after landing (see `docs/CHECKLIST_MAP.md`).
In transit the crew can skip them.

Pupils need the room lights on so the camera can see the iris, and they work best on lighter eyes. Dark
brown eyes are the known weak spot, so check with `/lab/pupil` before relying on it.

### Scoring
- Every station gives a number. The first two exams are the baseline (their mean).
- Later exams show the change from baseline. We flag when pupil latency is more than 25% above
  baseline, constriction is more than 30% below it, or left and right differ by more than 0.1; heart
  rate jumps more than 30 bpm on standing; sway is more than 50% above baseline or they stepped out;
  sleep is under 6 h two days running; mood is 2 or lower; or the reaction median is more than 20%
  slower. The limits are in `LIMITS` in `lib/scoring.ts`. Manual ratings still score if a sensor fails.
- Each flag has one action card: what to do now, and when to call the flight surgeon. The mapping is in
  `docs/CHECKLIST_MAP.md` and comes from the ISS Medical Checklist.

### Voice
- Prompts are fixed text in `lib/prompts.ts`, recorded once with Groq Orpheus (`npm run audio`) into
  `public/audio/*.mp3`. `say("hr_sit")` in `lib/say.ts` plays one.
- No voice input. Every answer is a button or a number pad.
- The exam works with no network. `public/sw.js` caches the pages, scripts and audio on first load. The
  only time the exam goes online is if the subject picks the band for heart rate.

### Storage
- IndexedDB through `idb`. An `exams` store keyed by id (subject, examiner, time, the five results) and a
  `crew` store with names and baselines.
- Results export as JSON from the results screen.
- Band readings live in their own small database, just the last sync for each crew member.

## Wearables page (optional)

- `/wearables?crew=` shows daily readings from each crew member's band: resting and sleeping heart
  rate, HRV, sleep (deep, REM), blood oxygen, breathing rate, skin temperature, steps, active minutes,
  cardio fitness, sedentary time and irregular rhythm alerts. `/wearables/metric?crew=&m=` opens one reading with a chart and a plain
  explanation.
- Each crew member signs in with Google, read-only. The sign-in stays in a cookie on their own phone. We
  have no accounts of our own and store nothing on a server.
- The last sync is kept on the phone, so the page still opens offline. Syncing needs a network.
- Each reading is compared with that person's own 14-day usual (at least 5 days of data). We flag resting
  or sleeping heart rate 6+ bpm over usual, HRV down 25%, under 6 h of sleep two nights running, SpO2
  under 92% or 3 points below usual, breathing 2/min over usual, skin temperature up more than 1 °C, and
  any irregular rhythm alert. Limits are in `LIM` in `lib/health/base.ts`.
- If the Google keys aren't set, the page shows sample data and says so.
- Station 2 can take its heart rate from the band. Nothing else from the band changes the exam scores or
  action cards.

What we'd actually send up: a new kind of wearable, light enough to wear 24/7 like the Fitbit Air, that
tracks the heart properly, ECG included, and passes its readings to the crew's phone or tablet over a
wire, so no internet or Google account is involved. We have a Fitbit Air, so we're sticking with that
for the prototype.

## Screens

1. `/` Crew: pick the subject and examiner (two cards, swap button).
2. `/exam` One station per screen: big timer, voice prompt, buttons.
3. `/result?id=` Result card: five rows, change from baseline, flags, action cards.
4. `/trend?crew=` That person's exams over time.
5. `/sync` Copy records from one phone to another by QR code.
6. `/wearables?crew=` The wearables page.
7. `/lab`, `/lab/pupil`, `/lab/hr`, `/lab/sway` Sensor test pages.

We use query params instead of `[id]` folders so the offline cache covers every exam. Dark UI, one accent
colour, no NASA logos anywhere.

## Not building

- Extra hardware for the exam. It runs on the phone alone, and the wearables page is a bonus.
- Bluetooth, or pulse from the face (rPPG).
- Accounts, a server database or a Mission Control view. The only server code is the few small
  `/api/health` routes behind the Google sign-in.
- Hindi, for now.

## Tasks

A = Shaurya, B = Krish. Each task is a GitHub issue. Assign yourself to claim it.

| # | Task | Owner | Done when |
|---|---|---|---|
| 1 | Repo, scaffold, deploy to Vercel, env vars | A | the Vercel URL loads the home page |
| 2 | `lib/scoring.ts`: station types, baseline, change, flag rules, with tests | A | `npm test` is green |
| 3 | `lib/db.ts`: crew and exams in IndexedDB, JSON export | A | add, list and get work in the browser |
| 4 | Voice prompts (recorded once at build time, nothing at runtime) | A | done |
| 5 | Crew screen `/` | B | pick subject and examiner, go to the exam |
| 6 | Station flow `/exam`: five screens, timers, buttons | B | a full exam completes and saves |
| 7 | Result card `/result?id=` with flags and action cards | B | shows changes against the seeded baseline |
| 8 | `docs/CHECKLIST_MAP.md`: flag to action, from the ISS Medical Checklist, with citations | B | every flag has an action and a source |
| 9 | Offline: audio, service worker, installable app | A | the exam works in airplane mode |
| 10 | Demo data: two crew with two baseline exams each, plus one exam that has drifted | A | the result card shows a real flag |
| 11 | Demo video, 30 seconds, unlisted on YouTube | B | the link works in incognito |
| 12 | Submission form, NASA links, AI disclosure, Submit for Judging | A + B | status shows Submitted |
| 13 | Sensor code: `lib/pupil.ts`, `lib/ppg.ts`, `lib/sway.ts`, lab pages | A | done |
| 14 | Try `/lab/pupil` on our own eyes on a phone | A + B | go / no-go for camera pupils |
| 15 | Camera heart rate and motion balance in the exam, with manual fallback | B | a full exam runs on the phone's sensors |
| 16 | Camera pupils in the exam (if 14 is a go) | A | done |
| 17 | Result card shows latency, constriction and sway against usual | B | numbers show with "usual" |
| 18 | In-transit switch that skips stations 2 and 3 | B | switch on the intro screen |
| 19 | Wearables page: Google sign-in, sync, 14-day usual, flags, sample data, offline | B | done |
| 20 | Google keys on Vercel so a real band works in the demo | B | sign-in reaches Google's consent screen |
| 21 | Station 2 can use the band's heart rate instead of the camera | B | done |

## Timeline (IST)

- Sat 14 Nov, by 18:00: tasks 1, 2, 3 and 5. The app runs locally with a fake exam.
- Sat 14 Nov, by 23:00: tasks 4, 6, 7 and 8. Full exam and result card, no voice yet.
- Sun 15 Nov, by 14:00: task 10, the demo path. Film the demo in airplane mode.
- Sun 15 Nov, by 18:00: feature freeze. Only the video and the form after this.
- Sun 15 Nov, 21:00: Submit for Judging, leaving three hours of buffer. Don't spend it on features.

## Working in one repo

- `main` always runs. Don't push a broken build to it.
- One branch per task, e.g. `git checkout -b task-6-station-flow`.
- Push often and open a PR. The other person merges, or merge your own if they're asleep.
- Always start with `git checkout main && git pull`.
- Never commit `.env.local`.
