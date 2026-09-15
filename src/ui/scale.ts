// §4.2 лестница масштабов: непрерывный зум (колесо/пинч/кнопки) по 9 уровням + честная подпись (§4.10).
// Состояние — одно число z (уровень с дробной частью). Пара форм (⌊z⌋, ⌊z⌋+1) смешивается по дроби,
// текущая форма сжимается к точке, следующая входит из-за кадра — так виден сам масштаб, а не морф.
import type { BodyPoints } from '../scene/particles';
import { BODY_LEVEL, LEVELS, expLabel, shapeFor } from '../scene/scales';
import type { LiveShapes, Shape } from '../scene/scales';

const SHRINK = 0.1;   // во сколько раз сжимается уходящая форма
const GROW = 7;       // во сколько раз крупнее кадра входит следующая
const SNAP_MS = 220;  // пауза колеса → защёлкивание на ближайший уровень
const ease = (x: number): number => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

export interface ScaleControl {
  level: () => number; step: (dir: -1 | 1) => boolean; nudge: (dz: number) => void; z: () => number;
  /** Живые данные пришли (геолокация, Kp) — перестроить формы уровней. */ refresh: () => void;
  /** Вызывается на каждом кадре зума: дробный уровень z и масштабы пары форм (линейные слои повторяют их). */ onZoom?: (z: number, sA: number, sB: number) => void;
  /** Множитель форм не-тела под размер кадра (формы — во весь экран). */ setForm: (f: number) => void;
}

export function initScale(root: HTMLElement, pts: BodyPoints, onLevel: (level: number) => void, live: LiveShapes = {}): ScaleControl {
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
  const MAX = LEVELS.length - 1;

  const shapes = new Map<number, Shape>();
  const shape = (i: number): Shape => {
    let s = shapes.get(i); if (!s) { s = shapeFor(i, pts.body, pts.bodyColor, live); shapes.set(i, s); } return s;
  };

  let form = 1;
  let zTarget = BODY_LEVEL, zNow = BODY_LEVEL, level = BODY_LEVEL, pair = -1, snapAt = 0, raf = 0;

  let painted = false;
  function paint(): void {
    // Титр перетекает через blur (класс swap на 160 мс), первая отрисовка — сразу.
    if (painted && !reduce) { root.classList.add('swap'); setTimeout(() => { paintNow(); root.classList.remove('swap'); }, 160); }
    else paintNow();
    painted = true;
  }
  function paintNow(): void {
    const L = LEVELS[level];
    exp.textContent = expLabel(L.exp); name.textContent = L.name;
    fact.textContent = L.fact; tag.textContent = `[${L.tag}]`; tag.className = `tag tag-${L.tag}`;
    tag.title = L.source;
    ticks.forEach((t, i) => t.classList.toggle('on', i === level));
    btns[0].disabled = level === 0; btns[1].disabled = level === MAX;
    root.dataset.body = String(level === BODY_LEVEL);
  }
  function apply(z: number): void {
    const i = Math.min(MAX - 1, Math.floor(z)), f = z - i;
    if (i !== pair) { pair = i; pts.setPair(shape(i), shape(i + 1)); }
    const k = ease(Math.min(1, Math.max(0, f)));
    pts.setMix(k);
    const sA = Math.pow(SHRINK, k) * (i === BODY_LEVEL ? 1 : form), sB = Math.pow(GROW, 1 - k) * (i + 1 === BODY_LEVEL ? 1 : form);
    pts.setScales(sA, sB);
    ctl.onZoom?.(z, sA, sB);
    const lv = Math.round(z);
    if (lv !== level) { level = lv; paint(); onLevel(level); }
  }
  function loop(): void {
    raf = 0;
    if (snapAt && performance.now() > snapAt) { zTarget = Math.round(zTarget); snapAt = 0; }
    zNow += (zTarget - zNow) * (reduce ? 1 : 0.085);
    if (Math.abs(zTarget - zNow) < 0.0005) zNow = zTarget;
    apply(zNow);
    if (zNow !== zTarget || snapAt) raf = requestAnimationFrame(loop);
  }
  const kick = (): void => { if (!raf) raf = requestAnimationFrame(loop); };
  function step(dir: -1 | 1): boolean {
    const next = Math.round(zTarget) + dir;
    if (next < 0 || next > MAX) return false;
    zTarget = next; snapAt = 0; kick(); return true;
  }
  function nudge(dz: number): void {
    zTarget = Math.max(0, Math.min(MAX, zTarget + dz));
    snapAt = performance.now() + SNAP_MS; kick();
  }
  btns.forEach((b) => b.addEventListener('click', () => step(Number(b.dataset.dir) as -1 | 1)));
  function refresh(): void { shapes.clear(); pair = -1; apply(zNow); }
  const ctl: ScaleControl = { level: () => level, step, nudge, z: () => zNow, refresh, setForm: (f) => { form = f; apply(zNow); } };
  paint(); apply(zNow);
  return ctl;
}
