// Живая карта дня в приложении: та же заставка (wallpaperSvg), что и на экране блокировки, но с движением.
// Картинки — URL от Vite (грузится только нужный фон и камень), анимация — CSS по классам из wallpaper.ts.
import type { Chart, Analysis } from './calc';
import { daysFrom } from './days';
import { wallpaperSvg, amuletInfo, tzOffsetH, WP, type WpImages } from './wallpaper';
import rat from './img-wp/rat.png'; import ox from './img-wp/ox.png'; import tiger from './img-wp/tiger.png';
import rabbit from './img-wp/rabbit.png'; import dragon from './img-wp/dragon.png'; import snake from './img-wp/snake.png';
import horse from './img-wp/horse.png'; import goat from './img-wp/goat.png'; import monkey from './img-wp/monkey.png';
import rooster from './img-wp/rooster.png'; import dog from './img-wp/dog.png'; import pig from './img-wp/pig.png';
import el0 from './img-wp/el0.png'; import el1 from './img-wp/el1.png'; import el2 from './img-wp/el2.png'; import el3 from './img-wp/el3.png'; import el4 from './img-wp/el4.png';
import st0 from './img-wp/st0.png'; import st1 from './img-wp/st1.png'; import st2 from './img-wp/st2.png'; import st3 from './img-wp/st3.png'; import st4 from './img-wp/st4.png';
import bg0 from './img-wp/bg0.jpg'; import bg1 from './img-wp/bg1.jpg'; import bg2 from './img-wp/bg2.jpg'; import bg3 from './img-wp/bg3.jpg'; import bg4 from './img-wp/bg4.jpg';

const IMG: WpImages = { an: [rat, ox, tiger, rabbit, dragon, snake, horse, goat, monkey, rooster, dog, pig], el: [el0, el1, el2, el3, el4], st: [st0, st1, st2, st3, st4], bg: [bg0, bg1, bg2, bg3, bg4] };
const CSS = `.wpl{position:fixed;inset:0;z-index:9999;background:radial-gradient(120% 80% at 50% 30%,#1a1340,#05040c 70%);display:flex;flex-direction:column;align-items:center;overflow-y:auto;animation:wplIn .5s ease;padding:calc(10px + env(safe-area-inset-top)) 0 calc(16px + env(safe-area-inset-bottom))}
@keyframes wplIn{from{opacity:0}to{opacity:1}}
.wpl .bar{width:100%;max-width:560px;display:flex;justify-content:space-between;align-items:center;padding:0 14px;min-height:46px}
.wpl .bar button{height:42px;border-radius:21px;border:1px solid rgba(226,196,124,.4);background:rgba(10,8,24,.6);color:#e2c47c;font:600 14px Manrope,sans-serif;cursor:pointer;padding:0 16px}
.wpl .bar .x{width:42px;padding:0;font-size:20px}
.wpl .stage{width:100%;max-width:min(560px,calc((100dvh - 230px) * .69));min-width:min(100%,300px);transition:opacity .3s ease;border-radius:28px;overflow:hidden}
.wpl .stage.fade{opacity:0}
.wpl .stage svg{width:100%;height:auto;display:block}
.wpl .wp-am,.wpl .wp-head,.wpl .wp-day{cursor:pointer}
.wpl .wp-am{animation:wpUp .7s cubic-bezier(.2,.8,.2,1) both}
@keyframes wpUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:none}}
.wpl .wp-am.sel circle{stroke-width:4}
.wpl .sh{width:calc(100% - 24px);max-width:536px;margin-top:12px;padding:18px 22px 20px;border-radius:22px;background:linear-gradient(#241b52cc,#0d0a24e6);border:1px solid rgba(226,196,124,.3);color:#efe6cf;font:15px/1.55 Manrope,system-ui,sans-serif;transition:opacity .25s}
.wpl .sh b{display:block;font:500 26px/1.1 'Cormorant Garamond',serif;color:#e8c97e;margin-bottom:6px}
.wpl .sh small{display:block;margin-top:10px;font-size:12px;color:rgba(203,191,159,.6)}
.wpl .wp-ring{transform-box:view-box;transform-origin:${WP.w / 2}px 550px;animation:wpRing 90s linear infinite}
@keyframes wpRing{to{transform:rotate(360deg)}}
.wpl .wp-orb{transform-box:view-box;transform-origin:${WP.w / 2}px 1250px;animation:wpOrb 26s ease-in-out infinite}
@keyframes wpOrb{0%,100%{transform:rotate(-2.5deg)}50%{transform:rotate(2.5deg)}}
.wpl .wp-pulse{animation:wpPulse 4.5s ease-in-out infinite}
@keyframes wpPulse{0%,100%{opacity:.18}50%{opacity:.55}}
.wpl .tw{animation:wpTw 3.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes wpTw{0%,100%{opacity:.25;transform:scale(.6)}50%{opacity:1;transform:scale(1.15)}}
.wpl .wp-stone{animation:wpStone 5s ease-in-out infinite}
@keyframes wpStone{0%,100%{filter:brightness(.9) saturate(1)}50%{filter:brightness(1.35) saturate(1.25)}}
.wpl .wp-needle{transform-box:fill-box;transform-origin:center;animation:wpNeedle 7s ease-in-out infinite}
@keyframes wpNeedle{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}
@media (prefers-reduced-motion:reduce){.wpl *{animation:none!important}}`;

