import { SunPosition } from 'astronomy-engine';
import { natalSVG } from './chart';
import { constellationVsSign } from '../compute/sign';
import { precessionOffsetDeg } from '../compute/precession';

// Второе лицо (§2.1): застывшая карта рождения. Ключевой момент — поворот прецессии (§4.8):
// не переключатель, а поворот — круг знаков садится на реальные созвездия.
export function openNatal(overlay: HTMLElement, when: Date): void {
  const sunLon = SunPosition(when).elon;
  const offset = precessionOffsetDeg(when);
  const real = constellationVsSign(when).text ?? '';

  overlay.innerHTML = `
    <div class="natal-box">
      <button class="natal-close" aria-label="Закрыть">✕</button>
      <div class="natal-svg" id="natalSvg">${natalSVG({ sunLon, rotationDeg: 0 })}</div>
      <p class="natal-cap" id="natalCap"><span class="tag tag-inline">[МИФ]</span> Астрология рисует твой знак по этому кругу.</p>
      <button class="natal-rotate" id="natalRotate">Повернуть на реальные созвездия →</button>
    </div>`;
  overlay.hidden = false;

  const rotateBtn = overlay.querySelector('#natalRotate') as HTMLButtonElement;
  const cap = overlay.querySelector('#natalCap') as HTMLElement;
  rotateBtn.addEventListener('click', () => {
    const ring = overlay.querySelector('#signRing') as SVGGElement | null;
    if (ring) ring.setAttribute('transform', `rotate(${-offset} 200 200)`); // §4.8: садимся на реальные созвездия
    cap.innerHTML = `<span class="tag tag-inline">[ТОЧНО]</span> ${real} Круг провернулся на ${offset}°, накопленных прецессией.`;
    rotateBtn.hidden = true;
  });

  (overlay.querySelector('.natal-close') as HTMLButtonElement)
    .addEventListener('click', () => { overlay.hidden = true; });
}
