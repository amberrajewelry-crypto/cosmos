// Панель как drawer (десктоп): свайп вправо закрывает — по расстоянию или по скорости флика (velocity > 0.11 px/мс).
export function initDrawer(panel: HTMLElement): void {
  let sx = 0, sy = 0, dx = 0, t0 = 0, horiz: boolean | null = null;
  panel.addEventListener('pointerdown', (e) => { if (matchMedia('(min-width: 761px)').matches) { sx = e.clientX; sy = e.clientY; dx = 0; t0 = performance.now(); horiz = null; } else horiz = false; });
  panel.addEventListener('pointermove', (e) => {
    if (horiz === false || !t0) return;
    const mx = e.clientX - sx, my = e.clientY - sy;
    if (horiz === null) { if (Math.abs(mx) < 6 && Math.abs(my) < 6) return; horiz = Math.abs(mx) > Math.abs(my); if (!horiz) return; panel.classList.add('dragging'); panel.setPointerCapture(e.pointerId); }
    dx = Math.max(0, mx); panel.style.transform = `translateX(${dx}px)`; panel.style.opacity = String(1 - dx / 600);
  });
  const end = (): void => {
    if (!horiz) { t0 = 0; return; }
    const v = dx / Math.max(1, performance.now() - t0);
    panel.classList.remove('dragging'); panel.style.transform = ''; panel.style.opacity = '';
    if (dx > 120 || v > 0.11) document.documentElement.classList.remove('panel-open');
    horiz = null; t0 = 0;
  };
  panel.addEventListener('pointerup', end); panel.addEventListener('pointercancel', end);
}
