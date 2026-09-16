import * as THREE from 'three';
import { createStage, resize } from '../scene/renderer';
import { createBodyParticles, createStarfield, createFlux } from '../scene/particles';
import { createDecays, createNeutrinos, createFieldLines } from '../scene/inner';
import { createNebula } from '../scene/nebula';
import { createLevelLines } from '../scene/lines';
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
import { initScale } from './scale';
import { BODY_LEVEL, LEVELS, expLabel, type LiveShapes } from '../scene/scales';
import { helioPlanets } from '../compute/liveshapes';
import { fetchKp } from '../live/noaa';
import { loadPlaces, searchPlaces, placeLabel, type Place } from '../data/places';
import { localToUtc } from '../compute/localtime';
import { sendFeedback, track, trackZoom } from '../live/feedback';
import { wrongNumberMailto } from './panel';
import { contentValues, levelName, type Ctx } from '../registry/content';
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
// Bloom — только десктоп с мышью: на телефоне он стоит 20–30 % кадра и грузит лишние 60 КБ; ?nobloom — отладка.
if (!new URLSearchParams(location.search).has('nobloom') && matchMedia('(hover: hover) and (pointer: fine) and (min-width: 761px)').matches) stage.enableBloom();

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
// §4.1 внутренняя жизнь: распады сразу; нейтрино и магнитные линии — когда известна точка (§3.7).
const decays = createDecays(bodyPts.body), neutrinos = createNeutrinos(), fieldLines = createFieldLines();
body.add(decays.obj, neutrinos.obj, fieldLines.obj);
const levelLines = createLevelLines(); body.add(levelLines.obj);
const innerLegend = document.getElementById('innerLegend') as HTMLElement;
// Анатомическая фигура (§4.1): 9000 точек внутри меша, 54 КБ; до загрузки — капсульная.
fetch('/body.bin').then((r) => r.arrayBuffer()).then((buf) => {
  const n = new DataView(buf).getUint32(0, true);
  const q = new Int16Array(buf, 4, n * 3);
  const f = new Float32Array(n * 3);
  for (let i = 0; i < f.length; i++) f[i] = q[i] / 10000;
  bodyPts.replaceBody(f); decays.rebind(f);
}).catch(() => { /* остаёмся на капсульной фигуре */ });
// §4.2 лестница масштабов: поток сквозь тело и легенда происхождения — только на уровне тела.
// Живые данные форм: планеты на сейчас — сразу; звёзды и тела над горизонтом — после геолокации; Kp — из NOAA.
const liveShapes: LiveShapes = { planets: helioPlanets(new Date()) };
const scale = initScale(document.getElementById('scale') as HTMLElement, bodyPts, (lvl) => {
  trackZoom(lvl); contentLevel = lvl; if (typeof render === 'function') render();
  flux.points.visible = decays.obj.visible = neutrinos.obj.visible = fieldLines.obj.visible = lvl === BODY_LEVEL;
  document.documentElement.classList.toggle('off-body', lvl !== BODY_LEVEL);
  document.documentElement.classList.toggle('ring-off', ![BODY_LEVEL, BODY_LEVEL + 1, BODY_LEVEL + 3].includes(lvl)); // кольцо эклиптики имеет смысл у тела, горизонта, орбиты
}, liveShapes);
scale.onZoom = levelLines.setZoom;
stage.scene.add(body);

