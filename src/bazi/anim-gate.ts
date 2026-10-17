// Пуск декоративных анимаций (фон и живые стихии): по первому действию человека или через 5 с после загрузки.
// До пуска стихии показаны неподвижным кадром. Иначе на слабом телефоне анимация делит процессор с расчётом
// и первой отрисовкой (17.10: Lighthouse мобильный 61, блокировка 3,6 с).
let go = typeof document === 'undefined';
const waiters: (() => void)[] = [];
const fire = () => { if (go) return; go = true; document.documentElement.classList.add('anim-on'); waiters.splice(0).forEach((f) => f()); };
if (!go) {
  // без scroll: страница сама прокручивается к разбору
  for (const ev of ['pointerdown', 'touchstart', 'keydown', 'wheel']) addEventListener(ev, fire, { once: true, passive: true });
  const later = () => setTimeout(fire, 5000);
  if (document.readyState === 'complete') later(); else addEventListener('load', later, { once: true });
}
export const animStarted = () => go;
export const whenAnim = (f: () => void) => { if (go) f(); else waiters.push(f); };
