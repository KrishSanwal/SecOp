# Second Opinion

**NASA Space Apps 2026, Delhi. Challenge: Create Health Monitoring Software for Astronauts on Space Missions. Team Vortexx.**

On a Mars crew of four, your crewmate is your doctor. Second Opinion is a voice-guided five-minute
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
cp .env.example .env.local   # fill GROQ_API_KEY
npm run dev
```

Open http://localhost:3000.

## Stack

Next.js (App Router) on Vercel, TypeScript, Tailwind. Voice: Groq Whisper (speech to text),
Groq LLM (parse spoken answers), Groq Orpheus (text to speech). Storage: IndexedDB via `idb`.
No wearables, no backend database.

## NASA data and resources used

- ISS Medical Checklist (JSC-48522), NASA public document: exam procedures and decision branches
- NASA-STD-3001 Human Systems Standard: physiological limits
- NASA Human Research Roadmap: risk definitions (altered gravity, isolation, radiation, closed environment)
- NASA Human Research Program publications on orthostatic intolerance and post-flight balance

Full list with links: `docs/SOURCES.md`.

## Use of AI tools (SI disclosure)

Code and documentation were written with AI assistance (Claude Code, Anthropic). All logic was
reviewed and tested by the team. No NASA branding is used anywhere in the project.

## Not a medical device

Second Opinion is a hackathon prototype. It is not validated for clinical use.

## Team

Vortexx, Delhi. See `PLAN.md` for the build plan and task split.