// Курсор ничего не двигает: ни точки, ни параллакс — сцена отвечает только на явные жесты (зум, поворот).
const LOOK = new THREE.Vector3(0, 0.95, 0);
// Портрет/альбом читаем один раз на resize: clientWidth в кадре форсирует layout (Lighthouse: ~1 с Style & Layout).
let portrait = false;
function fit() {
  portrait = stageEl.clientWidth < stageEl.clientHeight;
  resize(stage, stageEl.clientWidth, stageEl.clientHeight);
  // Формы уровней (кроме тела) — во весь кадр: радиус формы 0.85 → 0.82 полувысоты или полуширины кадра.
  const halfH = Math.tan((stage.camera.fov / 2) * Math.PI / 180) * stage.camera.position.distanceTo(LOOK);
  scale.setForm(Math.min(halfH * 0.82, halfH * stage.camera.aspect * 0.9) / 0.85);
}
// Иммерсия: интерфейс растворяется, когда курсор замер (только с мышью — на тач-экране нет «замершего курсора»).
let idleT = 0;
const wake = (): void => { document.documentElement.classList.remove('idle'); clearTimeout(idleT); idleT = window.setTimeout(() => { if (!document.documentElement.classList.contains('panel-open')) document.documentElement.classList.add('idle'); }, 4000); };
if (matchMedia('(hover: hover) and (pointer: fine)').matches) { ['pointermove', 'pointerdown', 'keydown', 'wheel'].forEach((e) => window.addEventListener(e, wake, { passive: true })); wake(); }
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// §4.9: аура бури пульсирует с периодом в секунды, амплитуда — от реального Kp (0…9), не мигает.
let kpLive = 0;
function gain(now = performance.now()): void {
  // Камера близко (2.1) — спрайты крупнее и плотнее; гасим накопление, чтобы фигура не выгорала в bloom.
  const base = portrait ? 0.55 : 0.5;
  const pulse = reduceMotion ? 0 : (0.02 + 0.03 * (kpLive / 9)) * Math.sin((now / 1000) * (2 * Math.PI / 6));
  bodyPts.setGain(base * (1 + pulse));
}
window.addEventListener('resize', () => { fit(); baseCam.copy(stage.camera.position); gain(); syncLook(); });
fit();
gain();

// Движение медленное, дыхательное (§4.9); уважаем prefers-reduced-motion (§3.10).
let t = 0;
const dbSize = new THREE.Vector2();
let paused = false;
// Сборка фигуры за ~3.2 с после загрузки (reduced-motion — сразу).
const t0 = performance.now();
// Тяжёлые части — только по действию (§3.7): натальная карта с досье и каталогом звёзд, «спросить», «погрешности».
const openNatal = async (...a: Parameters<typeof import('../natal/natal').openNatal>) => (await import('../natal/natal')).openNatal(...a);
const openAsk = async (...a: Parameters<typeof import('./ask-ui').openAsk>) => (await import('./ask-ui')).openAsk(...a);
const openHonesty = async (...a: Parameters<typeof import('./honesty').openHonesty>) => (await import('./honesty')).openHonesty(...a);
// Зум (§4.2): колесо и пинч ведут непрерывный z лестницы масштабов; перетаскивание крутит фигуру.
stageEl.addEventListener('wheel', (e) => {
  if (Math.abs(e.deltaY) < 1) return;
  scale.nudge(Math.max(-0.35, Math.min(0.35, e.deltaY * (e.deltaMode === 1 ? 0.04 : 0.0022))));
}, { passive: true });
let dragRot = 0, dragV = 0, dragX: number | null = null, pinchD = 0;
stageEl.addEventListener('pointerdown', (e) => { if (e.isPrimary && (e.target as HTMLElement).closest('button,a,input') == null) dragX = e.clientX; });
addEventListener('pointermove', (e) => { if (dragX != null && e.isPrimary) { const d = (e.clientX - dragX) * 0.006; dragRot += d; dragV = d; dragX = e.clientX; } });
addEventListener('pointerup', () => { dragX = null; });
stageEl.addEventListener('touchmove', (e) => {
  if (e.touches.length !== 2) return;
  const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  if (pinchD) scale.nudge(-Math.log(d / pinchD) * 1.2); // разводим пальцы = внутрь
  pinchD = d; e.preventDefault();
}, { passive: false });
stageEl.addEventListener('touchend', () => { pinchD = 0; });
// Подсказка жеста — один раз на устройство, гаснет после первого зума/поворота.
const hint = document.getElementById('hint') as HTMLElement;
const hintDone = (): void => { if (!hint.hidden && !hint.classList.contains('out')) { hint.classList.add('out'); try { localStorage.setItem('cosmos.hint', '1'); } catch { /* приватный режим */ } } };
let hintSeen = false; try { hintSeen = !!localStorage.getItem('cosmos.hint'); } catch { /* ignore */ }
if (!hintSeen && !reduceMotion) setTimeout(() => {
  hint.textContent = matchMedia('(pointer: coarse)').matches ? 'щипок — масштаб · потяни — поворот' : 'колесо — масштаб · потяни — поворот · ↑ ↓';
  hint.hidden = false; setTimeout(hintDone, 9000);
}, 3600);
stageEl.addEventListener('wheel', hintDone, { passive: true, once: true });
stageEl.addEventListener('pointerdown', hintDone, { passive: true, once: true });
// Клавиши — без анимации ожидания: ↑/] наружу, ↓/[ внутрь (§Emil: клавиатурные действия мгновенны).
document.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).closest('input,textarea,select,[contenteditable]')) return;
  if (e.key === 'ArrowUp' || e.key === ']') { scale.step(1); hintDone(); }
  else if (e.key === 'ArrowDown' || e.key === '[') { scale.step(-1); hintDone(); }
});
const syncLook = (): void => { LOOK.y = portrait ? 0.95 : 0.84; };
syncLook();
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
    if (slowFrames > 60) { degraded = true; stage.renderer.setPixelRatio(1); stage.setBloom(false); fit(); }
  }
  bodyPts.setReveal(reduceMotion ? 1 : Math.min(1, (now - t0) / 4200));
  stage.camera.position.copy(baseCam);
  if (!reduceMotion) {
    t += 0.008;
    body.scale.setScalar(1 + Math.sin(t) * 0.01);
    if (dragX == null) { dragRot += dragV; dragV *= 0.93; } // инерция после отпускания: докручивается и гаснет
    body.rotation.y = Math.sin(t * 0.3) * 0.18 + dragRot;
    bodyPts.setTime(now / 1000);
    flux.setTime(now / 1000); decays.setTime(now / 1000); neutrinos.setTime(now / 1000); fieldLines.setTime(now / 1000);
    gain(now);
    stage.renderer.getDrawingBufferSize(dbSize);
    nebula.update(now / 1000, dbSize.x, dbSize.y);
  }
  stage.render();
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
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('staged');
  document.querySelectorAll<HTMLElement>('.stage[data-t]').forEach((el) => setTimeout(() => el.classList.add('on'), Number(el.dataset.t)));
}

