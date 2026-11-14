// A short beep for a good scan, a low buzz for a problem, so a cashier can
// tell without looking at the screen. Never throws: sound must not block work.
let audio: AudioContext | null = null;

export function beep(ok: boolean) {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audio ??= new Ctx();
    void audio.resume();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = ok ? 1000 : 220;
    osc.type = ok ? "sine" : "square";
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + (ok ? 0.08 : 0.25));
  } catch {
    // ignore
  }
}
