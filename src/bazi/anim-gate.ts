// Пуск декоративных анимаций (фон и живые стихии): по первому действию человека (17.10: без таймера — на медленном
// процессоре таймер запускал дорогие кадры посреди загрузки).
// До пуска стихии показаны неподвижным кадром. Иначе на слабом телефоне анимация делит процессор с расчётом
// и первой отрисовкой (17.10: Lighthouse мобильный 61, блокировка 3,6 с).
let go = typeof document === 'undefined';
const waiters: (() => void)[] = [];
const fire = () => { if (go) return; go = true; document.documentElement.classList.add('anim-on'); waiters.splice(0).forEach((f) => f()); };
if (!go) {
  // без scroll: страница сама прокручивается к разбору
  for (const ev of ['pointerdown', 'touchstart', 'keydown', 'wheel']) addEventListener(ev, fire, { once: true, passive: true });
}
export const animStarted = () => go;
/** Слабое устройство: средний кадр дороже бюджета — анимации останавливаются на текущем кадре, CSS-эффекты на паузе. */
let slow = false;
export const animSlow = () => slow;
export function frameCost(): (ms: number, budget: number) => boolean {
  let ema = 0, n = 0;
  return (ms, budget) => {
    ema = n++ ? ema * 0.85 + ms * 0.15 : ms;
    if (n > 12 && ema > budget && !slow) { slow = true; document.documentElement.classList.add('anim-slow'); }
    return slow;
  };
}
export const whenAnim = (f: () => void) => { if (go) f(); else waiters.push(f); };
