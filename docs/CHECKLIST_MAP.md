# Flag to action mapping (Task 8, owner B)

Every flag the scoring engine can raise needs one row here. The action text is what the result card
shows. The source must be a public NASA document or HRP publication, with a URL in `SOURCES.md`.

Format: do now (one sentence), contact flight surgeon when (one sentence), source.

| Flag id | Trigger | Do now | Contact flight surgeon when | Source |
|---|---|---|---|---|
| pupil_sluggish | one or both pupils sluggish | | | ISS Medical Checklist, neuro assessment |
| pupil_unequal | pupils unequal | | | ISS Medical Checklist, neuro assessment |
| ortho_high | standing minus sitting HR > 30 bpm | | | NASA orthostatic intolerance studies |
| romberg_marked | marked sway or stepped out | | | NASA post-flight balance studies |
| sleep_low | < 6 h two consecutive exams | | | HRP sleep and fatigue risk |
| mood_low | mood <= 2 | | | HRP behavioral health risk |
| reaction_slow | median > baseline + 20% | | | NASA Cognition battery, CO2 studies |

Rules for writing actions:
- Plain words an exhausted person can follow.
- Never diagnose. Say what to check and when to escalate.
- If the source does not support a threshold we chose, change the threshold, not the source.
