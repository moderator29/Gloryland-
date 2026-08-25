let ctx: AudioContext | null = null;
let muted = false;
let ambient: { osc: OscillatorNode[]; gain: GainNode } | null = null;
let ambientOn = false;

if (typeof window !== "undefined") {
  try {
    muted = localStorage.getItem("hal_muted") === "1";
    ambientOn = localStorage.getItem("hal_ambient") === "1";
  } catch {
    /* ignore */
  }
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
  // Browsers create the context suspended until a user gesture; resume it so
  // the very first tap is audible rather than silently swallowed.
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

export function setMuted(v: boolean) {
  muted = v;
  try {
    localStorage.setItem("hal_muted", v ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (v && ambient) stopAmbient();
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

const TIER_CHORDS: Record<string, number[]> = {
  "Starter Plan": [220, 277, 330],
  "Bronze Plan": [247, 311, 370],
  "Silver Plan": [262, 330, 392],
  "Gold Plan": [294, 370, 440],
  "Legendary Plan": [330, 415, 494],
  "Immortal Plan": [392, 494, 587],
  "Platinum Plan": [523, 659, 784, 988],
};

export function playTierChord(tier: string) {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const chord = TIER_CHORDS[tier] ?? TIER_CHORDS["Gold Plan"];
  const now = c.currentTime;
  chord.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = now + i * 0.05;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.2);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + 1.3);
  });
}

const AMBIENT_CHORD = [110, 165, 220, 330];

export function startAmbient() {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  if (ambient) return;
  const gain = c.createGain();
  gain.gain.value = 0;
  gain.connect(c.destination);
  const oscs = AMBIENT_CHORD.map((freq) => {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = freq;
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = 0.08 + Math.random() * 0.1;
    lfoGain.gain.value = freq * 0.005;
    lfo.connect(lfoGain).connect(o.frequency);
    lfo.start();
    o.connect(gain);
    o.start();
    return o;
  });
  gain.gain.setValueAtTime(0, c.currentTime);
  gain.gain.linearRampToValueAtTime(0.04, c.currentTime + 2);
  ambient = { osc: oscs, gain };
  ambientOn = true;
  try {
    localStorage.setItem("hal_ambient", "1");
  } catch {
    /* ignore */
  }
}

export function stopAmbient() {
  const c = getCtx();
  if (!c || !ambient) {
    ambientOn = false;
    try {
      localStorage.setItem("hal_ambient", "0");
    } catch {
      /* ignore */
    }
    return;
  }
  const { osc, gain } = ambient;
  gain.gain.cancelScheduledValues(c.currentTime);
  gain.gain.linearRampToValueAtTime(0, c.currentTime + 1.5);
  window.setTimeout(() => {
    osc.forEach((o) => o.stop());
    gain.disconnect();
    ambient = null;
  }, 1700);
  ambientOn = false;
  try {
    localStorage.setItem("hal_ambient", "0");
  } catch {
    /* ignore */
  }
}

export function isAmbientOn() {
  return ambientOn;
}