const loaded = new Map<string, Promise<void>>();
const load = (u: string) => { let p = loaded.get(u); if (!p) { const im = new Image(); im.src = u; p = im.decode().catch(() => undefined); loaded.set(u, p); } return p; };
const need = (svg: string) => Promise.all([...svg.matchAll(/href="([^"]+)"/g)].map((m) => load(m[1])));

/** Кадр без пустого верха под часы экрана блокировки: от круга до недели. */
const VB = '0 830 1179 1710';

export function openLive(c: Chart, a: Analysis): void {
  if (!document.getElementById('wpl-css')) { const st = document.createElement('style'); st.id = 'wpl-css'; st.textContent = CSS; document.head.appendChild(st); }
  const now = new Date(), tz = c.input.tz, here = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const days = daysFrom(c, a, new Date(now.getFullYear(), now.getMonth(), now.getDate()), 40);
  const shift = here === tz ? tzOffsetH(tz, now) - c.input.lon / 15 : 0;
  const box = document.createElement('div'); box.className = 'wpl'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Живая карта дня');
  box.innerHTML = '<div class="bar"><button class="back" type="button" style="visibility:hidden">← Сегодня</button><button class="x" type="button" aria-label="Закрыть">×</button></div><div class="stage"></div><div class="sh" role="status"><b></b><span></span><small>Нажмите на символ — что он значит · листайте дни</small></div>';
  const stage = box.querySelector<HTMLElement>('.stage')!, sh = box.querySelector<HTMLElement>('.sh')!, back = box.querySelector<HTMLButtonElement>('.back')!;
  let k = 0, info = {} as ReturnType<typeof amuletInfo>, cur = 'act';
  const show = (key: string) => { const it = info[key as keyof typeof info]; if (!it) return; cur = key;
    sh.querySelector('b')!.textContent = it.t; sh.querySelector('span')!.textContent = it.x;
    stage.querySelectorAll('.wp-am').forEach((g) => g.classList.toggle('sel', (g as HTMLElement).dataset.k === key)); };
  const draw = (fade: boolean) => {
    const svg = wallpaperSvg(a, days[k], days, shift, IMG).replace(/font-family="Cormorant"/g, `font-family="'Cormorant Garamond', Cormorant, serif"`).replace(/viewBox="[^"]+"/, `viewBox="${VB}"`).replace(/ width="\d+" height="\d+"/, ''), ready = need(svg), my = k;
    const put = () => { if (my !== k) return; stage.innerHTML = svg; info = amuletInfo(a, days[k], shift); back.style.visibility = k === 0 ? 'hidden' : 'visible'; show(info[cur as keyof typeof info] ? cur : 'act'); stage.classList.remove('fade'); };
    if (fade) { stage.classList.add('fade'); void Promise.all([ready, new Promise((r) => setTimeout(r, 280))]).then(put); } else void ready.then(put);
  };
  const go = (n: number) => { const m = Math.max(0, Math.min(days.length - 7, n)); if (m !== k) { k = m; draw(true); } };
  stage.addEventListener('click', (e) => {
    const el = e.target as Element, am = el.closest('.wp-am'), dy = el.closest('.wp-day');
    if (dy) { const i = days.findIndex((x) => x.iso === (dy as HTMLElement).dataset.iso); if (i >= 0) go(i); return; }
    if (am) show((am as HTMLElement).dataset.k!); else if (el.closest('.wp-head')) show('head');
  });
  let x0 = 0, y0 = 0;
  stage.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(k + (dx < 0 ? 1 : -1)); }, { passive: true });
  back.addEventListener('click', () => go(0));
  const close = () => { box.remove(); document.removeEventListener('keydown', key); if (new URLSearchParams(location.search).has('live')) { const u = new URL(location.href); u.searchParams.delete('live'); history.replaceState(null, '', u); } };
  const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') go(k + 1); else if (e.key === 'ArrowLeft') go(k - 1); };
  box.querySelector('.x')!.addEventListener('click', close); document.addEventListener('keydown', key);
  draw(false); document.body.appendChild(box);
  setTimeout(() => { [...IMG.bg!, ...IMG.st!].forEach((u) => void load(u)); }, 1500);
}
