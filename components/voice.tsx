"use client";

import { useSyncExternalStore } from "react";
import { hush } from "@/lib/say";
import { onVoice, setVoice, voiceOn } from "@/lib/voice";

export const useVoice = () => useSyncExternalStore(onVoice, voiceOn, () => true);

export function VoiceSwitch({ wide }: { wide?: boolean }) {
  const on = useVoice();
  const flip = () => {
    if (on) hush();
    setVoice(!on);
  };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={flip}
      className={`group inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-[3px] text-left ${wide ? "w-full justify-between" : "-mr-1 px-1"}`}
    >
      <span className="flex flex-col leading-tight">
        <span className="font-semibold text-ink">Voice prompts</span>
        {wide && <span className="text-sm text-dim">{on ? "Spoken instructions on" : "Silent: read the screen"}</span>}
      </span>
      <span
        aria-hidden
        className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-150 ${on ? "border-accent bg-accent" : "border-edge bg-panel"}`}
      >
        <span
          className={`absolute top-1/2 size-5 -translate-y-1/2 rounded-full transition-[left,background-color] duration-150 ${on ? "left-[calc(100%-1.375rem)] bg-on-accent" : "left-0.5 bg-dim"}`}
        />
      </span>
    </button>
  );
}