const panel = document.getElementById('panel') as HTMLElement;
// Панель как drawer: свайп вправо закрывает — по расстоянию или по скорости флика (velocity > 0.11 px/мс).
{
  let sx = 0, sy = 0, dx = 0, t0d = 0, horiz: boolean | null = null;
  panel.addEventListener('pointerdown', (e) => { if (matchMedia('(min-width: 761px)').matches) { sx = e.clientX; sy = e.clientY; dx = 0; t0d = performance.now(); horiz = null; } else horiz = false; });
  panel.addEventListener('pointermove', (e) => {
    if (horiz === false || !t0d) return;
    const mx = e.clientX - sx, my = e.clientY - sy;
    if (horiz === null) { if (Math.abs(mx) < 6 && Math.abs(my) < 6) return; horiz = Math.abs(mx) > Math.abs(my); if (!horiz) return; panel.classList.add('dragging'); panel.setPointerCapture(e.pointerId); }
    dx = Math.max(0, mx); panel.style.transform = `translateX(${dx}px)`; panel.style.opacity = String(1 - dx / 600);
  });
  const end = (): void => {
    if (!horiz) { t0d = 0; return; }
    const v = dx / Math.max(1, performance.now() - t0d);
    panel.classList.remove('dragging'); panel.style.transform = ''; panel.style.opacity = '';
    if (dx > 120 || v > 0.11) document.documentElement.classList.remove('panel-open');
    horiz = null; t0d = 0;
  };
  panel.addEventListener('pointerup', end); panel.addEventListener('pointercancel', end);
}
let currentSky: Value[] = [];
let skyVisual = '';
let liveValues: Value[] = [];
// §2.3 контент-база: 77 параметров по уровням масштаба. Контекст — всё, что человек уже дал (место, дата рождения, Kp).
const ctx: Ctx = { when: new Date(), massKg: 70, heightM: 1.7 };
let contentLevel = BODY_LEVEL;
function contentAll(): Value[] { return contentValues({ ...ctx, when: new Date() }); }
function contentHere(): Value[] { return contentValues({ ...ctx, when: new Date() }, contentLevel); }
function allValues(): Value[] { return [...currentSky, ...bodyValues, ...liveValues, ...contentAll()]; }
function render() {
  renderPanel(panel, [
    { title: 'Небо в твоей точке', note: 'Появится после «Что происходит с тобой сейчас» — координаты не покидают браузер.', values: currentSky, visual: skyVisual },
    { title: 'Твоё тело', values: bodyValues },
    { title: 'Живое сейчас', note: 'NOAA Kp загружается…', values: liveValues },
    { title: `${expLabel(LEVELS[contentLevel].exp)} — ${levelName(contentLevel)}`, note: 'Меняй масштаб кнопками «внутрь»/«наружу» — параметры следуют за уровнем.', values: contentHere() },
  ]);
}
(window.requestIdleCallback ?? ((f: () => void) => setTimeout(f, 200)))(() => render());

