// Страница /karta/ — астропроцессор: режимы (натал / транзиты / карта неба / соляр / синастрия / дирекции),
// форма всегда на экране, карта и таблицы рендерятся прямо под ней (не оверлей).
import { initBirthForm } from './birth-form';
import { openNatal } from '../natal/natal';

const MODES: Record<string, { title: string; lede: string; view: string }> = {
  natal: { title: 'Натальная карта <em>по настоящему небу</em>', lede: 'Дата, время и город рождения → положение Солнца, Луны и планет на реальном небе в ту минуту, созвездия рядом со знаками гороскопа, Асцендент и MC при известном времени, углы между телами. Дальше — разбор по классике астрологии (Птолемей, Лилли, Лео): характер, путь, наставление по каждой планете, дому и аспекту, рядом — что об этом знает наука. Всё считается в браузере, ничего не отправляется. Не знаешь время — введи только дату.', view: 'reading' },
  transits: { title: 'Планеты сейчас <em>над картой рождения</em>', lede: 'Где те же тела находятся в выбранный момент относительно положения при рождении: градусы, созвездия, сколько оборотов прошло. ', view: 'transits' },
  sky: { title: 'Небо <em>на любую дату</em>', lede: 'Положения Солнца, Луны и планет на любую дату — созвездия по границам МАС, расстояния, попятное движение.', view: 'sky' },
  solar: { title: 'Возвращение Солнца <em>(соляр)</em>', lede: 'Момент, когда Солнце возвращается на долготу рождения в выбранном году — до минуты, со сдвигом от календарной даты и небом в этот момент.', view: 'solar' },
  synastry: { title: 'Две даты рядом <em>(синастрия)</em>', lede: 'Две карты рядом: самые точные аспекты между планетами двух людей с трактовкой по классике и наставлением паре, плюс оба неба, разница в сутках и лунных месяцах.', view: 'synastry' },
  directions: { title: 'Сдвиг на годы <em>(дирекции)</em>', lede: 'Карта рождения, сдвинутая на градус за год жизни: какие точки к целевой дате встали в аспект к натальным — с трактовкой по классике. Рядом — что реально изменилось на небе.', view: 'directions' },
};

