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
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
(document.getElementById('openNatal') as HTMLButtonElement).addEventListener('click', build);
birth.addEventListener('input', () => document.documentElement.classList.toggle('has-birth', !!birth.value));
const qs = new URLSearchParams(location.search);
if (MODES[qs.get('mode') ?? '']) setMode(qs.get('mode')!);
if (bf.applyQuery(qs)) { birth.dispatchEvent(new Event('input')); build(); }
