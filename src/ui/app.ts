import * as THREE from 'three';
import { createStage, resize } from '../scene/renderer';
import { createBodyParticles, createStarfield } from '../scene/particles';
import { renderPanel } from './panel';
import { toValue } from '../registry/registry';
import { reliktPhotons, ownRadioactivity, primordialHydrogenPercent } from '../compute/body';
import { sunAltitude, sunAzimuth, moonAltitude } from '../compute/sky';
import { shadowRatio } from '../compute/shadow';
import { constellationVsSign } from '../compute/sign';
import { cmbVelocity, timeGradient, muonFlux } from '../compute/physics';
import { magneticInclination, magneticDeclination, neutrinoFlux } from '../compute/magnetic';
import { planetsAbove } from '../compute/planets';
import { openNatal } from '../natal/natal';
import { openHonesty } from './honesty';
import { openAsk } from './ask-ui';
import { fetchKp } from '../live/noaa';
import type { Value } from '../types';

// --- Сцена ---
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const stage = createStage(canvas);

// Далёкий звёздный фон — глубина «космоса вокруг» (не дышит вместе с телом).
stage.scene.add(createStarfield());

// Тело = человек из точек, раскрашенных по происхождению вещества (§4.1/§4.3).
const body = new THREE.Group();
body.add(createBodyParticles());
stage.scene.add(body);

function fit() { resize(stage, window.innerWidth, window.innerHeight); }
window.addEventListener('resize', fit);
fit();

// Движение медленное, дыхательное (§4.9); уважаем prefers-reduced-motion (§3.10).
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let t = 0;
(function loop() {
  if (!reduceMotion) {
    t += 0.008;
    body.scale.setScalar(1 + Math.sin(t) * 0.01);
    body.rotation.y = Math.sin(t * 0.3) * 0.18;
  }
  stage.renderer.render(stage.scene, stage.camera);
  requestAnimationFrame(loop);
})();

// --- Параметры тела: ценность ДО ввода координат (§2.4). Считаются в браузере (§3.7). ---
const bodyValues: Value[] = [
  primordialHydrogenPercent(),
  reliktPhotons(),
  ownRadioactivity(),
  cmbVelocity(),
  timeGradient(),
  muonFlux(),
].map(toValue);

// §2.4 «первые десять секунд»: числа берём из тех же Values, что и карточки — не хардкод.
const byId = (id: string) => bodyValues.find((v) => v.id === id);
(document.getElementById('openPhotons') as HTMLElement).textContent =
  (byId('body.relikt.photons')?.value ?? 0).toLocaleString('ru-RU');
(document.getElementById('openPrimordial') as HTMLElement).textContent =
  `${byId('body.primordial.fraction')?.value ?? 0} %`;
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('staged');
  const stages = document.querySelectorAll<HTMLElement>('#hero .stage');
  [2000, 5000, 8000].forEach((ms, i) => setTimeout(() => stages[i]?.classList.add('on'), ms));
}

const panel = document.getElementById('panel') as HTMLElement;
let currentSky: Value[] = [];
let liveValues: Value[] = [];
function allValues(): Value[] { return [...currentSky, ...bodyValues, ...liveValues]; }
function render() { renderPanel(panel, allValues()); }
render();

// «Спросить дальше» на карточках (§2.2): один оверлей, контекст — все видимые значения.
const askOverlay = document.getElementById('ask') as HTMLElement;
panel.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('.ask-more') as HTMLElement | null;
  if (!btn) return;
  const id = btn.dataset.ask;
  const all = allValues();
  openAsk(askOverlay, all.find((v) => v.id === id), all);
});

// Живой слой (§3.1): NOAA Kp. Не блокирует и не роняет сцену — появляется, когда придёт.
fetchKp().then((c) => { liveValues = [toValue(c)]; render(); });

// --- «Показать, что происходит именно с тобой» → гео + сейчас (§2.4). Координаты не уходят на сервер. ---
const btn = document.getElementById('reveal') as HTMLButtonElement;
const status = document.getElementById('status') as HTMLElement;

btn.addEventListener('click', () => {
  if (!navigator.geolocation) { status.textContent = 'Геолокация недоступна в этом браузере.'; return; }
  status.textContent = 'Определяю твою точку…';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      const now = new Date();
      const sky: Value[] = [
        constellationVsSign(now),
        sunAltitude(lat, lon, now),
        sunAzimuth(lat, lon, now),
        moonAltitude(lat, lon, now),
        planetsAbove(lat, lon, now),
        shadowRatio(lat, lon, now),
        magneticInclination(lat, lon, now),
        magneticDeclination(lat, lon, now),
        neutrinoFlux(lat, lon, now),
      ].map(toValue);
      currentSky = sky;
      render();
      status.textContent = 'Твоё небо — сверху панели. Координаты остались в браузере.';
      btn.hidden = true;
    },
    () => { status.textContent = 'Без геолокации небо в твоей точке не показать. Тело — уже здесь.'; },
    { enableHighAccuracy: false, timeout: 10_000 },
  );
});

// --- Второе лицо: карта рождения на выбранную дату (§2.1, §4.8) ---
const natalOverlay = document.getElementById('natal') as HTMLElement;
const openBtn = document.getElementById('openNatal') as HTMLButtonElement;
const birth = document.getElementById('birth') as HTMLInputElement;
openBtn.addEventListener('click', () => {
  const when = birth.value ? new Date(birth.value + 'T12:00:00Z') : new Date();
  openNatal(natalOverlay, when);
});
// Шеринг-ссылка (§2.1): /?birth=YYYY-MM-DD открывает карту сразу.
const shared = new URLSearchParams(location.search).get('birth');
if (shared && /^\d{4}-\d{2}-\d{2}$/.test(shared)) {
  birth.value = shared;
  openNatal(natalOverlay, new Date(shared + 'T12:00:00Z'));
}

// --- Погрешности (§7.8) ---
const honestyOverlay = document.getElementById('honesty') as HTMLElement;
(document.getElementById('openHonesty') as HTMLButtonElement)
  .addEventListener('click', () => openHonesty(honestyOverlay));