const bf = initBirthForm();
const box = document.getElementById('natal') as HTMLElement;
const birth = document.getElementById('birth') as HTMLInputElement;
const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
let mode = 'natal';
const setMode = (m: string): void => {
  mode = m;
  document.querySelectorAll('#modes button').forEach((b) => { const on = (b as HTMLElement).dataset.mode === m; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
  document.querySelectorAll('.kform .sub').forEach((d) => d.classList.toggle('on', (d as HTMLElement).dataset.for === m));
  document.getElementById('modeTitle')!.innerHTML = MODES[m].title;
  document.getElementById('modeLede')!.textContent = MODES[m].lede;
  $('dyn').classList.toggle('on', m === 'transits' || m === 'sky' || m === 'directions');
  if (!box.hidden && birth.value) build();
};
document.querySelectorAll('#modes button').forEach((b) => b.addEventListener('click', () => setMode((b as HTMLElement).dataset.mode!)));
// Tool list rows: switch mode and scroll to the form
document.querySelectorAll<HTMLElement>('.ktools li[data-mode]').forEach((li) => { const go = () => { setMode(li.dataset.mode!); document.getElementById('kform')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; li.addEventListener('click', go); li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }); });

const dateAt = (d: string, t: string): Date | undefined => d ? new Date(`${d}T${t || '12:00'}:00Z`) : undefined;
const today = new Date().toISOString().slice(0, 10);
$('atDate').value = today; $('atTime').value = new Date().toISOString().slice(11, 16); $('skyDate').value = today;
$('solYear').value = String(new Date().getUTCFullYear()); $('dirDate').value = today;

// Состояние страницы в URL: режим + данные — ссылка воспроизводит ровно эту карту
const stateUrl = (): string => {
  const q = new URLSearchParams(bf.link(bf.moment()).split('?')[1] ?? '');
  q.set('mode', mode);
  const extra: Record<string, string> = { transits: `${$('atDate').value}T${$('atTime').value}`, sky: $('skyDate').value, directions: $('dirDate').value, solar: $('solYear').value, synastry: `${$('synDate').value}${$('synTime').value ? 'T' + $('synTime').value : ''}` };
  if (extra[mode]) q.set('at', extra[mode]);
  if ($('outer').value !== '1') q.set('outer', '0');
  return `${location.origin}/karta/?${q}`;
};
const applyAt = (m: string, at: string): void => {
  const [d, t] = at.split('T');
  if (m === 'transits') { $('atDate').value = d; if (t) $('atTime').value = t; }
  else if (m === 'sky') $('skyDate').value = d; else if (m === 'directions') $('dirDate').value = d;
  else if (m === 'solar') $('solYear').value = d; else if (m === 'synastry') { $('synDate').value = d; if (t) $('synTime').value = t; }
};

const build = (scroll = true): void => {
  const err = $('birthErr');
  if (!birth.value) { err.hidden = false; birth.setAttribute('aria-invalid', 'true'); birth.focus(); return; }
  err.hidden = true; birth.removeAttribute('aria-invalid');
  const m = bf.moment();
  const at = mode === 'transits' ? dateAt($('atDate').value, $('atTime').value) : mode === 'sky' ? dateAt($('skyDate').value, '12:00') : mode === 'directions' ? dateAt($('dirDate').value, '12:00') : undefined;
  openNatal(box, m.when, m.place, stateUrl(), {
    view: MODES[mode].view, at, second: dateAt($('synDate').value, $('synTime').value),
    year: Number($('solYear').value) || undefined, outer: $('outer').value === '1',
  });
  document.documentElement.classList.add('has-chart');
  $('copyTable').hidden = false; $('printChart').hidden = false;
  remember();
  history.replaceState(null, '', stateUrl());
  if (scroll) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// «Сейчас / сегодня» у дат транзита, неба, дирекции
document.querySelectorAll<HTMLButtonElement>('.now').forEach((b) => b.addEventListener('click', () => {
  const now = new Date();
  if (b.dataset.now === 'transits') { $('atDate').value = now.toISOString().slice(0, 10); $('atTime').value = now.toISOString().slice(11, 16); }
  else $(b.dataset.now === 'sky' ? 'skyDate' : 'dirDate').value = now.toISOString().slice(0, 10);
}));

// Недавние карты: до 5 в localStorage, чип = дата + место
type Recent = { q: string; label: string };
const RK = 'cosmos.recent';
const readRecent = (): Recent[] => { try { return JSON.parse(localStorage.getItem(RK) ?? '[]'); } catch { return []; } };
const renderRecent = (): void => {
  const list = readRecent(); const el = $('recent'); el.hidden = list.length === 0;
  el.innerHTML = list.length ? '<span>Недавние</span>' + list.map((r, i) => `<button type="button" data-i="${i}">${r.label}</button>`).join('') + '<button type="button" class="x" data-clear title="Очистить">×</button>' : '';
};
const remember = (): void => {
  const q = bf.link(bf.moment()).split('?')[1] ?? ''; if (!q) return;
  const place = $('birthPlace').value.trim();
  const label = `${birth.value.split('-').reverse().join('.')}${$('birthTime').value ? ' ' + $('birthTime').value : ''}${place ? ' · ' + place.split(',')[0] : ''}`;
  const list = [{ q, label }, ...readRecent().filter((r) => r.q !== q)].slice(0, 5);
  try { localStorage.setItem(RK, JSON.stringify(list)); } catch { /* private mode */ }
  renderRecent();
};
$('recent').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('button'); if (!b) return;
  if (b.hasAttribute('data-clear')) { try { localStorage.removeItem(RK); } catch { /* noop */ } renderRecent(); return; }
  const r = readRecent()[Number(b.dataset.i)]; if (!r) return;
  bf.applyQuery(new URLSearchParams(r.q)); birth.dispatchEvent(new Event('input')); build();
});
renderRecent();

