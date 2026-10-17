// «Живой» слой страницы: появление блоков при прокрутке, шкалы заполняются на виду,
// подсветка карточек за курсором, полоса прогресса чтения. При prefers-reduced-motion — всё сразу, без движения.
const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// что появляется: [селектор, шаг задержки между соседями, мс]
const TARGETS: [string, number][] = [
  ['.block > .bhead', 0], ['.block > .card', 90], ['.sph', 90], ['.dlist > .dcard', 70],
  ['.lk', 45], ['.dc', 14], ['.bars', 0], ['.block > h3', 0], ['.dlegend', 0], ['.acts', 60],
];

let io: IntersectionObserver | null = null;

function onSeen(el: HTMLElement) {
  el.classList.add('in');
  el.querySelectorAll<HTMLElement>('.fill[data-w]').forEach((f) => (f.style.width = f.dataset.w!));
  if (el.matches('.bhead')) el.querySelector('h2')?.classList.add('shine');
}

/** Разметить и запустить появление внутри root (после каждой перерисовки результата). */
export function reveal(root: HTMLElement): void {
  const els: HTMLElement[] = [];
  for (const [sel, step] of TARGETS) {
    root.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      if (el.classList.contains('rv')) return;
      el.dataset.st = String(step); el.classList.add('rv'); els.push(el);
    });
  }
  // шкалы вне появляющихся блоков — сразу
  root.querySelectorAll<HTMLElement>('.fill[data-w]').forEach((f) => { if (!f.closest('.rv')) f.style.width = f.dataset.w!; });
  if (REDUCED || typeof IntersectionObserver !== 'function') { els.forEach(onSeen); return; }
  // задержка — по порядку внутри одной «волны» появившихся соседей, а не по номеру в списке
  io ??= new IntersectionObserver((es) => {
    const k = new Map<Element | null, number>();
    for (const e of es) {
      if (!e.isIntersecting) continue;
      const el = e.target as HTMLElement, n = k.get(el.parentElement) ?? 0;
      k.set(el.parentElement, n + 1);
      el.style.setProperty('--d', `${Math.min(n, 40) * +(el.dataset.st ?? 0)}ms`);
      onSeen(el); io!.unobserve(el);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  els.forEach((el) => io!.observe(el));
}

let wired = false;
/** Один раз на страницу: подсветка карточек за курсором + полоса прогресса. */
export function wireMotion(): void {
  if (wired) return; wired = true;
  if (!REDUCED && matchMedia('(hover: hover)').matches) {
    addEventListener('pointermove', (e) => {
      const el = (e.target as HTMLElement).closest?.<HTMLElement>('.card, .dcard, .lk');
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`); el.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true });
  }
  const bar = document.createElement('div'); bar.className = 'readbar'; document.body.append(bar);
  let raf = 0;
  const upd = () => { raf = 0; const h = document.documentElement.scrollHeight - innerHeight; bar.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`; };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
  upd();
}
