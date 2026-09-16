import { SunPosition } from 'astronomy-engine';
import { natalSVG } from './chart';
import { constellationVsSign } from '../compute/sign';
import { precessionOffsetDeg } from '../compute/precession';
import { birthLightStar } from '../compute/birthlight';
import { toValue } from '../registry/registry';
import { ascMc } from '../compute/angles';
import { natalBodies } from '../compute/natalbodies';
import { loadStars, zodiacLines, nearestLightStar } from '../data/stars';
import { dossier } from './dossier';

export interface Place { lat: number; lon: number; }

// Второе лицо (§2.1): застывшая карта рождения. Ключевой момент — поворот прецессии (§4.8):
// не переключатель, а поворот — круг знаков садится на реальные созвездия.
// Выход (§2.1): ссылка ?birth=YYYY-MM-DD и PNG — оба без сервера, дата остаётся в URL/браузере (§3.7).
export function openNatal(overlay: HTMLElement, when: Date, place?: Place, link?: string): void {
  const sunLon = SunPosition(when).elon;
  // ASC/MC (§4.7) — только при известных времени и месте; иначе честно не рисуем.
  const angles = place ? ascMc(place.lat, place.lon, when) : undefined;
  const bodies = natalBodies(when);
  const offset = precessionOffsetDeg(when);
  const real = (constellationVsSign(when).text ?? '').replace('Солнце сейчас', 'В день рождения Солнце');
  let star = toValue(birthLightStar(when));
  const iso = when.toISOString().slice(0, 10);
  const facts = dossier(when, new Date(), place);

  overlay.innerHTML = `
    <div class="natal-box">
      <button class="natal-close" aria-label="Закрыть">✕</button>
      <div class="natal-svg" id="natalSvg">${natalSVG({ sunLon, rotationDeg: 0, asc: angles?.asc, mc: angles?.mc, bodies })}</div>
      <p class="natal-bodies">${bodies.map((b) => `<span title="${b.name}">${b.glyph}\uFE0E <b>${b.lon.toFixed(1)}°</b></span>`).join('')}</p>
      <p class="natal-cap" id="natalCap"><span class="tag tag-inline">[МИФ]</span> Астрология рисует твой знак по этому кругу.</p>
      <button class="natal-rotate" id="natalRotate">Повернуть на реальные созвездия</button>
      ${angles
        ? `<p class="natal-cap natal-star"><span class="tag tag-inline">[ОЦЕНКА]</span> Асцендент ${angles.asc.toFixed(1)}°, MC ${angles.mc.toFixed(1)}° — геометрия эклиптики для твоего времени и места. <span class="natal-src">точность зависит от точности времени: 4 минуты = 1°</span></p>`
        : `<p class="natal-cap natal-star natal-muted">Асцендент и MC не показаны: нужны время и место рождения — без них это было бы выдумкой.</p>`}
      <p class="natal-cap natal-star" id="natalStarLine">${starLine(star)}</p>
      <section class="dossier" aria-label="Досье по реальным данным">
        <h3>Досье по реальным данным</h3>
        <p class="dossier-lead">Не толкования — факты о твоём дне, которые можно проверить. Каждый с тегом и источником.</p>
        <ol>${facts.map((d) => `<li><span class="tag tag-inline tag-${d.tag}">[${d.tag}]</span><b>${d.title}</b><p>${d.text.replace(/(apod\.nasa\.gov\/\S+)/, '<a href="https://$1" target="_blank" rel="noopener">$1</a>')}</p><small>${d.source}</small></li>`).join('')}</ol>
      </section>
      <div class="natal-share">
        <button id="natalPng">Поделиться карточкой</button>
        <button id="natalLink">Скопировать ссылку</button>
        <span id="natalShareStatus"></span>
      </div>
    </div>`;
  overlay.hidden = false;

  // Каталог звёзд (54 КБ) — после первого рендера: точная «звезда рождения» и линии созвездий под поворот.
  loadStars().then((cat) => {
    const age = (Date.now() - when.getTime()) / (365.25 * 86_400_000);
    const pick = nearestLightStar(cat, age);
    if (pick) { star = toValue(birthLightStar(when, new Date(), [pick.name, Math.round(pick.ly * 10) / 10])); (overlay.querySelector('#natalStarLine') as HTMLElement).innerHTML = starLine(star); }
    const svg = overlay.querySelector('#natalSvg') as HTMLElement;
    if (svg && !svg.querySelector('#realSky')) svg.innerHTML = natalSVG({ sunLon, rotationDeg: rotated ? -offset : 0, asc: angles?.asc, mc: angles?.mc, bodies, sky: zodiacLines(cat, when.getUTCFullYear()) });
    if (rotated) (overlay.querySelector('#realSky') as SVGGElement | null)?.style.setProperty('opacity', '1');
  }).catch(() => { /* без каталога остаётся встроенный список */ });

  const rotateBtn = overlay.querySelector('#natalRotate') as HTMLButtonElement;
  const cap = overlay.querySelector('#natalCap') as HTMLElement;
  let rotated = false;
  rotateBtn.addEventListener('click', () => {
    rotated = true;
    const ring = overlay.querySelector('#signRing') as SVGGElement | null;
    if (ring) ring.style.transform = `rotate(${-offset}deg)`; // §4.8: садимся на реальные созвездия; центр = центр круга (view-box), не bbox
    (overlay.querySelector('#realSky') as SVGGElement | null)?.style.setProperty('opacity', '1');
    rotateBtn.hidden = true;
    // Градусы бегут вместе с поворотом (1.6 с) — расхождение видно числом и кругом одновременно.
    const start = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 1600), e = 1 - Math.pow(1 - k, 3);
      cap.innerHTML = `<span class="tag tag-inline">[ТОЧНО]</span> ${real} Круг провернулся на <b>${(offset * e).toFixed(2)}°</b>, накопленных прецессией.`;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const shareStatus = overlay.querySelector('#natalShareStatus') as HTMLElement;
  (overlay.querySelector('#natalLink') as HTMLButtonElement).addEventListener('click', async () => {
    const url = link ?? `${location.origin}/?birth=${iso}`;
    try { await navigator.clipboard.writeText(url); shareStatus.textContent = 'Ссылка скопирована'; }
    catch { shareStatus.textContent = url; }
  });
  // Карточка 1080×1350 (сторис/пост): круг + дата + три первых факта досье + адрес. На телефоне — системный «Поделиться».
  (overlay.querySelector('#natalPng') as HTMLButtonElement).addEventListener('click', async () => {
    const svg = overlay.querySelector('#natalSvg svg') as SVGSVGElement;
    const blob = await shareCard(svg, when, facts.slice(0, 3));
    const file = new File([blob], `cosmos-${iso}.png`, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: 'COSMOS' }); return; } catch { /* отмена — падаем в скачивание */ } }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  });

  (overlay.querySelector('.natal-close') as HTMLButtonElement)
    .addEventListener('click', () => { overlay.hidden = true; });
}

