#!/usr/bin/env bash
# Creates one GitHub issue per task in PLAN.md. Run once, after the repo exists:
#   bash tools/create-issues.sh KrishSanwal/SecOp
set -euo pipefail
REPO="${1:?usage: create-issues.sh owner/repo}"

mk() { # title, owner label, body
  gh issue create --repo "$REPO" --title "$1" --label "$2" --body "$3" >/dev/null && echo "created: $1"
}

gh label create "owner-A" --repo "$REPO" --color 1d76db --description "Shaurya" 2>/dev/null || true
gh label create "owner-B" --repo "$REPO" --color 0e8a16 --description "teammate" 2>/dev/null || true
gh label create "shared"  --repo "$REPO" --color 5319e7 --description "both" 2>/dev/null || true

mk "1. Deploy to Vercel, env vars" owner-A "Done when: the Vercel URL loads the home page. No edge runtime on any route. GROQ_* vars set in Vercel project settings."
mk "2. lib/scoring.ts: station types, baseline, delta, flag rules, unit tests" owner-A "Done when: npm test is green. Flags and thresholds per PLAN.md 'Scoring'."
mk "3. lib/db.ts: IndexedDB crew + exams stores, JSON export" owner-A "Done when: add/list/get work in the browser; export downloads a JSON file. Use the idb package."
mk "4. Groq API routes: /api/stt, /api/tts, /api/parse" owner-A "Done when: each route answers a curl with audio / text / JSON. Check HTTP status, wrap JSON parsing, clear error messages. Node runtime only."
mk "5. Crew screen /" owner-B "Done when: pick subject and examiner (two cards, swap button), continue to /exam. Dark UI, one accent colour."
mk "6. Station flow /exam: 5 station screens, timers, buttons" owner-B "Done when: a full exam completes and saves via lib/db.ts. Order and measurements per PLAN.md 'The five stations'. Buttons first; voice comes in task 9."
mk "7. Result card /result/[id] with flags and action cards" owner-B "Done when: shows each station's delta vs baseline and one action card per flag, text from docs/CHECKLIST_MAP.md."
mk "8. docs/CHECKLIST_MAP.md: flag to action mapping with NASA citations" owner-B "Done when: every flag row has 'do now', 'contact flight surgeon when', and a source that appears in docs/SOURCES.md with a working URL. ISS Medical Checklist first."
mk "9. Wire voice into the station flow" owner-A "Done when: the exam runs hands-free on a phone: prompt spoken (TTS), answer heard (STT), value parsed and filled. Buttons still work."
mk "10. Seed data for the demo" owner-A "Done when: two crew with two baseline exams each plus one drifted exam; the result card shows a real flag. One-click 'load demo crew' button."
mk "11. Demo video, 30 seconds, unlisted on YouTube" owner-B "Done when: the link opens in an incognito window. Story: two crew, five stations, one flag, one action. Any AI-generated image carries a visible watermark. No NASA logos."
mk "12. Submission form: text, NASA links, SI disclosure, Submit for Judging" shared "Done when: Space Apps project page shows Submitted. Deadline Sun 15 Nov 23:59 IST. Target submit time 21:00."