// «Спросить дальше» на карточках (§2.2): один оверлей, контекст — все видимые значения.
const askOverlay = document.getElementById('ask') as HTMLElement;
panel.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
  if (!el) return;
  const all = allValues();
  const done = (txt: string) => { const m = el.parentElement!; m.innerHTML = `<span class="micro-q">${txt}</span>`; };
  if (el.dataset.ask) { track('ask'); openAsk(askOverlay, all.find((v) => v.id === el.dataset.ask), all); }
  else if (el.dataset.clear) { // §7.6
    const [id, ok] = el.dataset.clear.split(':');
    sendFeedback({ kind: 'clear', id, ok: ok === '1' });
    if (ok === '1') done('спасибо');
    else { done('объясняю проще →'); openAsk(askOverlay, all.find((v) => v.id === id), all, 'Объясни проще, как для школьника'); }
  } else if (el.dataset.check) { // §7.4: только результат и часовой пояс, без координат
    const [id, result] = el.dataset.check.split(':') as [string, 'yes' | 'no' | 'unclear'];
    const delta = result === 'no' ? (prompt('На сколько разошлось? (например: 15 см, 3°)') ?? '') : undefined;
    sendFeedback({ kind: 'check', id, result, delta });
    done(result === 'yes' ? 'записал: сошлось' : result === 'no' ? 'записал расхождение — проверим модель' : 'записал; допишем инструкцию');
  } else if (el.dataset.wrong) { // §7.3
    const v = all.find((x) => x.id === el.dataset.wrong); if (v) openWrong(v);
  }
});

// §7.3 форма «число неверно»: нативный <dialog>; входные данные — только по явному согласию (§7.1).
const wrongDlg = document.getElementById('wrongDlg') as HTMLDialogElement;
function openWrong(v: Value): void {
  (wrongDlg.querySelector('#wrongShown') as HTMLElement).textContent = `${v.label}: ${v.value ?? '—'} ${v.unit} ${v.text ?? ''}`.trim();
  wrongDlg.showModal();
  const form = wrongDlg.querySelector('form') as HTMLFormElement;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const attach = f.get('attach') === 'on' && birthLat.value ? `lat ${birthLat.value}, lon ${birthLon.value}, birth ${birth.value} ${birthTime.value} ${birthTz.value}` : undefined;
    const fb = { kind: 'wrong' as const, id: v.id, shown: `${v.value ?? '—'} ${v.unit}`, expected: String(f.get('expected')), source: String(f.get('source')), inputs: attach };
    const ok = await sendFeedback(fb);
    wrongDlg.close();
    if (!ok) location.href = wrongNumberMailto(v); // §7.11: канал обязан работать с первого дня
    form.reset();
  };
}
wrongDlg.querySelector('.natal-close')?.addEventListener('click', () => wrongDlg.close());

// Живой слой (§3.1): NOAA Kp. Не блокирует и не роняет сцену — появляется, когда придёт.
fetchKp().then((c) => { liveValues = [toValue(c)]; if (typeof c.value === 'number') { kpLive = c.value; ctx.kp = c.value; liveShapes.kp = c.value; scale.refresh(); } render(); });

