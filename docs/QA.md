# Judge questions and our answers

Read this out loud to each other before judging. Every answer points to the file that proves it.
Rule: if you don't know, say "we haven't tested that yet, here's how we would", never guess numbers.

## 1. The idea

**Why a peer exam and not a self-check?**
The challenge says astronauts carry responsibility for spotting changes in themselves. Slow decline is exactly what you miss in yourself, and NASA's behavioral evidence report notes astronauts' "reluctance to report such symptoms". A crewmate holding the phone sees what you can't. ISS already relies on crew medical officers, so this matches how crews really work. (docs/CHECKLIST_MAP.md, source BMED)

**Who is the user?**
Crews on long missions with a big communication delay: Mars, a Moon base. On Earth: analog missions, Antarctic stations, ships, rural health workers.

**What NASA data or resources did you use?**
ISS Medical Checklist JSC-48522 for the actions, NASA-STD-3001 Vol 1 and 2 for limits (CO2, gravity transitions), HRP evidence reports for orthostatic intolerance, sleep loss and behavioral health, NASA-funded Cognition / PVT-B research for the reaction test. All linked in docs/SOURCES.md.

**Is it a medical device? Does it diagnose?**
No. It flags change from your own normal and tells you what NASA's checklist says to do and when to call the flight surgeon. The surgeon decides. The result screen says "not a medical device".

## 2. How it works (know these cold)

**What happens in one exam?** Five stations, about five minutes: pupils, heart rate sitting then standing, balance with eyes closed, sleep and mood questions, reaction time. Then both swap roles. (components/exam.tsx)

**How does it decide something is wrong?** Your first two exams are your baseline (mean). Later exams are compared to it. Flags: pupil reaction 25% slower or 30% weaker than your baseline, or left and right eyes 0.1 apart; heart rate rises more than 30 bpm on standing; sway 50% above baseline or stepping out; under 6 h sleep two exams running; mood 2 or lower; reaction 20% slower than baseline. All limits in one place: `LIMITS` in lib/scoring.ts. 19 tests in lib/scoring.test.ts.

**Why compare to the person and not to normal ranges?** People differ a lot, and phones differ too (touchscreen lag is 50 to 200 ms depending on the device). Comparing you with yourself on the same device cancels both out.

**Pupil test, step by step?** (lib/pupil.ts) MediaPipe Face Landmarker finds 478 face points including the iris (points 468-477). We crop the iris, use the red channel only, pick a threshold (Otsu), and grow the pupil from the darkest pixel near the centre so eyelid shadows don't count; the flash reflection counts as pupil. Pupil radius / iris radius is measured every frame, so distance from the camera doesn't matter. Light on, then: latency = time until 10% of the drop, constriction = how much it shrank.

**Why the red channel?** Brown irises reflect red light; the pupil doesn't. In normal colour, dark irises and pupils "both often appear black". From the 2023 Scientific Reports far-red pupillometry paper.

**Heart rate?** (lib/ppg.ts) Fingertip over the back camera with the flash on. Each heartbeat pushes blood into the fingertip and the image gets slightly darker in red. We remove slow drift with a 1-second moving average, smooth, find peaks at least 300 ms apart, and take the median gap. Needs at least 4 clean beats. Tested on simulated pulses at 55, 72, 100, 130 bpm, within 4 bpm (lib/ppg.test.ts). Published fingertip phone PPG matched ECG with r = 0.997 (JMIR mHealth 2017).

**Balance?** (lib/sway.ts) Phone flat on the chest, eyes closed, 30 s. The motion sensor gives acceleration; we remove gravity and take the RMS (average size of the sway). A jolt over 3 m/s² means you stepped. Phone-based sway RMS has good test-retest reliability in published studies (ICC 0.78-0.89, phone in pocket).

**Reaction?** Ten taps when the screen turns green, random 1-4 s gaps, median time. Uses pointer-down events and a high-precision clock to avoid the browser's tap delay.

**How does it work offline?** It's a web app that installs like an app. A service worker (public/sw.js) stores every page, the face model (3.6 MB) and its engine, and all spoken prompts on the phone after the first visit. Records are saved in the browser's own database (IndexedDB, lib/db.ts). No server is needed during an exam. We tested it with the network cut.

**Where do the spoken instructions come from?** 21 fixed prompts in lib/prompts.ts, generated once with Groq's Orpheus text-to-speech and shipped as small MP3 files (653 KB total). No internet needed to play them.

**Stack?** Next.js 16 and React 19, TypeScript, Tailwind, MediaPipe Tasks Vision, idb, Vitest (29 tests), hosted on Vercel. No backend database.

## 3. Hard questions (the ones that sink teams)

**Does the pupil test work on dark eyes?** Honestly: it's the hardest part. Research says normal phone cameras struggle because brown irises look as dark as the pupil. We switched to the red channel and the phone's flash, and the app tells you up front if it can't see the pupil. The real fix from the research is a cheap red filter over the lens. If the camera can't do it, the station falls back to the examiner's rating.

