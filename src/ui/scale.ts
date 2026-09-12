// §4.2 UI лестницы масштабов: пилюля «внутрь · 10ⁿ м · наружу» + честная подпись (§4.10).
import type { BodyPoints } from '../scene/particles';
import { BODY_LEVEL, LEVELS, expLabel, shapeFor } from '../scene/scales';

const MORPH_MS = 1400;
const ease = (x: number): number => 1 - Math.pow(1 - x, 3);

export interface ScaleControl { level: () => number; step: (dir: -1 | 1) => boolean; }

export function initScale(root: HTMLElement, pts: BodyPoints, onLevel: (level: number) => void): ScaleControl {
  root.innerHTML = `
    <div class="scale-row">
      <button type="button" class="scale-btn" data-dir="-1" aria-label="Внутрь: на уровень меньше">внутрь</button>
      <span class="scale-lbl"><b id="scaleExp"></b><i id="scaleName"></i></span>
      <button type="button" class="scale-btn" data-dir="1" aria-label="Наружу: на уровень больше">наружу</button>
    </div>
    <ol class="scale-ticks" aria-hidden="true">${LEVELS.map(() => '<li></li>').join('')}</ol>
    <p class="scale-fact"><span id="scaleFact"></span> <span id="scaleTag" class="tag"></span></p>`;
  const exp = root.querySelector('#scaleExp') as HTMLElement;
  const name = root.querySelector('#scaleName') as HTMLElement;
  const fact = root.querySelector('#scaleFact') as HTMLElement;
  const tag = root.querySelector('#scaleTag') as HTMLElement;
  const ticks = Array.from(root.querySelectorAll('.scale-ticks li'));
  const btns = Array.from(root.querySelectorAll<HTMLButtonElement>('.scale-btn'));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let level = BODY_LEVEL, busy = false;
  function paint(): void {
    const L = LEVELS[level];
    exp.textContent = expLabel(L.exp); name.textContent = L.name;
    fact.textContent = L.fact; tag.textContent = `[${L.tag}]`; tag.className = `tag tag-${L.tag}`;
    tag.title = L.source;
    ticks.forEach((t, i) => t.classList.toggle('on', i === level));
    btns[0].disabled = level === 0; btns[1].disabled = level === LEVELS.length - 1;
    root.dataset.body = String(level === BODY_LEVEL);
  }
  function step(dir: -1 | 1): boolean {
    const next = level + dir;
    if (busy || next < 0 || next >= LEVELS.length) return false;
    busy = true; level = next; paint(); onLevel(level);
    pts.setTarget(shapeFor(level, pts.body));
    if (reduce) { pts.commitTarget(); busy = false; return true; }
    const t0 = performance.now();
    const tick = (now: number): void => {
      const k = Math.min(1, (now - t0) / MORPH_MS);
      pts.setMix(ease(k));
      if (k < 1) requestAnimationFrame(tick); else { pts.commitTarget(); busy = false; }
    };
    requestAnimationFrame(tick);
    return true;
  }
  btns.forEach((b) => b.addEventListener('click', () => step(Number(b.dataset.dir) as -1 | 1)));
  paint();
  return { level: () => level, step };
}