// --- «Показать, что происходит именно с тобой» → гео + сейчас (§2.4). Координаты не уходят на сервер. ---
const btn = document.getElementById('reveal') as HTMLButtonElement;
const status = document.getElementById('status') as HTMLElement;

btn.addEventListener('click', () => {
  document.documentElement.classList.add('panel-open');
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
      currentSky = sky; ctx.lat = lat; ctx.lon = lon;
      // Сцена по живым данным (§2.3 #4, #8): направление на Солнце и вектор поля в твоей точке.
      const alt = sunAltitude(lat, lon, now).value ?? 0, az = sunAzimuth(lat, lon, now).value ?? 180;
      const incl = magneticInclination(lat, lon, now).value ?? 60, decl = magneticDeclination(lat, lon, now).value ?? 0;
      neutrinos.setSun(alt, az); neutrinos.setOn(1); fieldLines.setField(incl, decl); fieldLines.setOn(1);
      innerLegend.innerHTML = `<span><i class="sw sw-decay"></i>распады K-40 (показан 1 из 70)</span><span><i class="sw sw-nu"></i>нейтрино от Солнца, высота ${alt.toFixed(0)}° — ${alt > 0 ? 'сверху, в грудь' : 'снизу, сквозь Землю'}</span><span><i class="sw sw-mag"></i>магнитные линии, наклонение ${incl.toFixed(0)}°</span>`;
      const bodies = skyBodies(lat, lon, now);
      skyVisual = horizonSVG(bodies);
      liveShapes.bodies = bodies.filter((b) => b.alt > 0);
      Promise.all([import('../data/stars'), import('../compute/liveshapes')]).then(([st, ls]) => st.loadStars().then((cat) => { liveShapes.stars = ls.starsAltAz(cat, lat, lon, now); scale.refresh(); })).catch(() => scale.refresh());
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
// Уточнение времени/места показываем только когда дата введена — экран без лишних строк.
birth.addEventListener('input', () => { document.documentElement.classList.toggle('has-birth', !!birth.value); ctx.ageYears = birth.value ? (Date.now() - new Date(birth.value).getTime()) / (365.25 * 86_400_000) : undefined; render(); });
(document.getElementById('openPanel') as HTMLButtonElement).addEventListener('click', () => {
  document.documentElement.classList.toggle('panel-open');
  document.getElementById('panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
// Мобильное меню: бургер ↔ крест, любой пункт закрывает.
const burger = document.getElementById('burger') as HTMLButtonElement;
const setMenu = (on: boolean): void => { document.documentElement.classList.toggle('menu-open', on); burger.setAttribute('aria-expanded', String(on)); };
burger.addEventListener('click', () => setMenu(!document.documentElement.classList.contains('menu-open')));
document.querySelectorAll('#menu a, #menu button').forEach((el) => el.addEventListener('click', () => setMenu(false)));
const birthTime = document.getElementById('birthTime') as HTMLInputElement;
const birthLat = document.getElementById('birthLat') as HTMLInputElement;
const birthLon = document.getElementById('birthLon') as HTMLInputElement;
const birthTz = document.getElementById('birthTz') as HTMLInputElement;
const birthPlace = document.getElementById('birthPlace') as HTMLInputElement;
const placeList = document.getElementById('placeList') as HTMLUListElement;
const placeHint = document.getElementById('placeHint') as HTMLElement;

// Город рождения: база в браузере (§3.7), подсказки по префиксу, выбор → координаты + зона.
let places: Place[] = [];
let sel = -1;
function showPlaces(items: Place[]): void {
  placeList.innerHTML = items.map((p, i) => `<li role="option" data-i="${i}" aria-selected="${i === sel}">${placeLabel(p)}<small>${p.tz}</small></li>`).join('');
  placeList.hidden = items.length === 0;
}
function pickPlace(p: Place): void {
  birthPlace.value = placeLabel(p); birthLat.value = String(p.lat); birthLon.value = String(p.lon); birthTz.value = p.tz;
  placeList.hidden = true; sel = -1;
  placeHint.textContent = `время — местное (${p.tz}); координаты остаются в браузере`;
}
let shown: Place[] = [];
birthPlace.addEventListener('focus', () => { loadPlaces().then((p) => { places = p; }); });
birthPlace.addEventListener('input', async () => {
  birthTz.value = ''; birthLat.value = ''; birthLon.value = '';
  if (!places.length) places = await loadPlaces();
  sel = -1; shown = searchPlaces(places, birthPlace.value); showPlaces(shown);
});
birthPlace.addEventListener('keydown', (e) => {
  if (placeList.hidden) return;
  if (e.key === 'ArrowDown') { sel = Math.min(shown.length - 1, sel + 1); showPlaces(shown); e.preventDefault(); }
  else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); showPlaces(shown); e.preventDefault(); }
  else if (e.key === 'Enter' && sel >= 0) { pickPlace(shown[sel]); e.preventDefault(); }
  else if (e.key === 'Escape') { placeList.hidden = true; }
});
placeList.addEventListener('mousedown', (e) => {
  const li = (e.target as HTMLElement).closest('li'); if (li) pickPlace(shown[Number(li.dataset.i)]);
});
birthPlace.addEventListener('blur', () => setTimeout(() => { placeList.hidden = true; }, 150));

// Момент рождения: дата (+ местное время по зоне города, иначе полдень UTC); место — если есть координаты.
function birthMoment(): { when: Date; place?: { lat: number; lon: number } } {
  const t = birthTime.value || '12:00';
  const when = birth.value ? localToUtc(birth.value, t, birthTz.value || undefined) : new Date();
  const lat = parseFloat(birthLat.value), lon = parseFloat(birthLon.value);
  const place = birthTime.value && Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : undefined;
  return { when, place };
}
openBtn.addEventListener('click', () => {
  const { when, place } = birthMoment();
  // Ссылка шеринга — в тех же терминах, что ввод: местное время + tz + координаты (§2.1); без времени — только дата.
  const link = `${location.origin}/?birth=${birth.value}${place ? `&t=${birthTime.value}&lat=${place.lat.toFixed(3)}&lon=${place.lon.toFixed(3)}${birthTz.value ? `&tz=${encodeURIComponent(birthTz.value)}` : ''}` : ''}`;
  track('natal'); openNatal(natalOverlay, when, place, link);
});
(document.getElementById('birthHere') as HTMLButtonElement).addEventListener('click', () => {
  navigator.geolocation?.getCurrentPosition((pos) => {
    birthLat.value = pos.coords.latitude.toFixed(3);
    birthLon.value = pos.coords.longitude.toFixed(3);
    birthTz.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
    birthPlace.value = `здесь (${birthLat.value}, ${birthLon.value})`;
    placeHint.textContent = `время — местное (${birthTz.value}); координаты остаются в браузере`;
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
    birthTz.value = qs.get('tz') ?? '';
    if (birthLat.value) { birthPlace.value = `${birthLat.value}, ${birthLon.value}`; placeHint.textContent = birthTz.value ? `из ссылки: время местное (${birthTz.value})` : 'из ссылки: время по UTC, координаты заданы'; }
    (document.getElementById('natalMore') as HTMLDetailsElement).open = true;
  }
  const { when, place } = birthMoment();
  // Ссылка шеринга — в тех же терминах, что ввод: местное время + tz + координаты (§2.1); без времени — только дата.
  const link = `${location.origin}/?birth=${birth.value}${place ? `&t=${birthTime.value}&lat=${place.lat.toFixed(3)}&lon=${place.lon.toFixed(3)}${birthTz.value ? `&tz=${encodeURIComponent(birthTz.value)}` : ''}` : ''}`;
  track('natal'); openNatal(natalOverlay, when, place, link);
}

// Esc закрывает любой открытый оверлей (§3.10).
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (document.documentElement.classList.contains('menu-open')) { setMenu(false); return; }
  for (const id of ['ask', 'natal', 'honesty']) { const el = document.getElementById(id); if (el && !el.hidden) { el.hidden = true; return; } }
});

// --- Погрешности (§7.8) ---
const honestyOverlay = document.getElementById('honesty') as HTMLElement;
(document.getElementById('openHonesty') as HTMLButtonElement)
  .addEventListener('click', () => { track('honesty'); openHonesty(honestyOverlay); });
