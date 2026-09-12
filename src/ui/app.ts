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
import { planetsAbove, skyBodies } from '../compute/planets';
import { horizonSVG } from './panel';
import { openNatal } from '../natal/natal';
import { openHonesty } from './honesty';
import { openAsk } from './ask-ui';
import { initScale } from './scale';
import { BODY_LEVEL } from '../scene/scales';
import { fetchKp } from '../live/noaa';
import type { Value } from '../types';

// Гравюрное кольцо за фигурой (§4.5): тики, двойной обод, глифы — строится один раз.
(function buildRing() {
  const svg = document.getElementById('ring'); if (!svg) return;
  const G = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
  let t = '';
  for (let d = 0; d < 360; d += 2) {
    const a = (d * Math.PI) / 180, big = d % 30 === 0, mid = d % 10 === 0;
    const r1 = 190, r0 = big ? 176 : mid ? 182 : 186;
    t += `<line x1="${(200 + r0 * Math.cos(a)).toFixed(1)}" y1="${(200 + r0 * Math.sin(a)).toFixed(1)}" x2="${(200 + r1 * Math.cos(a)).toFixed(1)}" y2="${(200 + r1 * Math.sin(a)).toFixed(1)}" stroke="#c9a85c" stroke-width="${big ? .8 : .35}" opacity="${big ? .9 : .5}"/>`;
  }
  let g = '';
  G.forEach((ch, i) => { const a = ((i * 30 + 15 - 90) * Math.PI) / 180; g += `<text x="${(200 + 167 * Math.cos(a)).toFixed(1)}" y="${(204 + 167 * Math.sin(a)).toFixed(1)}" text-anchor="middle" font-size="9" fill="#c9a85c" opacity=".55" font-family="Georgia,serif">${ch}\uFE0E</text>`; });
  svg.innerHTML = `<g><circle cx="200" cy="200" r="192" fill="none" stroke="#c9a85c" stroke-width=".6" opacity=".7"/><circle cx="200" cy="200" r="174" fill="none" stroke="#c9a85c" stroke-width=".35" opacity=".45"/><circle cx="200" cy="200" r="158" fill="none" stroke="#c9a85c" stroke-width=".25" opacity=".3" stroke-dasharray="1 3"/>${t}${g}</g>`;
})();

// --- Сцена ---
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const stageEl = document.getElementById('stage') as HTMLElement;
const stage = createStage(canvas);

// Слои сцены: туманность (фон-шейдер) → звёзды → тело → поток сквозь тело.
const nebula = createNebula();
stage.scene.add(nebula.mesh);
stage.scene.add(createStarfield());

// Тело = человек из точек, раскрашенных по происхождению вещества (§4.1/§4.3).
const body = new THREE.Group();
const bodyPts = createBodyParticles();
body.add(bodyPts.points);
const flux = createFlux();
body.add(flux.points);
// §4.2 лестница масштабов: поток сквозь тело и легенда происхождения — только на уровне тела.
const scale = initScale(document.getElementById('scale') as HTMLElement, bodyPts, (lvl) => {
  flux.points.visible = lvl === BODY_LEVEL;
  document.documentElement.classList.toggle('off-body', lvl !== BODY_LEVEL);
});
stage.scene.add(body);

// Курсор → точка на плоскости тела (z=0) в координатах группы: точки расступаются под лучом.
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3();
const bodyPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
window.addEventListener('pointerleave', () => bodyPts.setMouse(0, -10, 0));

// Лёгкий параллакс от курсора: сцена отвечает на присутствие (без резких движений).
let px = 0, py = 0, tx = 0, ty = 0;
window.addEventListener('pointermove', (e) => {
  tx = (e.clientX / innerWidth - 0.5); ty = (e.clientY / innerHeight - 0.5);
  const r = stageEl.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, stage.camera);
  if (ray.ray.intersectPlane(bodyPlane, hit)) { body.worldToLocal(hit); bodyPts.setMouse(hit.x, hit.y, 1); }
}, { passive: true });

function fit() { resize(stage, stageEl.clientWidth, stageEl.clientHeight); }
window.addEventListener('resize', () => { fit(); baseCam.copy(stage.camera.position); });
fit();