**Heart rate and balance in microgravity?** The heart-rate camera works anywhere. The standing heart-rate test and the balance test need gravity, so they're for surface operations and after landing, which is exactly when NASA reports the worst orthostatic and balance problems. In transit the crew skips them (issue #20).

**How do you know your thresholds are right?** Some come straight from sources (CO2 limit, sleep restriction effects). Others are our heuristics, and we wrote down which: Krish's threshold review in docs/CHECKLIST_MAP.md flags that the 30 bpm rule is a civilian cut-off and that "sluggish" isn't a NASA grade. They live in one constant so a flight surgeon can tune them.

**Why only two exams for the baseline?** A hackathon trade-off. The real version uses a rolling baseline with a spread, so it flags "outside your usual range" rather than "different from your average".

**False alarms?** Every flag says "recheck first". The checklist rule we follow is "do the safe thing first, then message the surgeon". A false alarm costs a recheck; a missed decline on Mars costs much more.

**Accuracy validated against real equipment?** Not yet. Tested on simulated signals and in a browser; not against an ECG, force plate or clinical pupillometer. That's the first thing we'd do with more time.

**Why not use AI/ML?** No astronaut dataset to train on, and a flight surgeon needs to know why something was flagged. Simple, explainable measurements against your own baseline are safer here.

**What about privacy?** Nothing leaves the phone. Export is a JSON file the crew chooses to send.

**Why a web app and not native?** Works on any phone with no install step, and offline once opened. Downside: flash control only works in Chrome on Android. Native would unlock the iPhone flash and the infrared face-ID camera, which solves dark-eye pupils.

**How does the flight surgeon see the results?** Export now. Next: a tiny text summary queued for the next comms window (docs/IDEAS.md #2).

**What did you use AI for?** Claude Code helped write code and docs; Groq Orpheus generated the voice prompts. We reviewed, tested and can explain every part. Disclosed in the README.

**What did each of you do?** Shaurya: scoring engine, storage, offline support, voice prompts, sensor measurements (pupil, heart rate, balance). Krish: crew, exam and result screens, the NASA checklist mapping with citations, threshold review. Both: design, testing, pitch.

**What would you do with more time?** Validate against clinical devices; red-filter pupils; rolling baseline; analog-mission pilot; voice-only exam; crew-wide drift view. (docs/IDEAS.md)

## 4. Ten-second facts
- 5 stations, about 5 minutes, 2 people
- 3 phone sensors: front or back camera, flash, motion sensor
- Baseline = your first 2 exams
- 29 automated tests
- Works fully offline after one visit
- 0 wearables, 0 servers during the exam
- Mars delay: 4 to 24 minutes one way

## 5. Added on Sunday (know these too)

**Live pulse wave.** During the heart-rate reading the detrended red-channel signal (lib/ppg.ts, `tick.wave`) is drawn on a canvas; a dot flashes on each detected peak. When the reading ends the phone vibrates at the measured rate for 5 s (`thump`).

**Pupil reflex graph.** The camera pupil test keeps a 30-point curve (pupil size vs size before the flash, every 100 ms from -0.5 s to +2.5 s). It is drawn on the station verdict with the person's last curve in grey, and saved with the exam (`pupils.curve`).

**Mars delay.** `lib/mars.ts` computes the Earth-Mars distance for today from mean orbital elements (JPL J2000 approximations, Kepler solved by Newton's method), then light time = distance / c. On 15 Nov 2026 that is about 197 million km, 11 min one way. The result card packs the exam into a <160-character text (`packet`) and, when queued, counts down to the earliest possible reply (2 x one way). Tests check the range and the Feb 2027 opposition minimum.

**Phone to phone, no network.** `/sync`. Records are JSON, deflate-compressed, base64, split into 500-character frames `SO1|z|i|n|data`, shown as a looping QR (qrcode lib, 450 ms per frame). The receiving phone scans with the browser's BarcodeDetector (jsQR fallback), collects frames in any order, decompresses, and upserts crew and exams by id. Nine exams fit in 3 frames.

**Crew board.** Home page lists everyone with last exam and flag count. `crewInsight` (lib/insights.ts): if at least two people and at least half the crew got worse on the same measurement at their latest exam, it says to check the cabin (CO2, sleep schedule, food, noise) before the people.

**In space / on a surface.** Asked before each exam; in space the two gravity stations are skipped and never enter the baseline.

**Wearables (Krish).** `/wearables`. Daily readings from a Fitbit Air through the Google Health API: resting and sleeping heart rate, HRV, sleep, blood oxygen, breathing rate, skin temperature, activity. Each is compared with the person's own 14-day usual (`lib/health/base.ts`, limits in `LIM`), with plain-language "what this means" and "on a mission" text per reading. Shows clearly labelled sample data until a band is connected with Google sign-in. Last pull is cached in IndexedDB so it reads offline.

**Doesn't a cloud API break "offline"?** The exam never touches it. The band section is context: it needs a network to sync and keeps the last sync on the phone. On a Mars mission the same readings would come from the band over Bluetooth, not from Google; the scoring and screens would not change. If asked, say that plainly.
