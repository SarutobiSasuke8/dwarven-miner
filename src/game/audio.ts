let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfx: GainNode | null = null;
let muted = false;

function context() {
  if (!ctx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctx({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfx = ctx.createGain();
    sfx.connect(master);
    master.connect(ctx.destination);
    master.gain.value = muted ? 0 : 0.7;
    sfx.gain.value = 1;
  }
  return ctx;
}

export function unlockAudio() {
  const audio = context();
  if (audio.state === "suspended") void audio.resume();
}

export function setMuted(next: boolean) {
  muted = next;
  if (!master || !ctx) return;
  master.gain.setTargetAtTime(next ? 0 : 0.7, ctx.currentTime, 0.02);
}

export function resumeAudio() {
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  gain: number,
  slide = 0,
) {
  if (!ctx || !sfx || muted) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), now + dur);
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(gain, now + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(amp);
  amp.connect(sfx);
  osc.start(now);
  osc.stop(now + dur + 0.02);
  osc.onended = () => {
    osc.disconnect();
    amp.disconnect();
  };
}

export function playSwing() {
  const wobble = 0.92 + Math.random() * 0.16;
  tone(140 * wobble, 0.09, "triangle", 0.22, -70);
  tone(420 * wobble, 0.05, "square", 0.04, -200);
}

export function playUpgrade() {
  tone(520, 0.08, "triangle", 0.12);
  tone(780, 0.12, "triangle", 0.1);
}

export function playHire() {
  tone(330, 0.1, "triangle", 0.12);
  tone(440, 0.12, "triangle", 0.12);
  tone(660, 0.18, "triangle", 0.14);
}

export function playDeny() {
  tone(110, 0.12, "sawtooth", 0.05, -30);
}
