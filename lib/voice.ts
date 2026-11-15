const K = "so-voice";
const EV = "so-voice";

export function voiceOn() {
  try {
    return localStorage.getItem(K) !== "off";
  } catch {
    return true;
  }
}

export function setVoice(on: boolean) {
  try {
    localStorage.setItem(K, on ? "on" : "off");
  } catch {}
  window.dispatchEvent(new Event(EV));
}

export function onVoice(fn: () => void) {
  window.addEventListener(EV, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(EV, fn);
    window.removeEventListener("storage", fn);
  };
}
