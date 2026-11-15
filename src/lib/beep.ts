// Short sounds for the till and the admin. Never throws: sound must never
// block real work.
let audio: AudioContext | null = null;

function context(): AudioContext | null {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audio ??= new Ctx();
    void audio.resume();
    return audio;
  } catch {
    return null;
  }
}

/** Browsers only allow sound after the person has touched the page once. */
export function unlockAudio() {
  context();
}

function tone(ctx: AudioContext, freq: number, start: number, length: number, type: OscillatorType, volume: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  osc.type = type;
  gain.gain.setValueAtTime(volume, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + length);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + length + 0.02);
}

/** A short beep for a good scan, a low buzz for a problem. */
export function beep(ok: boolean) {
  try {
    const ctx = context();
    if (!ctx) return;
    if (ok) tone(ctx, 1000, 0, 0.09, "sine", 0.08);
    else tone(ctx, 220, 0, 0.25, "square", 0.08);
  } catch {
    // ignore
  }
}

/** A rising three-note chime for a new online order. Clearly not a scan beep. */
export function chime() {
  try {
    const ctx = context();
    if (!ctx) return;
    tone(ctx, 659, 0, 0.35, "sine", 0.22); // E5
    tone(ctx, 880, 0.18, 0.35, "sine", 0.22); // A5
    tone(ctx, 1319, 0.36, 0.6, "sine", 0.22); // E6
  } catch {
    // ignore
  }
}
