// Живая карта дня в приложении: та же заставка (wallpaperSvg), что и на экране блокировки, но с движением.
// Картинки — URL от Vite (грузится только нужный фон и камень), анимация — CSS по классам из wallpaper.ts.
import type { Chart, Analysis } from './calc';
import { daysFrom } from './days';
import { wallpaperSvg, tzOffsetH, WP, type WpImages } from './wallpaper';
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
@media (prefers-reduced-motion:reduce){.wpl *{animation:none!important}}`;

export function openLive(c: Chart, a: Analysis): void {
  if (!document.getElementById('wpl-css')) { const st = document.createElement('style'); st.id = 'wpl-css'; st.textContent = CSS; document.head.appendChild(st); }
  const now = new Date(), tz = c.input.tz, here = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const days = daysFrom(c, a, new Date(now.getFullYear(), now.getMonth(), now.getDate()), 9);
  const shift = here === tz ? tzOffsetH(tz, now) - c.input.lon / 15 : 0;
  const svg = wallpaperSvg(a, days[0], days, shift, IMG).replace(/font-family="Cormorant"/g, `font-family="'Cormorant Garamond', Cormorant, serif"`);
  const box = document.createElement('div'); box.className = 'wpl'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Живая карта дня');
  box.innerHTML = svg + '<div class="clk" aria-hidden="true"></div><button class="x" type="button" aria-label="Закрыть">×</button>';
  const clk = box.querySelector<HTMLElement>('.clk')!, tick = () => { if (!box.isConnected) return clearInterval(iv); clk.textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); };
  const iv = setInterval(tick, 5000);
  const close = () => { box.remove(); document.removeEventListener('keydown', esc); if (new URLSearchParams(location.search).has('live')) { const u = new URL(location.href); u.searchParams.delete('live'); history.replaceState(null, '', u); } };
  const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
  box.querySelector('.x')!.addEventListener('click', close); document.addEventListener('keydown', esc);
  document.body.appendChild(box); tick();
}
