/*
 * Small sounds made on the spot with Web Audio: no files to download. They
 * play only after the person turns sound on, so the first tap is theirs.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, at: number, length: number, { type = "sine", gain = 0.07, to }: { type?: OscillatorType; gain?: number; to?: number } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at;
  const osc = a.createOscillator();
  const amp = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + length);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(amp).connect(a.destination);
  osc.start(t);
  osc.stop(t + length + 0.02);
}

function whoosh(at = 0, length = 0.18) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at;
  const buffer = a.createBuffer(1, Math.ceil(a.sampleRate * length), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  src.buffer = buffer;
  const band = a.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.setValueAtTime(900, t);
  band.frequency.exponentialRampToValueAtTime(2600, t + length);
  const amp = a.createGain();
  amp.gain.setValueAtTime(0.05, t);
  src.connect(band).connect(amp).connect(a.destination);
  src.start(t);
}

export const sfx = {
  /** Turns the audio on inside the tap that enabled sound. */
  wake: () => void audio(),
  flip: () => whoosh(),
  deal: () => tone(1320, 0, 0.05, { type: "triangle", gain: 0.03 }),
  heal: (big: boolean) => {
    tone(660, 0.05, 0.22, { type: "triangle" });
    tone(990, 0.13, 0.3, { type: "triangle" });
    if (big) tone(1320, 0.22, 0.42, { type: "sine", gain: 0.05 });
  },
  hurt: () => {
    tone(196, 0.04, 0.32, { type: "triangle", gain: 0.08, to: 110 });
    tone(98, 0.04, 0.3, { type: "sine", gain: 0.06 });
  },
  calm: () => tone(523, 0.04, 0.2, { type: "sine", gain: 0.04 }),
  camp: () => [392, 494, 587, 784].forEach((f, i) => tone(f, i * 0.09, 0.6, { type: "triangle", gain: 0.05 })),
  summit: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.11, 0.9, { type: "triangle", gain: 0.05 })),
};
