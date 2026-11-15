# Sources

Every resource used in the project, for the submission form. Verify each link opens before submitting.
Keys in brackets are how `CHECKLIST_MAP.md` cites them. All links below were checked on 14 Nov 2026 (JPL added 15 Nov 2026).

## NASA

| Key | Name | URL | Used for |
|---|---|---|---|
| MC | ISS Medical Checklist, JSC-48522-E4, 12 Nov 2001 (archived copy; the original nasa.gov link now returns 404 and no newer revision is public) | http://web.archive.org/web/20230519222418/https://www.nasa.gov/centers/johnson/pdf/163533main_ISS_Med_CL.pdf | pupil exam, sleep and behavioral procedures, escalation rule |
| TB044 | OCHMO-TB-044 Medical Operations (2025): crew medical officers train on "all medical procedures in JSC 48522" | https://www.nasa.gov/wp-content/uploads/2025/08/ochmo-tb-044-medical-operations.pdf | shows the checklist is still the current crew procedure set |
| STD1 | NASA-STD-3001 NASA Spaceflight Human-System Standard, Volume 1, Revision C | https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf | gravity transition effects (§4.2) |
| STD2 | NASA-STD-3001 NASA Spaceflight Human-System Standard, Volume 2, Revision F | https://www.nasa.gov/wp-content/uploads/2025/05/nasa-std-3001-vol-2.pdf | CO2 limit [V2 6004], fluid loading [V2 6109] |
| OI | HRP Evidence Report: Risk of Orthostatic Intolerance During Re-exposure to Gravity (2015) | https://ntrs.nasa.gov/api/citations/20150007319/downloads/20150007319.pdf | orthostatic HR station |
| SLEEP | HRP Evidence Report: Risk of Performance Decrements and Adverse Health Outcomes Resulting from Sleep Loss, Circadian Desynchronization, and Work Overload (2016) | https://ntrs.nasa.gov/api/citations/20160003864/downloads/20160003864.pdf | sleep threshold |
| BMED | HRP Evidence Report: Risk of Adverse Cognitive or Behavioral Conditions and Psychiatric Disorders (2016) | https://ntrs.nasa.gov/api/citations/20160004365/downloads/20160004365.pdf | mood station |
| WOOD | Wood, Sensorimotor adaptation during and following spaceflight, NASA JSC (2021) | https://ntrs.nasa.gov/api/citations/20210025094/downloads/Wood-AeroMed%20UTHNeuro-Dec21.pdf | Romberg in the post-flight neuro exam |
| ACTI | NASA ISS experiment: Actiwatch Spectrum (sleep-wake actigraphy and light exposure, worn by crew, downloaded periodically) | https://www.nasa.gov/mission/station/research-explorer/investigation/?#id=869 | wearables page: what crews wear today |
| BIOM | CSA Bio-Monitor (Astroskin smart shirt: ECG, heart rate, breathing, SpO2, skin temperature, activity) | https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp | wearables page: vitals stream crews already generate |
| | NASA Human Research Roadmap | https://humanresearchroadmap.nasa.gov/ | risk definitions |
| | NASA Human Research Program | https://www.nasa.gov/hrp/ | background |
| JPL | NASA JPL Solar System Dynamics, Approximate Positions of the Planets (Keplerian elements, Standish and Williams), Table 1 | https://ssd.jpl.nasa.gov/planets/approx_pos.html | Earth and Mars orbital elements in `lib/mars.ts`: live Earth-Mars distance and one-way light delay on the result card |
| | NASA Open Science Data Repository | https://osdr.nasa.gov/ | background reading only; no OSDR dataset is used in the app |
| | NASA human spaceflight standards index | https://www.nasa.gov/ochmo/human-spaceflight-and-aviation-standards | which standard revisions are current |

## NASA-funded research

| Key | Name | URL | Used for |
|---|---|---|---|
| ROS | Rosenberg et al. 2022, Frontiers in Physiology: post-flight Field Test (NASA HRP funded) | https://www.frontiersin.org/articles/10.3389/fphys.2022.921368/pdf | balance, tandem walk |
| PVT | Basner, Mollicone, Dinges 2011: validity and sensitivity of a brief PVT-B (NSBRI / NASA) | https://pmc.ncbi.nlm.nih.gov/articles/PMC3197786/ | reaction test length, lapse threshold |
| COG | Basner et al. 2015: Cognition test battery for spaceflight | https://pmc.ncbi.nlm.nih.gov/articles/PMC4691281/ | practice effects, baseline |
| CO2 | Scully et al. 2019: effects of acute CO2 on cognitive function | https://pmc.ncbi.nlm.nih.gov/articles/PMC6584569/ | CO2 as a check, not a cause |

## Other

| Name | URL | Used for |
|---|---|---|
| Groq API | https://groq.com/ | Orpheus text-to-speech, used once to record the fixed voice prompts |
| Next.js | https://nextjs.org/ | web framework |
| idb | https://github.com/jakearchibald/idb | IndexedDB wrapper |
