import type { PromptId } from "./prompts";
import { voiceOn } from "./voice";

const RATE = 1.25;

let cur: HTMLAudioElement | null = null;
let curId: PromptId | null = null;
let stop: ((ended: boolean) => void) | null = null;

function cut() {
  cur?.pause();
  cur = null;
  curId = null;
  stop?.(false);
  stop = null;
}

export function say(id: PromptId, tap = false): Promise<boolean> {
  cut();
  if (!tap && !voiceOn()) return Promise.resolve(true);
  const a = new Audio(`/audio/${id}.mp3`);
  a.defaultPlaybackRate = RATE;
  a.playbackRate = RATE;
  cur = a;
  curId = id;
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

export function hushIf(ids: PromptId[]) {
  if (curId && ids.includes(curId)) cut();
}
