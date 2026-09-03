import { verificationTable } from '../registry/registry';

// Страница «Погрешности» (§7.8, §3.8): проект о честности признаёт свои расхождения первым.
// Данные — прямо из статусов верификации реестра (DRY, не дублируем).
const V_LABEL: Record<string, string> = {
  verified: '✅ сверено с эталоном',
  diverged: '⚠️ расходится (задокументировано)',
  unverified: '⏳ не сверено',
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
      <p class="honesty-note">Солнце (высота/азимут) сверено с JPL Horizons: Δ 0.006°/0.001°. Луна у горизонта расходится на 0.19° (модель рефракции) — поэтому не [ТОЧНО]. Магнитное поле ждёт независимой сверки с NOAA.</p>
    </div>`;
  overlay.hidden = false;
  (overlay.querySelector('.honesty-close') as HTMLButtonElement)
    .addEventListener('click', () => { overlay.hidden = true; });
}
