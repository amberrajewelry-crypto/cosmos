// Страница /karta/ — астропроцессор: режимы (натал / транзиты / карта неба / соляр / синастрия / дирекции),
// форма всегда на экране, карта и таблицы рендерятся прямо под ней (не оверлей).
import { initBirthForm } from './birth-form';
import { openNatal } from '../natal/natal';

const MODES: Record<string, { title: string; lede: string; view: string }> = {
  natal: { title: 'Настоящая натальная карта <em>онлайн</em>', lede: 'Положения планет и настоящие созвездия рядом со знаками гороскопа, Асцендент и MC при известном времени, углы между телами, досье фактов о дне. Всё считается в браузере.', view: 'planets' },
  transits: { title: 'Транзиты <em>к наталу</em>', lede: 'Где те же тела находятся в выбранный момент относительно положения при рождении: градусы, созвездия, сколько оборотов прошло. Без прогнозов.', view: 'transits' },
  sky: { title: 'Карта <em>неба</em>', lede: 'Положения Солнца, Луны и планет на любую дату — созвездия по границам МАС, расстояния, попятное движение.', view: 'sky' },
  solar: { title: '<em>Соляр</em>: возвращение Солнца', lede: 'Момент, когда Солнце возвращается на долготу рождения в выбранном году — до минуты, со сдвигом от календарной даты и небом в этот момент.', view: 'solar' },
  synastry: { title: '<em>Синастрия</em>: две даты', lede: 'Два неба рядом: положения тел, углы между одноимёнными телами, разница в сутках и лунных месяцах. Совместимость из углов не следует — и мы её не выводим.', view: 'synastry' },
  directions: { title: '<em>Дирекции</em>', lede: 'В астрологии — символический сдвиг карты на градус в год. Мы показываем, что реально изменится на небе к целевой дате: положения тел и обороты планет.', view: 'directions' },
};

const bf = initBirthForm();
const box = document.getElementById('natal') as HTMLElement;
const birth = document.getElementById('birth') as HTMLInputElement;
const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
let mode = 'natal';
const setMode = (m: string): void => {
  mode = m;
  document.querySelectorAll('#modes button').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.mode === m));
  document.querySelectorAll('.kform .sub').forEach((d) => d.classList.toggle('on', (d as HTMLElement).dataset.for === m));
  document.getElementById('modeTitle')!.innerHTML = MODES[m].title;
  document.getElementById('modeLede')!.textContent = MODES[m].lede;
  if (!box.hidden && birth.value) build();
};
document.querySelectorAll('#modes button').forEach((b) => b.addEventListener('click', () => setMode((b as HTMLElement).dataset.mode!)));

const dateAt = (d: string, t: string): Date | undefined => d ? new Date(`${d}T${t || '12:00'}:00Z`) : undefined;
const today = new Date().toISOString().slice(0, 10);
$('atDate').value = today; $('atTime').value = new Date().toISOString().slice(11, 16); $('skyDate').value = today;
$('solYear').value = String(new Date().getUTCFullYear()); $('dirDate').value = today;

const build = (): void => {
  if (!birth.value) { birth.focus(); return; }
  const m = bf.moment();
  const at = mode === 'transits' ? dateAt($('atDate').value, $('atTime').value) : mode === 'sky' ? dateAt($('skyDate').value, '12:00') : mode === 'directions' ? dateAt($('dirDate').value, '12:00') : undefined;
  openNatal(box, m.when, m.place, bf.link(m), {
    view: MODES[mode].view, at, second: dateAt($('synDate').value, $('synTime').value),
    year: Number($('solYear').value) || undefined, outer: $('outer').value === '1',
  });
  document.documentElement.classList.add('has-chart');
  $('copyTable').hidden = false; $('printChart').hidden = false;
  remember();
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
(document.getElementById('openNatal') as HTMLButtonElement).addEventListener('click', build);
birth.addEventListener('input', () => document.documentElement.classList.toggle('has-birth', !!birth.value));
const qs = new URLSearchParams(location.search);
if (MODES[qs.get('mode') ?? '']) setMode(qs.get('mode')!);
if (bf.applyQuery(qs)) { birth.dispatchEvent(new Event('input')); build(); }

// Staggered entry reveals: IntersectionObserver, transform/opacity only (CSS .rv/.in)
const rv = document.querySelectorAll<HTMLElement>('.rv');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  rv.forEach((el) => io.observe(el));
} else rv.forEach((el) => el.classList.add('in'));
