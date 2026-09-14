import { verificationTable } from '../registry/registry';

// Страница «Погрешности» (§7.8, §3.8): проект о честности признаёт свои расхождения первым.
// Данные — прямо из статусов верификации реестра (DRY, не дублируем).
const V_LABEL: Record<string, string> = {
  verified: '<span class="ok">●</span> сверено с эталоном',
  diverged: '<span class="warn">◐</span> расходится (задокументировано)',
  unverified: '<span class="pend">○</span> не сверено',
};

export function openHonesty(overlay: HTMLElement): void {
  const rows = verificationTable()
    .map((r) => `<tr><td>${r.label}</td><td class="tag tag-${r.provisionalTag}">[${r.provisionalTag}]</td><td>${V_LABEL[r.verification]}</td></tr>`)
    .join('');
  overlay.innerHTML = `
    <div class="honesty-box">
      <button class="honesty-close" aria-label="Закрыть">✕</button>
      <h2>Известные расхождения</h2>
      <p>Тег <b>[ТОЧНО]</b> даётся только после сверки с внешним эталоном (JPL Horizons, NOAA). Пока параметр не сверен — он честно <b>[ОЦЕНКА]</b>, а не [ТОЧНО]. Формулы открыты, детали — в <code>VERIFICATION.md</code>.</p>
      <table>
        <thead><tr><th>Параметр</th><th>Тег после сверки</th><th>Статус A4</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="honesty-note">Проход A4 от 14.09.2026. Солнце и планеты сверены с JPL Horizons (азимут Δ&lt;0.001°, высота Δ≤0.07°), созвездие Солнца — с Horizons по 5 датам (5/5), магнитное поле — с BGS WMM2025 (Δ0.002°), расстояния до звёзд — с SIMBAD (≤2 %, Бетельгейзе ±20 %), константы тела — с Planck 2018, PDG 2024, HPS. Луна у горизонта: 2.6″ от Horizons с рефракцией (прежние 0.19° — сравнение с безвоздушной высотой). Kp берётся у официального производителя, GFZ Potsdam; NOAA — запасной источник, расходится с GFZ до 0.7 балла. Полный протокол — VERIFICATION.md.</p>
      <p class="honesty-p"><a href="/changelog/" style="color:var(--gold)">Что изменилось — публичный журнал →</a> Нашёл ошибку — кнопка «число неверно» на карточке; после подтверждения тег снимается до исправления.</p>
    </div>`;
  overlay.hidden = false;
  (overlay.querySelector('.honesty-close') as HTMLButtonElement)
    .addEventListener('click', () => { overlay.hidden = true; });
}
