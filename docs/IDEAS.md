# What else Second Opinion could do

Ranked by how much each strengthens the pitch for the time it costs. **Bold = buildable before Sunday 21:00.**
The rest are "roadmap" answers for the Q&A ("what would you do with more time?").

## Fits in the weekend

1. **Red filter mode for pupils.** A square of red cellophane over the back camera turns the phone into the far-red pupillometer from the 2023 Scientific Reports paper. Add a "filter fitted" toggle that skips the contrast warning. Demo prop: a ₹10 gel that makes a phone work on dark eyes. (2 h)
2. **Mission Control packet.** One button on the result screen that compresses the exam into a ~1 KB text summary to queue for the next comms window. Shows we thought about bandwidth and the 4-24 minute Mars delay. (1 h)
3. **Trend view.** Per person, one line per metric across all exams, baseline band shaded. Judges see "drift detection" instead of hearing about it. (2 h)
4. **In-transit mode** (issue #20). Skips gravity stations; turns a limitation into a design decision. (1 h)

## Strong roadmap answers

5. **Voice-only exam.** Examiner never touches the screen: the app speaks each step and listens for "done". Needs on-device speech recognition to stay offline; offline needs an on-device model (Whisper tiny in WebGPU).
6. **Crew-wide view.** Four crew, everyone examined daily, a matrix of who is drifting. Catches a cabin cause (CO2, a bad batch of food) when everyone drifts together.
7. **Speech biomarkers.** Record the "anything bothering you?" answer; track speaking rate and pause length vs baseline. Fatigue and low mood change speech before people report them.
8. **Eye-movement test (saccades).** Front camera tracks the iris while a dot jumps on screen. Latency of eye movements is a known fatigue and concussion marker. Reuses the MediaPipe iris model we already ship.
9. **Grip and tremor.** Hold the phone at arm's length 10 s; the motion sensor measures tremor. Relevant to radiation and neuro checks; zero new hardware.
10. **Breathing rate.** Phone on the chest during the balance test also sees breathing (slow chest motion). One more vital for free.
11. **Skin and wound photo log.** Same-angle photos over time with a colour card; skin rashes and slow-healing wounds are documented ISS issues.
12. **Medication and countermeasure log.** Exercise minutes, sleep pills, caffeine; correlate with drift ("reaction slows on days after sleep medication").
13. **Analog-mission pilot.** Run it at a Mars analog (HI-SEAS, MDRS, or India's own ladakh analog site) where crews live isolated for weeks. Real data instead of demo data.
14. **Earth use.** The same five-minute peer exam fits places with no doctor: Antarctic stations, ships, mines, rural health workers (ASHA workers in India), soldiers at altitude.

## Not doing, and why (good Q&A answers)
- **No AI diagnosis.** We flag drift and point to NASA's own checklist; the flight surgeon decides. Safer, explainable, and the checklist is what astronauts actually train on.
- **No wearables.** Every crew already carries a phone or tablet; extra hardware is mass and another thing to break.
- **No cloud.** Mars has no internet; everything runs on the device.
