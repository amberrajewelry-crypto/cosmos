// Страница /karta/ — астропроцессор: форма всегда на экране, карта и вкладки рендерятся прямо под ней (не оверлей).
import { initBirthForm } from './birth-form';
import { openNatal } from '../natal/natal';

const bf = initBirthForm();
const box = document.getElementById('natal') as HTMLElement;
const birth = document.getElementById('birth') as HTMLInputElement;
const build = (): void => {
  if (!birth.value) { birth.focus(); return; }
  const m = bf.moment();
  openNatal(box, m.when, m.place, bf.link(m));
  document.documentElement.classList.add('has-chart');
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
(document.getElementById('openNatal') as HTMLButtonElement).addEventListener('click', build);
birth.addEventListener('input', () => document.documentElement.classList.toggle('has-birth', !!birth.value));
if (bf.applyQuery(new URLSearchParams(location.search))) { birth.dispatchEvent(new Event('input')); build(); }
