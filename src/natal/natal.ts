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
export function openNatal(overlay: HTMLElement, when: Date, place?: Place): void {
  const sunLon = SunPosition(when).elon;
  // ASC/MC (§4.7) — только при известных времени и месте; иначе честно не рисуем.
  const angles = place ? ascMc(place.lat, place.lon, when) : undefined;
  const bodies = natalBodies(when);
  const offset = precessionOffsetDeg(when);
  const real = (constellationVsSign(when).text ?? '').replace('Солнце сейчас', 'В день рождения Солнце');
  let star = toValue(birthLightStar(when));
  const iso = when.toISOString().slice(0, 10);

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
        <ol>${dossier(when, new Date(), place).map((d) => `<li><span class="tag tag-inline tag-${d.tag}">[${d.tag}]</span><b>${d.title}</b><p>${d.text.replace(/(apod\.nasa\.gov\/\S+)/, '<a href="https://$1" target="_blank" rel="noopener">$1</a>')}</p><small>${d.source}</small></li>`).join('')}</ol>
      </section>
      <div class="natal-share">
        <button id="natalPng">Скачать PNG</button>
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
    const url = `${location.origin}/?birth=${iso}${place ? `&t=${when.toISOString().slice(11, 16)}&lat=${place.lat.toFixed(3)}&lon=${place.lon.toFixed(3)}` : ''}`;
    try { await navigator.clipboard.writeText(url); shareStatus.textContent = 'Ссылка скопирована'; }
    catch { shareStatus.textContent = url; }
  });
  (overlay.querySelector('#natalPng') as HTMLButtonElement).addEventListener('click', () => {
    const svg = overlay.querySelector('#natalSvg svg') as SVGSVGElement;
    svgToPng(svg, 1200).then((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `cosmos-natal-${iso}.png`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    });
  });

  (overlay.querySelector('.natal-close') as HTMLButtonElement)
    .addEventListener('click', () => { overlay.hidden = true; });
}

function starLine(star: { tag: string; text?: string; value: unknown; source: string }): string {
  return `<span class="tag tag-inline">[${star.tag}]</span> ${star.text} <span class="natal-src">${star.value} св. лет · ${star.source}</span>`;
}

// SVG → PNG в браузере: сериализуем разметку, рисуем на canvas поверх фона сцены.
function svgToPng(svg: SVGSVGElement, size: number): Promise<Blob> {
  const xml = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = size;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#141033'; ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png');
    };
    img.onerror = reject;
    img.src = url;
  });
}
