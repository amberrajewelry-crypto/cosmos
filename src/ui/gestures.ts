import type { ScaleControl } from './scale';

// Жесты сцены (§4.2): колесо и пинч ведут непрерывный z лестницы масштабов; перетаскивание крутит фигуру;
// клавиши ↑/] наружу, ↓/[ внутрь — мгновенно. Подсказка жеста — один раз на устройство.
export type Drag = { x: number | null; rot: number; v: number };

export function initGestures(stageEl: HTMLElement, scale: ScaleControl, reduceMotion: boolean): Drag {
  const drag: Drag = { x: null, rot: 0, v: 0 };
  let pinchD = 0;
  stageEl.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) < 1) return;
    scale.nudge(Math.max(-0.35, Math.min(0.35, e.deltaY * (e.deltaMode === 1 ? 0.04 : 0.0022))));
  }, { passive: true });
  stageEl.addEventListener('pointerdown', (e) => { if (e.isPrimary && (e.target as HTMLElement).closest('button,a,input') == null) drag.x = e.clientX; });
  addEventListener('pointermove', (e) => { if (drag.x != null && e.isPrimary) { const d = (e.clientX - drag.x) * 0.006; drag.rot += d; drag.v = d; drag.x = e.clientX; } });
  addEventListener('pointerup', () => { drag.x = null; });
  stageEl.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 2) return;
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    if (pinchD) scale.nudge(-Math.log(d / pinchD) * 1.2); // разводим пальцы = внутрь
    pinchD = d; e.preventDefault();
  }, { passive: false });
  stageEl.addEventListener('touchend', () => { pinchD = 0; });

  const hint = document.getElementById('hint') as HTMLElement;
  const hintDone = (): void => { if (!hint.hidden && !hint.classList.contains('out')) { hint.classList.add('out'); try { localStorage.setItem('cosmos.hint', '1'); } catch { /* приватный режим */ } } };
  let hintSeen = false; try { hintSeen = !!localStorage.getItem('cosmos.hint'); } catch { /* ignore */ }
  if (!hintSeen && !reduceMotion) setTimeout(() => {
    hint.textContent = matchMedia('(pointer: coarse)').matches ? 'щипок — масштаб · потяни — поворот' : 'колесо — масштаб · потяни — поворот · ↑ ↓';
    hint.hidden = false; setTimeout(hintDone, 9000);
  }, 3600);
  stageEl.addEventListener('wheel', hintDone, { passive: true, once: true });
  stageEl.addEventListener('pointerdown', hintDone, { passive: true, once: true });

  document.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement).closest('input,textarea,select,[contenteditable]')) return;
    if (e.key === 'ArrowUp' || e.key === ']') { scale.step(1); hintDone(); }
    else if (e.key === 'ArrowDown' || e.key === '[') { scale.step(-1); hintDone(); }
  });
  return drag;
}