// Движение медленное, дыхательное (§4.9); уважаем prefers-reduced-motion (§3.10).
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let t = 0;
const dbSize = new THREE.Vector2();
let paused = false;
// Сборка фигуры за ~3.2 с после загрузки (reduced-motion — сразу).
const t0 = performance.now();
// Зум колесом/щипком в безопасном диапазоне (§4.2 в M1-объёме): демпфированная дистанция камеры.
let zoomTarget = 0, zoomNow = 0; // 0 = базовая дистанция; −1..+1 → ×0.55..×1.9
let wheelLock = 0;
stageEl.addEventListener('wheel', (e) => {
  const atEdge = (e.deltaY < 0 && zoomTarget <= -1) || (e.deltaY > 0 && zoomTarget >= 1);
  if (atEdge && performance.now() > wheelLock && Math.abs(e.deltaY) > 8) {
    if (scale.step(e.deltaY < 0 ? -1 : 1)) { wheelLock = performance.now() + 1500; zoomTarget = 0; }
    return;
  }
  zoomTarget = Math.max(-1, Math.min(1, zoomTarget + e.deltaY * 0.0015));
}, { passive: true });
const LOOK = new THREE.Vector3(0, 0.95, 0);
const baseCam = stage.camera.position.clone();
fit(); baseCam.copy(stage.camera.position);
// Адаптивное качество: если кадр стабильно > 33 мс — снижаем pixelRatio до 1 (только вниз).
let slowFrames = 0, lastFrame = performance.now(), degraded = false;
stage.renderer.getDrawingBufferSize(dbSize); nebula.update(0, dbSize.x, dbSize.y); // и для reduced-motion — один кадр
function loop(now = performance.now()) {
  if (paused) return;
  if (!degraded) {
    const ft = now - lastFrame; lastFrame = now;
    slowFrames = ft > 33 ? slowFrames + 1 : 0;
    if (slowFrames > 60) { degraded = true; stage.renderer.setPixelRatio(1); fit(); }
  }
  bodyPts.setReveal(reduceMotion ? 1 : Math.min(1, (now - t0) / 4200));
  zoomNow += (zoomTarget - zoomNow) * 0.06;
  const zf = Math.pow(1.9, zoomNow);
  stage.camera.position.copy(baseCam).sub(LOOK).multiplyScalar(zf).add(LOOK);
  if (!reduceMotion) {
    t += 0.008;
    body.scale.setScalar(1 + Math.sin(t) * 0.01);
    px += (tx - px) * 0.03; py += (ty - py) * 0.03;
    body.rotation.y = Math.sin(t * 0.3) * 0.18 + px * 0.35;
    body.rotation.x = py * 0.08;
    bodyPts.setTime(now / 1000);
    flux.setTime(now / 1000);
    stage.renderer.getDrawingBufferSize(dbSize);
    nebula.update(now / 1000, dbSize.x, dbSize.y);
  }
  stage.renderer.render(stage.scene, stage.camera);
  requestAnimationFrame(loop);
}
loop();
// Скрытая вкладка — цикл стоит (§3.6), возврат — продолжаем.
document.addEventListener('visibilitychange', () => { paused = document.hidden; if (!paused) loop(); });

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
let skyVisual = '';
let liveValues: Value[] = [];
function allValues(): Value[] { return [...currentSky, ...bodyValues, ...liveValues]; }
function render() {
  renderPanel(panel, [
    { title: 'Небо в твоей точке', note: 'Появится после «Показать, что происходит именно с тобой» — координаты не покидают браузер.', values: currentSky, visual: skyVisual },
    { title: 'Твоё тело', values: bodyValues },
    { title: 'Живое сейчас', note: 'NOAA Kp загружается…', values: liveValues },
  ]);
}
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
      skyVisual = horizonSVG(skyBodies(lat, lon, now));
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

// Esc закрывает любой открытый оверлей (§3.10).
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  for (const id of ['ask', 'natal', 'honesty']) { const el = document.getElementById(id); if (el && !el.hidden) { el.hidden = true; return; } }
});

// --- Погрешности (§7.8) ---
const honestyOverlay = document.getElementById('honesty') as HTMLElement;
(document.getElementById('openHonesty') as HTMLButtonElement)
  .addEventListener('click', () => openHonesty(honestyOverlay));
