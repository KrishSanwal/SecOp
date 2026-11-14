import type { PromptId } from "./prompts";

let cur: HTMLAudioElement | null = null;

export function say(id: PromptId): Promise<void> {
  cur?.pause();
  const a = new Audio(`/audio/${id}.mp3`);
  cur = a;
  return new Promise((done) => {
    a.onended = () => done();
    a.onerror = () => done();
    a.play().catch(() => done()); // autoplay blocked: buttons still work
  });
}

export function hush() {
  cur?.pause();
  cur = null;
}
