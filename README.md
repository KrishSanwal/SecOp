# SecOp

**NASA Space Apps 2026, Delhi. Challenge: Create Health Monitoring Software for Astronauts on Space Missions. Team Vortexx.**

On a Mars crew of four, your crewmate is your doctor. SecOp (short for *second opinion*) is a voice-guided five-minute
peer exam: two astronauts check each other (pupil response, orthostatic heart rate, balance, mood,
reaction time), each scores the other, and the app compares every result to that person's own
baseline and to the procedures in NASA's ISS Medical Checklist.

The challenge says astronauts must spot changes in themselves. Our answer: you cannot see your own
decline, so we fix the blind spot with the person beside you.

## Why it works with no ground link

All records live in the browser (IndexedDB). Nothing needs Mission Control. Voice is optional:
every step has buttons, so the exam runs even if the voice service is unreachable.

## Run it

```bash
npm install
cp .env.example .env.local   # only needed for the optional wearables sign-in
npm run dev
```

Open http://localhost:3000.

## Stack

Next.js (App Router) on Vercel, TypeScript, Tailwind. Voice prompts are pre-recorded MP3s, so the exam
needs no API key and no network. Sensors: MediaPipe Face Landmarker, camera PPG, device motion.
Storage: IndexedDB via `idb`. No backend database. Optional wearables page reads a wearable through the
Google Health API when the two Google OAuth variables are set.

## NASA data and resources used

- ISS Medical Checklist (JSC-48522), NASA public document: exam procedures and decision branches
- NASA-STD-3001 Human Systems Standard: physiological limits
- NASA Human Research Roadmap: risk definitions (altered gravity, isolation, radiation, closed environment)
- NASA Human Research Program publications on orthostatic intolerance and post-flight balance
- NASA-funded research on the PVT-B reaction test and the spaceflight Cognition battery (Basner et al.): reaction station
- NASA JPL Solar System Dynamics, Keplerian elements for the approximate positions of the planets: the live
  Earth-Mars light delay on the result card (`lib/mars.ts`)

Full list with links: `docs/SOURCES.md`.

## Use of AI tools (SI disclosure)

The idea, the exam design and the decisions behind it are our own. Code and documentation were written
with AI assistance (Claude Code, Anthropic). All logic was reviewed and tested by the team. The spoken exam prompts (`public/audio/*.mp3`) are AI-generated speech
(Groq, Orpheus text-to-speech); their source text is in `lib/prompts.ts`. No NASA branding is used anywhere in the project.

## Not a medical device

SecOp is a hackathon prototype. It is not validated for clinical use.

## Team

Vortexx, Delhi. See `PLAN.md` for the build plan and task split.