function starLine(star: { tag: string; text?: string; value: unknown; source: string }): string {
  return `<span class="tag tag-inline">[${star.tag}]</span> ${star.text} <span class="natal-src">${star.value} св. лет · ${star.source}</span>`;
}

function svgImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const xml = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = reject; img.src = url;
  });
}
function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, lh: number, max = 3): number {
  const words = text.split(' '); let line = '', n = 0;
  for (const wd of words) {
    const t = line ? `${line} ${wd}` : wd;
    if (ctx.measureText(t).width > w && line) { ctx.fillText(line, x, y); y += lh; line = wd; if (++n === max - 1) { /* последняя строка обрежется с многоточием */ } }
    else line = t;
    if (n >= max) break;
  }
  if (line) { while (ctx.measureText(line).width > w) line = line.slice(0, -2) + '…'; ctx.fillText(line, x, y); y += lh; }
  return y;
}
// Карточка для шеринга: тёмный фон сцены, круг, дата, три факта с тегами, адрес. Всё — из тех же данных, что на экране.
async function shareCard(svg: SVGSVGElement, when: Date, facts: Array<{ tag: string; title: string; text: string }>): Promise<Blob> {
  await document.fonts?.ready;
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0e0b2a'); g.addColorStop(1, '#070515');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // звёздная пыль
  for (let i = 0; i < 260; i++) { ctx.fillStyle = `rgba(236,230,211,${0.15 + Math.random() * 0.5})`; ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
  const img = await svgImage(svg);
  ctx.drawImage(img, (W - 620) / 2, 70, 620, 620);
  ctx.textAlign = 'center'; ctx.fillStyle = '#c9a85c'; ctx.font = '500 22px "Geist Mono", Menlo, monospace';
  ctx.fillText('C O S M O S', W / 2, 46);
  ctx.fillStyle = '#ece6d3'; ctx.font = '300 40px Unbounded, Geist, system-ui, sans-serif';
  ctx.fillText(when.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }), W / 2, 748);
  ctx.fillStyle = 'rgba(236,230,211,.68)'; ctx.font = '300 20px Geist, system-ui, sans-serif';
  ctx.fillText('небо в этот день — как было на самом деле', W / 2, 782);
  ctx.textAlign = 'left';
  let y = 840;
  for (const f of facts) {
    ctx.fillStyle = 'rgba(236,230,211,.04)'; ctx.beginPath(); ctx.roundRect(60, y - 34, W - 120, 132, 20); ctx.fill();
    ctx.strokeStyle = 'rgba(236,230,211,.08)'; ctx.stroke();
    ctx.fillStyle = '#c9a85c'; ctx.font = '500 15px "Geist Mono", Menlo, monospace'; ctx.fillText(`[${f.tag}]`, 84, y);
    ctx.fillStyle = '#ece6d3'; ctx.font = '400 24px Unbounded, Geist, system-ui, sans-serif'; ctx.fillText(f.title, 84 + ctx.measureText(`[${f.tag}]  `).width * 0.65, y);
    ctx.fillStyle = 'rgba(236,230,211,.85)'; ctx.font = '300 22px Geist, system-ui, sans-serif';
    wrap(ctx, f.text, 84, y + 40, W - 168, 30, 2);
    y += 158;
  }
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(236,230,211,.5)'; ctx.font = '300 18px "Geist Mono", Menlo, monospace';
  ctx.fillText('cosmos-alpha-three.vercel.app · эфемериды VSOP87/ELP · каждое число проверяемо', W / 2, H - 40);
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png'));
}
