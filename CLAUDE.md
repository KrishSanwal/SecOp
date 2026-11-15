# SecOp: rules for AI sessions

Read `PLAN.md` first. It is the design and the task list.

- No AI API keys in the app. Voice prompts are pre-recorded once with Groq Orpheus (`npm run audio`,
  build-time only). Never edge-tts, never VAPI, never ElevenLabs, never Twilio, no runtime LLM calls.
- Vercel: never set `runtime = 'edge'` on any route. Node runtime only.
- Buttons are the primary input. Voice is a layer on top. Never make a step voice-only.
- Storage is IndexedDB in the browser. No server database, no accounts of our own. The one exception is
  the optional Google sign-in on the wearables page (`/api/health`); the exam must never depend on it.
- No NASA logos, flags or mission identifiers anywhere, including generated images.
- Any AI-generated image or audio in the demo carries a visible watermark or a text acknowledgement.
- Code style: almost no comments. Only when the why is not obvious, and one short line max. No
  doc blocks, no section banners.
- Names short and crisp: `hr`, `sway`, `base`, `rx`, `ms`, `flags`. Not `orthostaticDeltaBeatsPerMinute`.
- Commits: plain messages, no AI co-author lines.
- Validate every external call: check HTTP status, wrap JSON parsing, fail with a clear message.
- Secrets come from `.env.local`, never committed. `.env.example` lists the names only.
