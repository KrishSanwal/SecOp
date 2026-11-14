// Needs ffmpeg on PATH. Run: doppler run -p portfolio -c dev -- npm run audio   (or with GROQ_API_KEY in env)
import { mkdir, readFile, writeFile, access, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath as fp } from "node:url";

const key = process.env.GROQ_API_KEY?.trim();
if (!key) {
  console.error("GROQ_API_KEY not set");
  process.exit(1);
}
const model = process.env.GROQ_TTS_MODEL || "canopylabs/orpheus-v1-english";
const voice = process.env.GROQ_TTS_VOICE || "hannah";
const force = process.argv.includes("--force");

const src = await readFile(new URL("../lib/prompts.ts", import.meta.url), "utf8");
const pairs = [...src.matchAll(/^\s+(\w+): "([^"]+)",$/gm)].map((m) => [m[1], m[2]]);
if (!pairs.length) {
  console.error("no prompts parsed from lib/prompts.ts");
  process.exit(1);
}

const dir = new URL("../public/audio/", import.meta.url);
await mkdir(dir, { recursive: true });

let made = 0;
for (const [id, text] of pairs) {
  const wav = new URL(`${id}.wav`, dir);
  const out = new URL(`${id}.mp3`, dir);
  const txt = new URL(`${id}.txt`, dir);
  const same = await readFile(txt, "utf8").then((t) => t === text, () => false);
  if (!force && same && (await access(out).then(() => true, () => false))) continue;

  for (let n = 1; ; n++) {
    const res = await fetch("https://api.groq.com/openai/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, voice, input: text, response_format: "wav" }),
    });
    if (res.ok) {
      await writeFile(wav, Buffer.from(await res.arrayBuffer()));
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", fp(wav), "-ac", "1", "-b:a", "48k", fp(out)]);
      await rm(wav);
      await writeFile(txt, text);
      made++;
      console.log("ok", id);
      break;
    }
    const body = (await res.text()).slice(0, 160);
    if (res.status === 429 && n < 5) {
      console.log("429, waiting", id);
      await new Promise((r) => setTimeout(r, 5000 * n));
      continue;
    }
    console.error(`fail ${id}: ${res.status} ${body}`);
    process.exit(1);
  }
}
await writeFile(new URL("index.json", dir), JSON.stringify(pairs.map(([id]) => id)));
console.log(`${made} generated, ${pairs.length - made} unchanged`);