// Таблица активной вкладки → буфер обмена (TSV), печать → системный диалог (PDF)
$('copyTable').addEventListener('click', async () => {
  const rows = [...box.querySelectorAll('#natalView tr')].map((tr) => [...tr.children].map((c) => (c.textContent ?? '').trim()).join('\t'));
  const st = $('status');
  if (!rows.length) { st.textContent = 'таблицы во вкладке нет'; return; }
  try { await navigator.clipboard.writeText(rows.join('\n')); st.textContent = `скопировано ${rows.length - 1} строк`; } catch { st.textContent = 'буфер недоступен'; }
});
$('printChart').addEventListener('click', () => window.print());
(document.getElementById('kform') as HTMLFormElement).addEventListener('submit', (e) => { e.preventDefault(); build(); });
birth.addEventListener('input', () => { $('birthErr').hidden = true; birth.removeAttribute('aria-invalid'); });
$('outer').addEventListener('change', () => { if (!box.hidden && birth.value) build(); });

// Мобильное меню: бургер → полноэкранный список, Escape закрывает
const burger = document.getElementById('burger') as HTMLButtonElement;
const setMenu = (on: boolean): void => { document.documentElement.classList.toggle('menu-open', on); burger.setAttribute('aria-expanded', String(on)); };
burger.addEventListener('click', () => setMenu(!document.documentElement.classList.contains('menu-open')));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
birth.addEventListener('input', () => document.documentElement.classList.toggle('has-birth', !!birth.value));
const qs = new URLSearchParams(location.search);
if (MODES[qs.get('mode') ?? '']) setMode(qs.get('mode')!);
if (qs.get('at')) applyAt(mode, qs.get('at')!);
if (qs.get('outer') === '0') $('outer').value = '0';
if (bf.applyQuery(qs)) { birth.dispatchEvent(new Event('input')); build(); }

// Staggered entry reveals: IntersectionObserver, transform/opacity only (CSS .rv/.in)
const rv = document.querySelectorAll<HTMLElement>('.rv');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  rv.forEach((el) => io.observe(el));
} else rv.forEach((el) => el.classList.add('in'));

// Тема: тёмная по умолчанию, светлая по кнопке, выбор запоминается
const TK = 'cosmos.theme';
const setTheme = (light: boolean): void => {
  document.documentElement.classList.toggle('light', light);
  $('theme').setAttribute('aria-pressed', String(light));
  try { localStorage.setItem(TK, light ? 'light' : 'dark'); } catch { /* noop */ }
};
$('theme').addEventListener('click', () => setTheme(!document.documentElement.classList.contains('light')));
try { if (localStorage.getItem(TK) === 'light') setTheme(true); } catch { /* noop */ }

// Динамика: ползунок ±50 лет от выбранной даты, карта перестраивается на лету (rAF-троттлинг)
const dateField = (): HTMLInputElement => $(mode === 'transits' ? 'atDate' : mode === 'sky' ? 'skyDate' : 'dirDate');
let dynBase = '';
const fmtRu = (d: Date) => d.toISOString().slice(0, 10).split('-').reverse().join('.');
const shifted = (days: number): Date => { const d = new Date(`${dynBase}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d; };
let raf = 0;
const applyDyn = (): void => {
  const d = shifted(Number($('dynRange').value));
  dateField().value = d.toISOString().slice(0, 10);
  $('dynOut').value = fmtRu(d);
  if (!birth.value) return;
  cancelAnimationFrame(raf); raf = requestAnimationFrame(() => build(false));
};
$('dynOn').addEventListener('change', () => {
  const on = $('dynOn').checked; $('dynRow').hidden = !on;
  if (on) { dynBase = dateField().value || new Date().toISOString().slice(0, 10); $('dynRange').value = '0'; $('dynOut').value = fmtRu(shifted(0)); if (birth.value && box.hidden) build(); }
});
$('dynRange').addEventListener('input', applyDyn);
document.querySelectorAll<HTMLButtonElement>('.now[data-step]').forEach((b) => b.addEventListener('click', () => {
  $('dynRange').value = String(Math.max(-18262, Math.min(18262, Number($('dynRange').value) + Number(b.dataset.step)))); applyDyn();
}));
