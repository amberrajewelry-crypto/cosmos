import * as THREE from 'three';
import { createStage, resize } from '../scene/renderer';
import { createFigure } from '../scene/figure';
import { createBodyParticles } from '../scene/particles';
import { renderPanel } from './panel';
import { toValue } from '../registry/registry';
import { reliktPhotons, ownRadioactivity, primordialHydrogenPercent } from '../compute/body';
import { sunAltitude, sunAzimuth, moonAltitude } from '../compute/sky';
import { shadowRatio } from '../compute/shadow';
import { constellationVsSign } from '../compute/sign';
import { cmbVelocity, timeGradient, muonFlux } from '../compute/physics';
import { magneticInclination, magneticDeclination, neutrinoFlux } from '../compute/magnetic';
import { openNatal } from '../natal/natal';
import { fetchKp } from '../live/noaa';
import type { Value } from '../types';

// --- Сцена ---
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const stage = createStage(canvas);

// Тело = полупрозрачная оболочка + точки, раскрашенные по происхождению вещества (§4.1/§4.3).
const body = new THREE.Group();
body.add(createFigure());
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

const panel = document.getElementById('panel') as HTMLElement;
let currentSky: Value[] = [];
let liveValues: Value[] = [];
function render() { renderPanel(panel, [...currentSky, ...bodyValues, ...liveValues]); }
render();

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
