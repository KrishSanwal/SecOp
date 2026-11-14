# Second Opinion: rules for AI sessions

Read `PLAN.md` first. It is the design and the task list.

- Voice stack is Groq only: Whisper for STT, a Groq LLM for parsing, Groq Orpheus for TTS. Never
  edge-tts, never VAPI, never ElevenLabs, never Twilio.
- Vercel: never set `runtime = 'edge'` on any route. Node runtime only.
- Buttons are the primary input. Voice is a layer on top. Never make a step voice-only.
- Storage is IndexedDB in the browser. No server database, no accounts.
- No NASA logos, flags or mission identifiers anywhere, including generated images.
- Any AI-generated image or audio in the demo carries a visible watermark or a text acknowledgement.
- Commits: plain messages, no AI co-author lines.
- Validate every external call: check HTTP status, wrap JSON parsing, fail with a clear message.
- Secrets come from `.env.local`, never committed. `.env.example` lists the names only.
