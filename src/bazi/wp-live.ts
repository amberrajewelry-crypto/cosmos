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
const CSS = `.wpl{position:fixed;inset:0;z-index:9999;background:#05040c;display:flex;align-items:center;justify-content:center;animation:wplIn .6s ease}
.wpl svg{height:100dvh;width:auto;max-width:100vw;display:block}
.wpl .x{position:absolute;top:max(14px,env(safe-area-inset-top));right:16px;width:44px;height:44px;border-radius:50%;border:1px solid rgba(226,196,124,.4);background:rgba(10,8,24,.6);color:#e2c47c;font-size:22px;line-height:1;cursor:pointer}
.wpl .clk{position:absolute;top:calc(env(safe-area-inset-top) + 7.5dvh);left:0;right:0;text-align:center;pointer-events:none;font-family:'Cormorant Garamond',serif;font-weight:500;font-size:min(13dvh,24vw);line-height:1;letter-spacing:.02em;background:linear-gradient(#fff3cf,#e8c97e 55%,#b98a3a);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 0 40px rgba(232,201,126,.15)}
@keyframes wplIn{from{opacity:0}to{opacity:1}}
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
.wpl .wp-stars{animation:wpDrift 60s linear infinite alternate}
@keyframes wpDrift{from{transform:translateY(0)}to{transform:translateY(-24px)}}
.wpl .stage{position:relative;height:100dvh;display:flex;justify-content:center;transition:opacity .35s ease}
.wpl .stage.fade{opacity:0}
.wpl .wp-am,.wpl .wp-head,.wpl .wp-day{cursor:pointer}
.wpl .wp-am{animation:wpUp .7s cubic-bezier(.2,.8,.2,1) both}
@keyframes wpUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:none}}
.wpl .wp-am:active{opacity:.7}
.wpl .sh{position:absolute;left:12px;right:12px;top:calc(70px + env(safe-area-inset-top));max-width:460px;margin:0 auto;padding:20px 22px 22px;border-radius:24px;background:linear-gradient(#241b52ee,#0d0a24f2);border:1px solid rgba(226,196,124,.35);box-shadow:0 20px 60px rgba(0,0,0,.6);color:#efe6cf;font:15px/1.5 Manrope,system-ui,sans-serif;transform:translateY(-160%);opacity:0;transition:transform .35s cubic-bezier(.2,.8,.2,1),opacity .35s;cursor:pointer}
.wpl .sh.on{transform:none;opacity:1}
.wpl .clk{transition:opacity .3s}
.wpl .sh b{display:block;font:500 28px/1.1 'Cormorant Garamond',serif;color:#e8c97e;margin-bottom:8px}
.wpl .back{position:absolute;top:max(14px,env(safe-area-inset-top));left:16px;height:44px;padding:0 16px;border-radius:22px;border:1px solid rgba(226,196,124,.4);background:rgba(10,8,24,.6);color:#e2c47c;font:600 14px Manrope,sans-serif;cursor:pointer}
.wpl .hint{position:absolute;bottom:calc(6px + env(safe-area-inset-bottom));left:0;right:0;text-align:center;font:12px Manrope,sans-serif;color:rgba(203,191,159,.55);pointer-events:none;transition:opacity 1s}
@media (prefers-reduced-motion:reduce){.wpl *{animation:none!important}}`;

