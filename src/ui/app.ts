import * as THREE from 'three';
import { createStage, resize } from '../scene/renderer';
import { createBodyParticles, createStarfield, createFlux } from '../scene/particles';
import { createNebula } from '../scene/nebula';
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

// Слои сцены: туманность (фон-шейдер) → звёзды → тело → поток сквозь тело.
const nebula = createNebula();
stage.scene.add(nebula.mesh);
stage.scene.add(createStarfield());

// Тело = человек из точек, раскрашенных по происхождению вещества (§4.1/§4.3).
const body = new THREE.Group();
body.add(createBodyParticles());
const flux = createFlux();
body.add(flux.points);
stage.scene.add(body);

// Лёгкий параллакс от курсора: сцена отвечает на присутствие (без резких движений).
let px = 0, py = 0, tx = 0, ty = 0;
window.addEventListener('pointermove', (e) => { tx = (e.clientX / innerWidth - 0.5); ty = (e.clientY / innerHeight - 0.5); }, { passive: true });

const stageEl = document.getElementById('stage') as HTMLElement;
function fit() { resize(stage, stageEl.clientWidth, stageEl.clientHeight); }
window.addEventListener('resize', fit);
fit();

// Движение медленное, дыхательное (§4.9); уважаем prefers-reduced-motion (§3.10).
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let t = 0, last = performance.now();
const dbSize = new THREE.Vector2();
(function loop(now = performance.now()) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!reduceMotion) {
    t += 0.008;
    body.scale.setScalar(1 + Math.sin(t) * 0.01);
    px += (tx - px) * 0.03; py += (ty - py) * 0.03;
    body.rotation.y = Math.sin(t * 0.3) * 0.18 + px * 0.35;
    body.rotation.x = py * 0.08;
    flux.update(dt);
    stage.renderer.getDrawingBufferSize(dbSize);
    nebula.update(now / 1000, dbSize.x, dbSize.y);
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
const birthTime = document.getElementById('birthTime') as HTMLInputElement;
const birthLat = document.getElementById('birthLat') as HTMLInputElement;
const birthLon = document.getElementById('birthLon') as HTMLInputElement;

// Момент рождения: дата (+ время UTC, если задано, иначе полдень); место — если заданы обе координаты.
function birthMoment(): { when: Date; place?: { lat: number; lon: number } } {
  const t = birthTime.value || '12:00';
  const when = birth.value ? new Date(`${birth.value}T${t}:00Z`) : new Date();
  const lat = parseFloat(birthLat.value), lon = parseFloat(birthLon.value);
  const place = birthTime.value && Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : undefined;
  return { when, place };
}
openBtn.addEventListener('click', () => {
  const { when, place } = birthMoment();
  openNatal(natalOverlay, when, place);
});
(document.getElementById('birthHere') as HTMLButtonElement).addEventListener('click', () => {
  navigator.geolocation?.getCurrentPosition((pos) => {
    birthLat.value = pos.coords.latitude.toFixed(3);
    birthLon.value = pos.coords.longitude.toFixed(3);
  });
});
// Шеринг-ссылка (§2.1): /?birth=YYYY-MM-DD[&t=HH:MM&lat=..&lon=..] открывает карту сразу.
const qs = new URLSearchParams(location.search);
const shared = qs.get('birth');
if (shared && /^\d{4}-\d{2}-\d{2}$/.test(shared)) {
  birth.value = shared;
  if (/^\d{2}:\d{2}$/.test(qs.get('t') ?? '')) {
    birthTime.value = qs.get('t')!;
    birthLat.value = qs.get('lat') ?? '';
    birthLon.value = qs.get('lon') ?? '';
    (document.getElementById('natalMore') as HTMLDetailsElement).open = true;
  }
  const { when, place } = birthMoment();
  openNatal(natalOverlay, when, place);
}

// --- Погрешности (§7.8) ---
const honestyOverlay = document.getElementById('honesty') as HTMLElement;
(document.getElementById('openHonesty') as HTMLButtonElement)
  .addEventListener('click', () => openHonesty(honestyOverlay));
