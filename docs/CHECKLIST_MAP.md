# Flag to action mapping (Task 8, owner B)

One row per flag the scoring engine can raise. Flag ids match `FlagId` in `lib/types.ts`. "Do now"
and "Contact flight surgeon when" are the exact text for the result card. Source keys in brackets
point to `SOURCES.md`, which has the URLs.

## Rule on every card

Do the safe thing first, then send the message. Do not wait for a reply before acting. With a
communication delay this is the only order that works, and it is the ISS rule: "In an emergency or
during Loss of Signal, begin appropriate treatment; then call Surgeon as soon as possible." [MC,
NOTE in SLEEPING PROBLEMS - INSOMNIA, p. 436, and other procedures]

## Mapping

| Flag id | Trigger (as coded) | Do now | Contact flight surgeon when | Source |
|---|---|---|---|---|
| pupil_uneq | either pupil rated "unequal" | In dim light, check again that both pupils are the same size and both get smaller in the light, and ask about headache, blurred or double vision, and any knock to the head. | Now if the difference is new, a pupil does not react, or there is a head knock, confusion, vomiting, vision change, or weakness in an arm or leg. | [MC] HEAD OR NECK INJURY p. 352, step 5 "Difference in pupil size: R > L / R = L / R < L"; PHS - WITH BLOOD LABS p. 696, eyes: "unequal size, unreactive to light" |
| pupil_slow | one or both pupils rated "sluggish" | Recheck both eyes in dim light, holding the light steady for a few seconds, and ask about headache, vision change, or any new medicine. | Now if either pupil does not react at all; the same day if it is still sluggish on recheck. | [MC] HEAD OR NECK INJURY p. 352, step 6 "Pupil reaction to light ... Present / Absent"; PHS p. 696 |
| hr_high | standing minus sitting HR > 30 bpm | Sit or lie them down now, legs raised if dizzy, give water, and do not let them stand alone until they feel normal. | Now if they felt lightheaded, sick, had tunnel vision or fainted; otherwise if it is high again at the next exam. | [OI] presyncope is "light headedness, nausea, tunnel vision, or a systolic pressure below 70 mmHg"; [STD2] §6.3.2 [V2 6109] fluid loading |
| bal_bad | Romberg: marked sway or stepped out | Stay close enough to catch them, help them sit, and ask about dizziness, spinning or nausea; no climbing or EVA prep until rechecked. | Now if they fall, cannot stand without help, or have a new headache, vision change, weakness on one side or slurred speech; otherwise if it fails again at the next exam. | [WOOD] slide 12, post-flight neuro exam, "Standing/ Romberg 22.2%" positive on landing day; [ROS] §2.2 Field Test; [STD1] §4.2 |
| sleep_low | under 6 h sleep this exam and the last | Protect the next sleep period: lights out on time, eye mask and earplugs in, sleep station dark and quiet. | If short sleep goes on for more than a few nights, sleep medicine is needed more than a few nights in a row, or before EVA, landing or piloting. | [SLEEP] "sleep restriction of 5-6 hours a night ... results in impaired performance within a week"; [MC] SLEEPING PROBLEMS - INSOMNIA p. 436, "If sleeping medications are required more than a few nights in a row, discuss with Surgeon" |
| mood_low | mood 2 or lower out of 5 | Ask in private how they are and what is weighing on them, listen without judging, and ask straight out whether they have had thoughts of harming themselves. | Now, as an emergency, if they mention self-harm; the same day if mood is low again at the next exam or is affecting work or sleep. | [BMED] adverse condition is "any decrement in mood ... that adversely affects operational readiness"; under-reporting from "astronaut reluctance to report such symptoms"; [MC] BEHAVIORAL - SUICIDAL p. 498 |
| rx_slow | median reaction > own baseline + 20% | Retake the test once after a short break, seated and with no distractions; if still slow, check last night's sleep and the cabin CO2 reading, and have a crewmate double-check critical steps today. | If it is still slow on retest at two exams in a row, or it comes with headache, confusion or another flag. | [PVT] 3-minute PVT-B; [COG] Cognition battery; [STD2] §6.2.1.3 [V2 6004] CO2 one-hour average "no more than 3 mmHg"; [CO2] |

Rules for writing actions:
- Plain words an exhausted person can follow.
- Never diagnose. Say what to check and when to escalate.
- If the source does not support a threshold we chose, change the threshold, not the source.

## Threshold review (for tasks 2 and 6)

The sources support every action above. Several of our thresholds are stricter or looser than the
sources, or not in them at all. Nothing in `lib/scoring.ts` is changed by this task; these are
proposals for whoever owns scoring and the station flow.

| Flag | What the source says | Proposal |
|---|---|---|
| pupil_slow | [MC] grades the light reaction only as present or absent. No "sluggish" grade. | Keep "sluggish" as a recheck prompt only. Add a "no reaction" option and escalate on that. Rate size (equal / unequal) once for both eyes, and reaction per eye, instead of one three-way rating per eye. |
| hr_high | NASA defines orthostatic intolerance by symptoms and blood pressure [OI], not a bpm rise. NASA stand tests run 3.5 to 10 minutes. 30 bpm is the civilian POTS cut-off, not found in a NASA source. | Stand 3 minutes and count from 3:00 to 3:15. Flag on any symptom (lightheaded, sick, tunnel vision): stop the test. Keep a rise of 30 bpm or more as a second flag. A 15-second count × 4 is only accurate to ±4 bpm per reading. |
| bal_bad | Romberg is part of NASA's post-flight neuro exam, but less sensitive than the eyes-closed tandem walk (22.2% vs 57.0% positive on landing day) [WOOD]. No source defines "marked sway". | Flag on a clear fail: stepped out, opened eyes, or needed support inside 30 s. Treat marked sway alone as a recheck. Consider adding the tandem walk [ROS]. |
| sleep_low | Direction supported [SLEEP]. No two-night rule in a source. Crews average about 6 h in flight, so this will fire often. | Keep 6 h. If exams are days apart, ask for average sleep over the last 3 nights instead of last night. |
| mood_low | No number in the source; it is framed as any drop from the person's own normal [BMED]. | Flag at 2 or lower, or at 2 or more points below the person's baseline. The second rule is our own heuristic. |
| rx_slow | Validated test is the 3-minute PVT-B with 1 to 4 s random gaps; lapses are responses of 355 ms or more [PVT]. Shorter 90 s and 2 min versions were "too insensitive". No source gives +20%. Scores improve over the first two or three sessions [COG]. | Run 3 minutes, not 10 taps. Do two practice runs before the baseline exams count. Flag on more lapses than the highest baseline count, confirmed on one retest. |

### Gravity

The orthostatic and Romberg stations need gravity. They work on a planet's surface and after
landing, not in transit or on ISS. NASA's own framing fits the pitch: Mars crews "will be landing on
planetary bodies with no ground-support teams" [OI]. The station flow should say this, or skip both
stations when the crew marks the exam as in transit.
