import type { PromptId } from "./prompts";

let cur: HTMLAudioElement | null = null;
let stop: ((ended: boolean) => void) | null = null;

function cut() {
  cur?.pause();
  cur = null;
  stop?.(false);
  stop = null;
}

export function say(id: PromptId): Promise<boolean> {
  cut();
  const a = new Audio(`/audio/${id}.mp3`);
  cur = a;
  return new Promise((done) => {
    stop = done;
    const fin = () => {
      if (stop === done) stop = null;
      done(true);
    };
    a.onended = fin;
    a.onerror = fin;
    a.play().catch(fin); // autoplay blocked: buttons still work
  });
}

export function hush() {
  cut();
}
