let ctx: AudioContext | null = null;
let muted = false;

if (typeof window !== "undefined") {
  try {
    muted = localStorage.getItem("ec_muted") === "1";
  } catch {}
}

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function setMuted(v: boolean) {
  muted = v;
  try {
    localStorage.setItem("ec_muted", v ? "1" : "0");
  } catch {}
}
export function isMuted() {
  return muted;
}

export function playTing() {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const tones = [880, 1320];
  tones.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + i * 0.04);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.01 + i * 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7 + i * 0.04);
    osc.connect(gain).connect(c.destination);
    osc.start(now + i * 0.04);
    osc.stop(now + 0.8 + i * 0.04);
  });
}

export function playTap() {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "triangle";
  osc.frequency.value = 1600;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.1, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  osc.connect(gain).connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.15);
}
