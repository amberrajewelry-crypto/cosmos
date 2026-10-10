// Живые стихии: 10 стволов = 10 процедурных анимаций на canvas.
// Огонь горит (частицы пламени и искры), вода течёт, дерево растёт и качается, металл блестит, земля дышит туманом.
// Один общий цикл requestAnimationFrame; анимация идёт только пока холст виден.

type Draw = (ctx: CanvasRenderingContext2D, t: number, dt: number, s: number, st: any) => void;
interface Fx { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D; draw: Draw; st: any; on: boolean; s: number }

const fxs = new Set<Fx>();
const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let running = false, last = 0;
function loop(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
  let any = false;
  for (const f of fxs) {
    if (!f.cv.isConnected) { fxs.delete(f); continue; }
    if (!f.on) continue;
    any = true;
    f.ctx.save(); f.draw(f.ctx, now / 1000, dt, f.s, f.st); f.ctx.restore();
  }
  if (any && !reduce) requestAnimationFrame(loop); else running = false;
}
const kick = () => { if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } };
const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((es) => {
  for (const e of es) for (const f of fxs) if (f.cv === e.target) f.on = e.isIntersecting;
  kick();
}, { rootMargin: '80px' }) : null;

export function mountFx(cv: HTMLCanvasElement, stem: number) {
  const s = cv.clientWidth || 120, d = Math.min(devicePixelRatio || 1, 2);
  cv.width = s * d; cv.height = s * d;
  const ctx = cv.getContext('2d')!;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  const f: Fx = { cv, ctx, draw: DRAW[stem], st: {}, on: !io, s };
  const base = ctx.getTransform();
  const orig = f.draw;
  f.draw = (c, t, dt, sz, st) => { c.setTransform(base); c.clearRect(0, 0, sz, sz); orig(c, t, dt, sz, st); };
  fxs.add(f); io?.observe(cv);
  if (reduce) { f.on = true; for (let i = 0; i < 90; i++) f.draw(ctx, i / 30, 1 / 30, s, f.st); f.on = false; }
  kick();
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const glow = (c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, a = 1) => {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
};

const DRAW: Draw[] = [];

// 甲 Цзя — могучее дерево: живая крона из светящихся листьев, ветер качает ветви, листья опадают.
interface Br { l: number; a: number; w: number; ch: Br[]; ph: number }
function grow(d: number, l: number, w: number): Br {
  const b: Br = { l, a: 0, w, ch: [], ph: Math.random() * 6 };
  if (d < 7) {
    const n = d < 1 ? 2 : Math.random() < 0.45 ? 3 : 2;
    for (let i = 0; i < n; i++) { const c = grow(d + 1, l * rnd(0.66, 0.8), w * 0.68); c.a = (i - (n - 1) / 2) * rnd(0.55, 0.8) + rnd(-0.15, 0.15); b.ch.push(c); }
  }
  return b;
}
DRAW[0] = (c, t, dt, s, st) => {
  st.tree ??= grow(0, s * 0.17, s * 0.055);
  const leaves: number[][] = [];
  c.globalCompositeOperation = 'lighter';
  glow(c, s / 2, s * 0.45, s * 0.5, '70,190,120', 0.16);
  const draw = (b: Br, x: number, y: number, ang: number, d: number) => {
    const a = ang + b.a + Math.sin(t * 1.1 + b.ph) * 0.035 * d + Math.sin(t * 0.7) * 0.02 * d;
    const x2 = x + Math.cos(a) * b.l, y2 = y + Math.sin(a) * b.l;
    c.globalCompositeOperation = 'source-over';
    c.strokeStyle = d < 4 ? `rgb(${120 - d * 10},${86 - d * 6},${58 - d * 4})` : 'rgba(150,200,140,.8)';
    c.lineWidth = Math.max(0.7, b.w); c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke();
    if (d < 2) { c.strokeStyle = 'rgba(255,220,160,.35)'; c.lineWidth = b.w * 0.25; c.beginPath(); c.moveTo(x - b.w * 0.25, y); c.lineTo(x2 - b.w * 0.2, y2); c.stroke(); }
    if (d >= 3) leaves.push([x2, y2, b.ph]);
    b.ch.forEach((ch) => draw(ch, x2, y2, a, d + 1));
  };
  draw(st.tree, s / 2, s * 0.94, -Math.PI / 2, 0);
  c.globalCompositeOperation = 'lighter';
  c.globalCompositeOperation = 'source-over';
  for (const [x, y, ph] of leaves) {
    const tw = Math.sin(t * 2.2 + ph * 3);
    c.save(); c.translate(x, y); c.rotate(ph * 2 + tw * 0.25);
    c.fillStyle = `hsla(${120 + (ph * 37) % 40},${55 + (ph * 11) % 25}%,${38 + (ph * 17) % 22 + tw * 6}%,.9)`;
    c.beginPath(); c.ellipse(0, 0, s * 0.03, s * 0.014, 0, 0, Math.PI * 2); c.fill(); c.restore();
  }
  c.globalCompositeOperation = 'lighter';
  for (const [x, y, ph] of leaves) if ((ph * 10 | 0) % 3 === 0) glow(c, x, y, s * 0.03, '160,255,180', 0.12 + 0.12 * Math.sin(t * 2 + ph * 5));
  st.l ??= [];
  if (Math.random() < 0.05 && leaves.length) { const [x, y] = leaves[(Math.random() * leaves.length) | 0]; st.l.push({ x, y, r: rnd(0, 6), vr: rnd(-3, 3), life: 0 }); }
  c.globalCompositeOperation = 'source-over';
  for (let i = st.l.length - 1; i >= 0; i--) {
    const l = st.l[i]; l.life += dt; l.y += 16 * dt * s / 120; l.x += Math.sin(t * 2 + l.r) * 0.5; l.r += l.vr * dt;
    if (l.y > s) { st.l.splice(i, 1); continue; }
    c.save(); c.translate(l.x, l.y); c.rotate(l.r); c.fillStyle = `rgba(140,230,150,${Math.min(1, 3 - l.life)})`;
    c.beginPath(); c.ellipse(0, 0, s * 0.018, s * 0.008, 0, 0, Math.PI * 2); c.fill(); c.restore();
  }
  const gr = c.createLinearGradient(0, s * 0.9, 0, s);
  gr.addColorStop(0, 'rgba(60,140,90,0)'); gr.addColorStop(1, 'rgba(60,140,90,.35)');
  c.fillStyle = gr; c.fillRect(0, s * 0.9, s, s * 0.1);
};
// 乙 И — цветок лотоса: лепестки дышат и раскрываются, стебель качается, летит пыльца.
DRAW[1] = (c, t, dt, s, st) => {
  const sway = Math.sin(t * 0.9) * s * 0.02, fx = s / 2 + sway, fy = s * 0.48;
  c.globalCompositeOperation = 'lighter';
  glow(c, fx, fy, s * 0.42, '255,150,200', 0.16); glow(c, s / 2, s * 0.9, s * 0.5, '80,200,130', 0.14);
  c.globalCompositeOperation = 'source-over';
  // стебель и листья
  c.strokeStyle = '#4fa872'; c.lineWidth = s / 60; c.lineCap = 'round';
  c.beginPath(); c.moveTo(s / 2, s); c.quadraticCurveTo(s / 2 - s * 0.05, s * 0.75, fx, fy + s * 0.08); c.stroke();
  const leaf = (x: number, y: number, a: number, L: number) => {
    c.save(); c.translate(x, y); c.rotate(a + Math.sin(t * 1.2 + x) * 0.06);
    const g = c.createLinearGradient(0, 0, L, 0); g.addColorStop(0, '#2f7d52'); g.addColorStop(1, '#7fe0a0');
    c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(L * 0.5, -L * 0.35, L, 0); c.quadraticCurveTo(L * 0.5, L * 0.3, 0, 0); c.fill();
    c.strokeStyle = 'rgba(200,255,210,.5)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(0, 0); c.lineTo(L * 0.9, 0); c.stroke(); c.restore();
  };
  leaf(s / 2 - s * 0.03, s * 0.8, -2.6, s * 0.24); leaf(s / 2 - s * 0.02, s * 0.72, -0.45, s * 0.22);
  // лепестки: 3 кольца
  const open = 0.82 + 0.18 * Math.sin(t * 0.8);
  const petal = (a: number, L: number, W: number, col0: string, col1: string) => {
    c.save(); c.translate(fx, fy); c.rotate(a);
    const g = c.createLinearGradient(0, 0, 0, -L); g.addColorStop(0, col0); g.addColorStop(1, col1);
    c.fillStyle = g; c.beginPath(); c.moveTo(0, 0);
    c.bezierCurveTo(W, -L * 0.35, W * 0.7, -L * 0.8, 0, -L); c.bezierCurveTo(-W * 0.7, -L * 0.8, -W, -L * 0.35, 0, 0); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 0.6; c.stroke(); c.restore();
  };
  const R = [[7, 0.26, 1.25, '#b84a86', '#ffc2e0'], [6, 0.24, 0.85, '#d86aa2', '#ffe0f0'], [5, 0.2, 0.45, '#f08cbc', '#fff4fa']] as const;
  R.forEach(([n, L, spread, a0, a1], k) => {
    for (let i = 0; i < n; i++) {
      const u = (i / (n - 1)) - 0.5;
      petal(u * spread * 2 * open + Math.sin(t * 1.3 + i + k) * 0.02, s * L * (0.9 + 0.1 * open), s * 0.075, a0, a1);
    }
  });
  c.globalCompositeOperation = 'lighter'; glow(c, fx, fy - s * 0.03, s * 0.07, '255,220,120', 0.9);
  st.p ??= [];
  if (Math.random() < 0.15) st.p.push({ x: fx + rnd(-8, 8), y: fy - s * 0.05, vx: rnd(-10, 10), vy: -rnd(8, 20), life: 0, max: rnd(1.5, 3) });
  for (let i = st.p.length - 1; i >= 0; i--) { const p = st.p[i]; p.life += dt; if (p.life > p.max) { st.p.splice(i, 1); continue; } p.x += (p.vx + Math.sin(t * 2 + i) * 8) * dt; p.y += p.vy * dt; glow(c, p.x, p.y, s * 0.014, '255,230,150', 1 - p.life / p.max); }
};
// 丙 Бин — солнце: мягкая корона, медленные лучи, живая поверхность, протуберанцы на краю.
DRAW[2] = (c, t, _dt, s) => {
  const cx = s / 2, cy = s / 2, R = s * 0.19;
  c.globalCompositeOperation = 'lighter';
  glow(c, cx, cy, s * 0.55, '255,110,30', 0.3); glow(c, cx, cy, s * 0.34, '255,170,60', 0.4);
  for (const [n, dir, len, al] of [[12, 1, 0.48, 0.13], [9, -1, 0.4, 0.16]] as const) {
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + dir * t * 0.08, w = 0.09 + 0.03 * Math.sin(t + i);
      const g = c.createRadialGradient(cx, cy, R, cx, cy, s * len);
      g.addColorStop(0, `rgba(255,200,110,${al * (0.8 + 0.4 * Math.sin(t * 1.3 + i * 2))})`); g.addColorStop(1, 'rgba(255,140,40,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, s * len, a - w, a + w); c.closePath(); c.fill();
    }
  }
  // протуберанцы
  for (let i = 0; i < 3; i++) {
    const a = t * 0.1 + i * 2.1, h = s * (0.05 + 0.03 * Math.sin(t * 0.9 + i * 3));
    const x1 = cx + Math.cos(a - 0.18) * R, y1 = cy + Math.sin(a - 0.18) * R, x2 = cx + Math.cos(a + 0.18) * R, y2 = cy + Math.sin(a + 0.18) * R;
    const mx = cx + Math.cos(a) * (R + h * 2.2), my = cy + Math.sin(a) * (R + h * 2.2);
    c.strokeStyle = 'rgba(255,120,50,.55)'; c.lineWidth = s / 55; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(mx, my, x2, y2); c.stroke();
  }
  c.globalCompositeOperation = 'source-over';
  const g = c.createRadialGradient(cx - R * 0.25, cy - R * 0.25, 0, cx, cy, R);
  g.addColorStop(0, '#fffdf2'); g.addColorStop(0.5, '#ffe38a'); g.addColorStop(0.85, '#ffb03a'); g.addColorStop(1, '#ff7a1e');
  c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill();
  c.save(); c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.clip(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) glow(c, cx + Math.cos(t * 0.3 + i * 1.7) * R * 0.55, cy + Math.sin(t * 0.4 + i * 2.3) * R * 0.55, R * 0.35, '255,240,190', 0.18);
  c.restore();
};
// 丁 Дин — свеча: многослойный язык пламени (контур на шуме), тёплый отсвет, искры и дымка.
const n1 = (x: number, t: number) => Math.sin(x * 1.7 + t * 2.1) * 0.5 + Math.sin(x * 3.3 - t * 3.7) * 0.3 + Math.sin(x * 6.1 + t * 5.3) * 0.2;
function tongue(c: CanvasRenderingContext2D, t: number, cx: number, base: number, w: number, h: number, seed: number) {
  const N = 28, left: [number, number][] = [], right: [number, number][] = [];
  const lean = n1(seed, t * 0.6) * w * 0.35;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const half = w * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05 + 0.02)), 0.9) * Math.pow(1 - u, 0.55) * (u < 0.25 ? 0.75 + u : 1);
    const sway = (n1(u * 2.4 + seed, t) * 0.5 + 0.5 * n1(u * 5 + seed * 2, t * 1.6)) * w * 0.55 * Math.pow(u, 1.4) + lean * u * u;
    const y = base - u * h * (1 + 0.06 * n1(seed + 7, t * 2));
    left.push([cx + sway - half, y]); right.push([cx + sway + half, y]);
  }
  c.beginPath(); c.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < left.length; i++) { const [x, y] = left[i], [px, py] = left[i - 1]; c.quadraticCurveTo(px, py, (x + px) / 2, (y + py) / 2); }
  const tip = left[N];
  c.lineTo(tip[0], tip[1]);
  for (let i = N - 1; i >= 0; i--) { const [x, y] = right[i], [px, py] = right[i + 1]; c.quadraticCurveTo(px, py, (x + px) / 2, (y + py) / 2); }
  c.bezierCurveTo(right[0][0] + w * 0.2, base + w * 0.5, left[0][0] - w * 0.2, base + w * 0.5, left[0][0], left[0][1]);
  c.closePath();
}
DRAW[3] = (c, t, dt, s, st) => {
  const cx = s / 2, base = s * 0.66, flick = 1 + 0.05 * n1(1, t * 3) + 0.03 * Math.sin(t * 17);
  // тёплый ореол
  c.globalCompositeOperation = 'lighter';
  glow(c, cx, base - s * 0.12, s * 0.5 * flick, '255,120,40', 0.28);
  glow(c, cx, base - s * 0.1, s * 0.25 * flick, '255,180,90', 0.35);
  // свеча
  c.globalCompositeOperation = 'source-over';
  const top = base + s * 0.05, bw = s * 0.2;
  const wax = c.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0);
  wax.addColorStop(0, '#6e4a34'); wax.addColorStop(0.35, '#f3dcc0'); wax.addColorStop(0.6, '#fff1de'); wax.addColorStop(1, '#8a5c3e');
  c.fillStyle = wax; c.beginPath(); c.roundRect(cx - bw / 2, top, bw, s - top + 4, [s * 0.03, s * 0.03, 0, 0]); c.fill();
  const lit = c.createRadialGradient(cx, top, 0, cx, top, bw * 0.9);
  lit.addColorStop(0, 'rgba(255,190,110,.85)'); lit.addColorStop(1, 'rgba(255,150,60,0)');
  c.fillStyle = lit; c.fillRect(cx - bw / 2, top, bw, bw);
  c.strokeStyle = '#2a1a12'; c.lineWidth = s / 90; c.beginPath(); c.moveTo(cx, top + 1); c.quadraticCurveTo(cx + s * 0.01, top - s * 0.03, cx + s * 0.004, base - s * 0.02); c.stroke();
  // пламя: 4 слоя от красного края к белой сердцевине
  c.globalCompositeOperation = 'lighter';
  const L: [number, number, string, string, number][] = [
    [0.13, 0.5, 'rgba(255,70,20,.0)', 'rgba(255,60,20,.55)', 3], [0.1, 0.44, 'rgba(255,120,30,0)', 'rgba(255,120,30,.75)', 2],
    [0.07, 0.34, 'rgba(255,200,80,0)', 'rgba(255,205,90,.9)', 1], [0.035, 0.2, 'rgba(255,255,230,0)', 'rgba(255,255,240,1)', 0],
  ];
  for (const [w, h, c0, c1, blur] of L) {
    const g = c.createLinearGradient(0, base - s * h, 0, base);
    g.addColorStop(0, c0); g.addColorStop(0.55, c1); g.addColorStop(1, c1);
    c.fillStyle = g; (c as any).filter = blur ? `blur(${blur * s / 120}px)` : 'none';
    tongue(c, t, cx, base, s * w * flick, s * h * flick, w * 40); c.fill();
  }
  (c as any).filter = 'none';
  const blue = c.createRadialGradient(cx, base + s * 0.005, 0, cx, base, s * 0.05);
  blue.addColorStop(0, 'rgba(90,140,255,.7)'); blue.addColorStop(1, 'rgba(90,140,255,0)');
  c.fillStyle = blue; c.beginPath(); c.ellipse(cx, base, s * 0.045, s * 0.03, 0, 0, Math.PI * 2); c.fill();
  // искры и дымка
  st.sp ??= []; st.sm ??= [];
  if (Math.random() < 0.12) st.sp.push({ x: cx + rnd(-3, 3), y: base - s * 0.4, vx: rnd(-15, 15), vy: -rnd(25, 55) * s / 120, life: 0, max: rnd(0.8, 1.6) });
  for (let i = st.sp.length - 1; i >= 0; i--) { const p = st.sp[i]; p.life += dt; if (p.life > p.max) { st.sp.splice(i, 1); continue; } p.vx += rnd(-60, 60) * dt; p.x += p.vx * dt; p.y += p.vy * dt; glow(c, p.x, p.y, s * 0.018, '255,190,90', 1 - p.life / p.max); }
  c.globalCompositeOperation = 'source-over';
  if (Math.random() < 0.08) st.sm.push({ x: cx, y: base - s * 0.48, life: 0, max: 2.2, ph: rnd(0, 6) });
  for (let i = st.sm.length - 1; i >= 0; i--) { const m = st.sm[i]; m.life += dt; if (m.life > m.max) { st.sm.splice(i, 1); continue; } const k = m.life / m.max; glow(c, m.x + Math.sin(t * 1.5 + m.ph) * s * 0.05 * k, m.y - k * s * 0.35, s * (0.03 + 0.06 * k), '180,170,200', 0.12 * (1 - k)); }
};
// 戊 У — горный хребет: снежные пики, закатная кромка, туман между хребтами, звёзды.
function ridge(n: number, rough: number, peak: number, seed: number): number[] {
  let pts = [0.6, 0.6]; let r = rough;
  let rs = seed; const rand = () => ((rs = (rs * 9301 + 49297) % 233280) / 233280);
  while (pts.length < n) { const nx: number[] = []; for (let i = 0; i < pts.length - 1; i++) nx.push(pts[i], (pts[i] + pts[i + 1]) / 2 + (rand() - 0.5) * r); nx.push(pts[pts.length - 1]); pts = nx; r *= 0.55; }
  return pts.map((y, i) => y - Math.exp(-(((i / (pts.length - 1)) - peak) ** 2) / 0.03) * 0.35);
}
DRAW[4] = (c, t, _dt, s, st) => {
  st.R ??= [ridge(65, 0.35, 0.35, 11), ridge(65, 0.3, 0.7, 23), ridge(65, 0.22, 0.45, 37)];
  const sky = c.createLinearGradient(0, 0, 0, s);
  sky.addColorStop(0, '#0d0b2a'); sky.addColorStop(0.55, '#3a2a4a'); sky.addColorStop(0.75, '#b8743e'); sky.addColorStop(1, '#2a1a10');
  c.fillStyle = sky; c.fillRect(0, 0, s, s);
  for (let i = 0; i < 14; i++) { const a = 0.4 + 0.6 * Math.sin(t * 2 + i * 7) ** 2; c.fillStyle = `rgba(255,255,255,${a * 0.8})`; c.fillRect((i * 37) % s, ((i * 23) % 40) / 100 * s, 1.2, 1.2); }
  c.globalCompositeOperation = 'lighter'; glow(c, s * 0.62, s * 0.58, s * 0.28, '255,190,110', 0.45); c.globalCompositeOperation = 'source-over';
  const cols = [['#6d6a92', '#3d3a5c'], ['#9b7040', '#4a3420'], ['#3a2616', '#140c06']];
  st.R.forEach((pts: number[], k: number) => {
    const y0 = s * (0.12 + k * 0.16), H = s * (0.55 - k * 0.08);
    const P = pts.map((y, i) => [(i / (pts.length - 1)) * s, y0 + y * H]);
    c.beginPath(); c.moveTo(0, s); P.forEach(([x, y]) => c.lineTo(x, y)); c.lineTo(s, s); c.closePath();
    const g = c.createLinearGradient(0, y0, 0, s); g.addColorStop(0, cols[k][0]); g.addColorStop(1, cols[k][1]);
    c.fillStyle = g; c.fill();
    if (k === 0) { // снег на вершинах
      c.save(); c.clip(); const top = Math.min(...P.map((p) => p[1]));
      const sn = c.createLinearGradient(0, top, 0, top + s * 0.1); sn.addColorStop(0, 'rgba(255,255,255,.95)'); sn.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = sn; c.fillRect(0, top, s, s * 0.1); c.restore();
    }
    c.strokeStyle = k === 2 ? 'rgba(255,200,120,.55)' : 'rgba(255,225,170,.45)'; c.lineWidth = 1;
    c.beginPath(); P.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
    // туман
    c.globalCompositeOperation = 'lighter';
    for (let m = 0; m < 3; m++) { const x = ((t * (6 + k * 4) + m * s * 0.5 + k * 40) % (s * 1.6)) - s * 0.3; c.fillStyle = 'rgba(255,230,210,.05)'; c.beginPath(); c.ellipse(x, y0 + H * 0.75, s * 0.3, s * 0.04, 0, 0, Math.PI * 2); c.fill(); }
    c.globalCompositeOperation = 'source-over';
  });
};
// 己 Цзи — поле на закате: волна ветра бежит по колосьям, мерцают светлячки.
DRAW[5] = (c, t, _dt, s) => {
  const sky = c.createLinearGradient(0, 0, 0, s);
  sky.addColorStop(0, '#1a1236'); sky.addColorStop(0.5, '#7a4a3a'); sky.addColorStop(0.62, '#e0a050'); sky.addColorStop(1, '#3a2410');
  c.fillStyle = sky; c.fillRect(0, 0, s, s);
  c.globalCompositeOperation = 'lighter'; glow(c, s * 0.5, s * 0.6, s * 0.18, '255,210,120', 0.8); c.globalCompositeOperation = 'source-over';
  c.fillStyle = '#5a3a18'; c.beginPath(); c.moveTo(0, s * 0.68); c.quadraticCurveTo(s * 0.3, s * 0.6, s * 0.6, s * 0.66); c.quadraticCurveTo(s * 0.85, s * 0.7, s, s * 0.64); c.lineTo(s, s); c.lineTo(0, s); c.fill();
  for (let row = 0; row < 3; row++) {
    const n = 16 + row * 6, base = s * (0.8 + row * 0.08), hh = s * (0.2 + row * 0.07);
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.5 + (row % 2) * 0.5) / n) * s, h = hh * (0.85 + ((i * 31) % 7) / 30);
      const wind = Math.sin(x / s * 5 - t * 1.8 + row) * s * 0.04 + Math.sin(t * 3 + i) * s * 0.004;
      const tx = x + wind, ty = base - h;
      c.strokeStyle = `rgba(${200 - row * 20},${150 - row * 20},${70 - row * 10},.9)`; c.lineWidth = s / 180 + row * 0.3;
      c.beginPath(); c.moveTo(x, base); c.quadraticCurveTo(x, base - h * 0.5, tx, ty); c.stroke();
      for (let g = 0; g < 5; g++) { const gy = ty + g * s * 0.018, gx = tx - wind * g * 0.04; c.fillStyle = `rgba(${255 - row * 15},${205 - row * 15},${110 - row * 10},1)`; c.beginPath(); c.ellipse(gx - s * 0.007, gy, s * 0.006 + row * 0.4, s * 0.011 + row * 0.5, -0.4, 0, Math.PI * 2); c.ellipse(gx + s * 0.007, gy, s * 0.006 + row * 0.4, s * 0.011 + row * 0.5, 0.4, 0, Math.PI * 2); c.fill(); }
    }
  }
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 10; i++) { const x = (i * 61 + t * 7 + Math.sin(t + i) * 10) % s, y = s * 0.45 + Math.sin(t * 0.8 + i * 2) * s * 0.12, a = 0.5 + 0.5 * Math.sin(t * 3 + i); glow(c, x, y, s * 0.02, '255,235,150', a); }
};
// 庚 Гэн — металлический слиток: объёмный брусок, по граням бежит блик, вспыхивают искры.
DRAW[6] = (c, t, _dt, s, st) => {
  const cx = s / 2, cy = s * 0.56 + Math.sin(t * 1.2) * s * 0.012;
  c.globalCompositeOperation = 'lighter'; glow(c, cx, cy, s * 0.46, '200,215,240', 0.18);
  c.globalCompositeOperation = 'source-over';
  const W = s * 0.34, D = s * 0.12, H = s * 0.16, k = 0.72; // низ W, верх W*k; D — глубина в перспективе
  const bl = [cx - W, cy + H / 2], br = [cx + W, cy + H / 2];
  const tl = [cx - W * k, cy - H / 2], tr = [cx + W * k, cy - H / 2];
  const off = [D * 0.65, -D * 0.7];
  const P = (p: number[], o = [0, 0]) => [p[0] + o[0], p[1] + o[1]];
  const poly = (pts: number[][]) => { const q = new Path2D(); pts.forEach(([x, y], i) => (i ? q.lineTo(x, y) : q.moveTo(x, y))); q.closePath(); return q; };
  const front = poly([bl, br, tr, tl]);
  const top = poly([tl, tr, P(tr, off), P(tl, off)]);
  const side = poly([br, P(br, off), P(tr, off), tr]);
  const shade = (q: Path2D, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) => {
    const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); c.fillStyle = g; c.fill(q);
  };
  // тень под слитком
  c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.ellipse(cx + D * 0.4, cy + H / 2 + s * 0.035, W * 1.15, s * 0.03, 0, 0, Math.PI * 2); c.fill();
  shade(side, br[0], br[1], tr[0] + off[0], tr[1] + off[1], [[0, '#59616e'], [1, '#8b94a3']]);
  shade(front, 0, tl[1], 0, bl[1], [[0, '#f4f7fb'], [0.35, '#c3cad6'], [0.7, '#8d96a5'], [1, '#6a7280']]);
  shade(top, tl[0], tl[1], tr[0] + off[0], tr[1] + off[1], [[0, '#dfe5ee'], [0.5, '#ffffff'], [1, '#c8cfda']]);
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 0.8;
  [front, top, side].forEach((q) => c.stroke(q));
  // клеймо
  c.strokeStyle = 'rgba(90,98,112,.55)'; c.lineWidth = 1;
  c.beginPath(); c.roundRect(cx - W * 0.42, cy - H * 0.22, W * 0.84, H * 0.5, 2); c.stroke();
  c.fillStyle = 'rgba(80,88,102,.6)'; c.font = `600 ${Math.round(s * 0.05)}px Geist Mono, monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('999.9', cx, cy + H * 0.03);
  // бегущий блик по всем граням
  const ph = ((t * 0.35) % 1.8) - 0.4;
  c.save(); const all = new Path2D(); all.addPath(front); all.addPath(top); all.addPath(side); c.clip(all);
  const x = cx - W * 1.4 + ph * W * 2.8;
  const sh = c.createLinearGradient(x - s * 0.1, 0, x + s * 0.1, 0);
  sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,.85)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = sh; c.setTransform(c.getTransform().translate(x, cy).skewX(-0.5).translate(-x, -cy)); c.fillRect(x - s * 0.12, cy - s * 0.3, s * 0.24, s * 0.6);
  c.restore();
  // искры-блёстки
  c.globalCompositeOperation = 'lighter';
  st.g ??= [[-0.6, -0.3], [0.55, -0.55], [0.9, 0.1], [-0.2, -0.75]];
  st.g.forEach(([gx, gy]: number[], i: number) => {
    const a = Math.max(0, Math.sin(t * 1.6 + i * 1.9)) ** 6;
    if (a < 0.02) return;
    const px = cx + gx * W, py = cy + gy * H * 1.5, r = s * 0.07 * a;
    c.strokeStyle = `rgba(255,255,255,${a})`; c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(px - r, py); c.lineTo(px + r, py); c.moveTo(px, py - r); c.lineTo(px, py + r); c.stroke();
    glow(c, px, py, s * 0.03, '255,255,255', a);
  });
};
// 辛 Синь — драгоценность: вращающийся кристалл с бликами.
DRAW[7] = (c, t, _dt, s) => {
  const cx = s / 2, cy = s / 2, R = s * 0.3;
  c.globalCompositeOperation = 'lighter'; glow(c, cx, cy, s * 0.48, '210,220,255', 0.2);
  c.globalCompositeOperation = 'source-over';
  const n = 8, rot = t * 0.6, top = [cx, cy - R * 1.15], bot = [cx, cy + R * 1.25];
  const ring = Array.from({ length: n }, (_, i) => { const a = rot + i / n * Math.PI * 2; return { x: cx + Math.cos(a) * R, y: cy - R * 0.2 + Math.sin(a) * R * 0.28, z: Math.sin(a), a }; });
  const faces: { p: number[][]; z: number; l: number }[] = [];
  for (let i = 0; i < n; i++) {
    const A = ring[i], B = ring[(i + 1) % n], z = (A.z + B.z) / 2, l = 0.5 + 0.5 * Math.cos(A.a + 0.4);
    faces.push({ p: [top, [A.x, A.y], [B.x, B.y]], z, l: l * 0.8 + 0.2 });
    faces.push({ p: [bot, [A.x, A.y], [B.x, B.y]], z, l: l * 0.6 + 0.1 });
  }
  faces.sort((a, b) => a.z - b.z);
  for (const f of faces) {
    if (f.z < -0.05) continue;
    const v = Math.round(150 + f.l * 105);
    c.fillStyle = `rgba(${v - 20},${v - 5},${v},.9)`; c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 0.7;
    c.beginPath(); f.p.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); c.stroke();
  }
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.7 + i / 3) % 1, a = Math.sin(k * Math.PI);
    const x = cx + Math.cos(i * 2.1 + t * 0.2) * R * 0.7, y = cy + Math.sin(i * 2.7) * R * 0.6;
    c.strokeStyle = `rgba(255,255,255,${a})`; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x - s * 0.06 * a, y); c.lineTo(x + s * 0.06 * a, y); c.moveTo(x, y - s * 0.06 * a); c.lineTo(x, y + s * 0.06 * a); c.stroke();
    glow(c, x, y, s * 0.03, '255,255,255', a);
  }
};
// 壬 Жэнь — ночной океан: лунная дорожка мерцает, волны катятся с бликами на гребнях.
DRAW[8] = (c, t, _dt, s) => {
  const sky = c.createLinearGradient(0, 0, 0, s);
  sky.addColorStop(0, '#040a24'); sky.addColorStop(0.45, '#0f2a5c'); sky.addColorStop(1, '#020818');
  c.fillStyle = sky; c.fillRect(0, 0, s, s);
  c.globalCompositeOperation = 'lighter';
  glow(c, s * 0.5, s * 0.2, s * 0.25, '170,200,255', 0.35);
  c.fillStyle = '#eef4ff'; c.beginPath(); c.arc(s * 0.5, s * 0.2, s * 0.065, 0, Math.PI * 2); c.fill();
  c.globalCompositeOperation = 'source-over';
  const hz = s * 0.42;
  for (let k = 0; k < 6; k++) {
    const y0 = hz + (k * k) * s * 0.018 + k * s * 0.02, A = s * (0.008 + k * 0.007), sp = 0.7 + k * 0.25, f = 9 - k;
    const Y = (x: number) => y0 + Math.sin(x / s * f - t * sp + k * 1.3) * A + Math.sin(x / s * f * 2.3 + t * sp * 0.7) * A * 0.4;
    c.beginPath(); c.moveTo(0, s); for (let x = 0; x <= s; x += 2) c.lineTo(x, Y(x)); c.lineTo(s, s); c.closePath();
    const g = c.createLinearGradient(0, y0 - A, 0, y0 + s * 0.2);
    g.addColorStop(0, `rgb(${30 + k * 6},${80 + k * 12},${160 + k * 10})`); g.addColorStop(1, '#030b22');
    c.fillStyle = g; c.fill();
    c.strokeStyle = `rgba(190,220,255,${0.25 + k * 0.07})`; c.lineWidth = 0.9;
    c.beginPath(); let on = false;
    for (let x = 0; x <= s; x += 2) { const crest = Math.sin(x / s * f - t * sp + k * 1.3) > 0.55; if (crest) { on ? c.lineTo(x, Y(x)) : c.moveTo(x, Y(x)); on = true; } else on = false; }
    c.stroke();
  }
  // лунная дорожка
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    const y = hz + (i / 26) ** 1.3 * s * 0.56, w = s * (0.02 + (i / 26) * 0.09) * (0.5 + 0.5 * Math.sin(t * 3 + i * 1.7));
    const x = s * 0.5 + Math.sin(t * 1.5 + i) * s * 0.02;
    c.fillStyle = `rgba(230,240,255,${0.5 - i * 0.012})`; c.fillRect(x - w / 2, y, w, 1.3);
  }
};
// 癸 Гуй — дождь: косые струи из светлой тучи, всплески и круги на воде.
DRAW[9] = (c, t, dt, s, st) => {
  const sky = c.createLinearGradient(0, 0, 0, s);
  sky.addColorStop(0, '#1c2a4a'); sky.addColorStop(0.7, '#0a1330'); sky.addColorStop(1, '#06102a');
  c.fillStyle = sky; c.fillRect(0, 0, s, s);
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) glow(c, ((i * 0.25 + t * 0.01) % 1.2) * s, s * (0.08 + (i % 2) * 0.06), s * 0.28, '120,150,210', 0.18);
  const fl = Math.max(0, Math.sin(t * 0.37) - 0.985) * 40; if (fl > 0) { c.fillStyle = `rgba(200,220,255,${fl * 0.15})`; c.fillRect(0, 0, s, s); }
  const water = s * 0.8;
  st.d ??= []; st.r ??= []; st.sp ??= [];
  for (let k = 0; k < 3; k++) if (Math.random() < 0.8) st.d.push({ x: rnd(-s * 0.1, s * 1.05), y: rnd(-20, s * 0.2), v: rnd(170, 240) * s / 120, stop: rnd(water, s * 0.98), len: rnd(0.05, 0.1) });
  const slope = 0.18;
  for (let i = st.d.length - 1; i >= 0; i--) {
    const d = st.d[i]; d.y += d.v * dt; d.x += d.v * slope * dt;
    if (d.y >= d.stop) { st.r.push({ x: d.x, y: d.stop, a: 0 }); for (let j = 0; j < 2; j++) st.sp.push({ x: d.x, y: d.stop, vx: rnd(-25, 25), vy: -rnd(25, 50), life: 0 }); st.d.splice(i, 1); continue; }
    const L = s * d.len, g = c.createLinearGradient(d.x - L * slope, d.y - L, d.x, d.y);
    g.addColorStop(0, 'rgba(160,200,255,0)'); g.addColorStop(1, 'rgba(200,230,255,.85)');
    c.strokeStyle = g; c.lineWidth = 1.1; c.beginPath(); c.moveTo(d.x - L * slope, d.y - L); c.lineTo(d.x, d.y); c.stroke();
  }
  c.globalCompositeOperation = 'source-over';
  const wg = c.createLinearGradient(0, water, 0, s); wg.addColorStop(0, 'rgba(40,80,160,.45)'); wg.addColorStop(1, 'rgba(10,20,60,.8)');
  c.fillStyle = wg; c.fillRect(0, water, s, s - water);
  c.globalCompositeOperation = 'lighter';
  for (let i = st.r.length - 1; i >= 0; i--) {
    const r = st.r[i]; r.a += dt; if (r.a > 1.1) { st.r.splice(i, 1); continue; }
    const k = r.a / 1.1, persp = 0.25 + (r.y - water) / (s - water) * 0.3;
    for (const m of [1, 0.6]) { c.strokeStyle = `rgba(150,200,255,${(1 - k) * 0.7 * m})`; c.lineWidth = 0.9; c.beginPath(); c.ellipse(r.x, r.y, k * s * 0.1 * m, k * s * 0.1 * m * persp, 0, 0, Math.PI * 2); c.stroke(); }
  }
  for (let i = st.sp.length - 1; i >= 0; i--) { const p = st.sp[i]; p.life += dt; if (p.life > 0.35) { st.sp.splice(i, 1); continue; } p.vy += 300 * dt; p.x += p.vx * dt; p.y += p.vy * dt; c.fillStyle = `rgba(210,235,255,${1 - p.life / 0.35})`; c.fillRect(p.x, p.y, 1.2, 1.2); }
};

// ——— Иконки стихий (SVG) ———
export const EL_ICON: string[] = [
  'M12 22V11M12 11c-4 0-7-3-7-7 4 0 7 3 7 7zm0 0c0-4 3-7 7-7 0 4-3 7-7 7zm0 4c-3 0-5-2-5-5 3 0 5 2 5 5z', // Дерево — росток
  'M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 0 2 1 3 2 3 0-3-1-5 1-8z', // Огонь — пламя
  'M2 20l7-12 4 6 3-4 6 10z', // Земля — гора
  'M12 2l7 7-7 13-7-13z', // Металл — кристалл
  'M12 2c3 5 7 9 7 13a7 7 0 0 1-14 0c0-4 4-8 7-13z', // Вода — капля
];
export const elIcon = (e: number, color: string, size = 16) =>
  `<svg class="eli" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="${EL_ICON[e]}" fill="${color}" fill-opacity=".25" stroke="${color}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
