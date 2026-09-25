// Звук через Web Audio API — без файлов, всё генерируется осцилляторами.
// AudioContext создаётся лениво, при первом вызове (обычно из клика — браузеры
// блокируют звук до жеста пользователя, и это ровно то, что нам нужно).
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface ToneOptions {
  type?: OscillatorType;
  gain?: number;
  delay?: number;
}

function tone(freq: number, duration: number, opts: ToneOptions = {}) {
  const audioCtx = getCtx();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.value = freq;

  const start = audioCtx.currentTime + (opts.delay ?? 0);
  const peak = opts.gain ?? 0.15;
  gainNode.gain.setValueAtTime(0, start);
  gainNode.gain.linearRampToValueAtTime(peak, start + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);

  osc.connect(gainNode).connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

/** Подброс монетки — два коротких высоких блика, "дзынь-дзынь" */
export function playFlip() {
  tone(1200, 0.12, { type: "triangle", gain: 0.12 });
  tone(1700, 0.12, { type: "triangle", gain: 0.1, delay: 0.09 });
}

/** Выигрыш — короткий яркий восходящий перезвон */
export function playWin() {
  tone(660, 0.1, { type: "square", gain: 0.1 });
  tone(880, 0.12, { type: "square", gain: 0.1, delay: 0.08 });
  tone(1100, 0.16, { type: "square", gain: 0.12, delay: 0.16 });
}

/** Проигрыш — глухой короткий низкий сигнал */
export function playLose() {
  tone(180, 0.25, { type: "sawtooth", gain: 0.1 });
}

/** Нейтральный клик — для отказов/пропуска раунда */
export function playClick() {
  tone(300, 0.05, { type: "square", gain: 0.06 });
}

// ---------- Настоящие звуковые файлы (frontend/public/sounds) ----------

const audioCache = new Map<string, HTMLAudioElement>();

function getAudio(src: string): HTMLAudioElement {
  let audio = audioCache.get(src);
  if (!audio) {
    audio = new Audio(src);
    audioCache.set(src, audio);
  }
  return audio;
}

/** Проигрывает файл. cloneNode — чтобы быстрые повторные вызовы не обрывали друг друга */
function playSample(src: string, opts: { rate?: number; volume?: number } = {}) {
  const audio = getAudio(src).cloneNode() as HTMLAudioElement;
  audio.playbackRate = opts.rate ?? 1;
  audio.volume = opts.volume ?? 1;
  void audio.play().catch(() => {});
}

/** Накачка шарика: тон растёт вместе с pumpIndex — к концу диапазона звук выше */
export function playBalloonRub(pumpIndex: number, maxPumps: number) {
  const rate = 0.9 + 0.6 * Math.min(1, pumpIndex / maxPumps);
  playSample("/sounds/balloon-rub.mp3", { rate, volume: 0.5 });
}

export function playBalloonPop() {
  playSample("/sounds/balloon-pop.mp3", { volume: 0.7 });
}
