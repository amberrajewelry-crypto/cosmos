import { SunPosition } from 'astronomy-engine';
import { natalSVG } from './chart';
import { constellationVsSign } from '../compute/sign';
import { precessionOffsetDeg } from '../compute/precession';
import { birthLightStar } from '../compute/birthlight';
import { toValue } from '../registry/registry';
import { ascMc } from '../compute/angles';

export interface Place { lat: number; lon: number; }

// Второе лицо (§2.1): застывшая карта рождения. Ключевой момент — поворот прецессии (§4.8):
// не переключатель, а поворот — круг знаков садится на реальные созвездия.
// Выход (§2.1): ссылка ?birth=YYYY-MM-DD и PNG — оба без сервера, дата остаётся в URL/браузере (§3.7).
export function openNatal(overlay: HTMLElement, when: Date, place?: Place): void {
  const sunLon = SunPosition(when).elon;
  // ASC/MC (§4.7) — только при известных времени и месте; иначе честно не рисуем.
  const angles = place ? ascMc(place.lat, place.lon, when) : undefined;
  const offset = precessionOffsetDeg(when);
  const real = constellationVsSign(when).text ?? '';
  const star = toValue(birthLightStar(when));
  const iso = when.toISOString().slice(0, 10);

  overlay.innerHTML = `
    <div class="natal-box">
      <button class="natal-close" aria-label="Закрыть">✕</button>
      <div class="natal-svg" id="natalSvg">${natalSVG({ sunLon, rotationDeg: 0, asc: angles?.asc, mc: angles?.mc })}</div>
      <p class="natal-cap" id="natalCap"><span class="tag tag-inline">[МИФ]</span> Астрология рисует твой знак по этому кругу.</p>
      <button class="natal-rotate" id="natalRotate">Повернуть на реальные созвездия →</button>
      ${angles
        ? `<p class="natal-cap natal-star"><span class="tag tag-inline">[ОЦЕНКА]</span> Асцендент ${angles.asc.toFixed(1)}°, MC ${angles.mc.toFixed(1)}° — геометрия эклиптики для твоего времени и места. <span class="natal-src">точность зависит от точности времени: 4 минуты = 1°</span></p>`
        : `<p class="natal-cap natal-star natal-muted">Асцендент и MC не показаны: нужны время и место рождения — без них это было бы выдумкой.</p>`}
      <p class="natal-cap natal-star"><span class="tag tag-inline">[${star.tag}]</span> ${star.text} <span class="natal-src">${star.value} св. лет · ${star.source}</span></p>
      <div class="natal-share">
        <button id="natalPng">Скачать PNG</button>
        <button id="natalLink">Скопировать ссылку</button>
        <span id="natalShareStatus"></span>
      </div>
    </div>`;
  overlay.hidden = false;

  const rotateBtn = overlay.querySelector('#natalRotate') as HTMLButtonElement;
  const cap = overlay.querySelector('#natalCap') as HTMLElement;
  rotateBtn.addEventListener('click', () => {
    const ring = overlay.querySelector('#signRing') as SVGGElement | null;
    if (ring) ring.style.transform = `rotate(${-offset}deg)`; // §4.8: садимся на реальные созвездия; центр = центр круга (view-box), не bbox
    cap.innerHTML = `<span class="tag tag-inline">[ТОЧНО]</span> ${real} Круг провернулся на ${offset}°, накопленных прецессией.`;
    rotateBtn.hidden = true;
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