const loaded = new Map<string, Promise<void>>();
const load = (u: string) => { let p = loaded.get(u); if (!p) { const im = new Image(); im.src = u; p = im.decode().catch(() => undefined); loaded.set(u, p); } return p; };
const need = (svg: string) => Promise.all([...svg.matchAll(/href="([^"]+)"/g)].map((m) => load(m[1])));

export function openLive(c: Chart, a: Analysis): void {
  if (!document.getElementById('wpl-css')) { const st = document.createElement('style'); st.id = 'wpl-css'; st.textContent = CSS; document.head.appendChild(st); }
  const now = new Date(), tz = c.input.tz, here = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const days = daysFrom(c, a, new Date(now.getFullYear(), now.getMonth(), now.getDate()), 40);
  const shift = here === tz ? tzOffsetH(tz, now) - c.input.lon / 15 : 0;
  const box = document.createElement('div'); box.className = 'wpl'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Живая карта дня');
  box.innerHTML = '<div class="stage"></div><div class="clk" aria-hidden="true"></div><button class="back" type="button" hidden>← Сегодня</button><button class="x" type="button" aria-label="Закрыть">×</button><div class="sh" role="status"></div><div class="hint">Нажмите на символ — что он значит · листайте дни</div>';
  const stage = box.querySelector<HTMLElement>('.stage')!, sh = box.querySelector<HTMLElement>('.sh')!, back = box.querySelector<HTMLButtonElement>('.back')!, clk = box.querySelector<HTMLElement>('.clk')!;
  const tick = () => { if (!box.isConnected) return clearInterval(iv); clk.textContent = k === 0 ? new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : `${+days[k].iso.slice(8)}.${days[k].iso.slice(5, 7)}`; };
  const iv = setInterval(tick, 5000);
  const hide = () => { sh.classList.remove('on'); clk.style.opacity = '1'; };
  let k = 0, info: ReturnType<typeof amuletInfo> = {} as ReturnType<typeof amuletInfo>;
  const draw = (fade: boolean) => {
    const svg = wallpaperSvg(a, days[k], days, shift, IMG).replace(/font-family="Cormorant"/g, `font-family="'Cormorant Garamond', Cormorant, serif"`), ready = need(svg), my = k;
    const put = () => { if (my !== k) return;
      stage.innerHTML = svg;
      info = amuletInfo(a, days[k], shift); back.hidden = k === 0; clk.style.opacity = '1'; tick(); stage.classList.remove('fade');
    };
    sh.classList.remove('on');
    if (fade) { stage.classList.add('fade'); void Promise.all([ready, new Promise((r) => setTimeout(r, 300))]).then(put); } else void ready.then(put);
  };
  const go = (n: number) => { const m = Math.max(0, Math.min(days.length - 7, n)); if (m !== k) { k = m; draw(true); } };
  stage.addEventListener('click', (e) => {
    const el = e.target as Element, am = el.closest('.wp-am'), hd = el.closest('.wp-head'), dy = el.closest('.wp-day');
    if (dy) { const i = days.findIndex((x) => x.iso === (dy as HTMLElement).dataset.iso); if (i >= 0) go(i); return; }
    const key = am ? (am as HTMLElement).dataset.k : hd ? 'head' : '';
    const it = key ? info[key as keyof typeof info] : null;
    if (it) { sh.innerHTML = `<b></b><span></span>`; sh.querySelector('b')!.textContent = it.t; sh.querySelector('span')!.textContent = it.x; sh.classList.add('on'); clk.style.opacity = '0'; (box.querySelector('.hint') as HTMLElement).style.opacity = '0'; }
    else hide();
  });
  sh.addEventListener('click', () => hide());
  let x0 = 0, y0 = 0;
  stage.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(k + (dx < 0 ? 1 : -1)); }, { passive: true });
  back.addEventListener('click', () => go(0));
  const close = () => { box.remove(); document.removeEventListener('keydown', key); if (new URLSearchParams(location.search).has('live')) { const u = new URL(location.href); u.searchParams.delete('live'); history.replaceState(null, '', u); } };
  const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') go(k + 1); else if (e.key === 'ArrowLeft') go(k - 1); };
  box.querySelector('.x')!.addEventListener('click', close); document.addEventListener('keydown', key);
  draw(false); document.body.appendChild(box); tick();
  setTimeout(() => { [...IMG.bg!, ...IMG.st!].forEach((u) => void load(u)); }, 1500);
}
