import { loadPlaces, searchPlaces, placeLabel, type Place } from '../data/places';
import { localToUtc } from '../compute/localtime';

// Форма момента рождения: дата + местное время + город (база в браузере, §3.7) → UTC-момент, координаты, ссылка шеринга (§2.1).
export type BirthMoment = { when: Date; place?: { lat: number; lon: number } };

export function initBirthForm() {
  const birth = document.getElementById('birth') as HTMLInputElement;
  const birthTime = document.getElementById('birthTime') as HTMLInputElement;
  const birthLat = document.getElementById('birthLat') as HTMLInputElement;
  const birthLon = document.getElementById('birthLon') as HTMLInputElement;
  const birthTz = document.getElementById('birthTz') as HTMLInputElement;
  const birthPlace = document.getElementById('birthPlace') as HTMLInputElement;
  const placeList = document.getElementById('placeList') as HTMLUListElement;
  const placeHint = document.getElementById('placeHint') as HTMLElement;

  // Подсказки по префиксу, выбор → координаты + зона.
  let places: Place[] = [], shown: Place[] = [], sel = -1;
  const showPlaces = (items: Place[]): void => {
    placeList.innerHTML = items.map((p, i) => `<li role="option" data-i="${i}" aria-selected="${i === sel}">${placeLabel(p)}<small>${p.tz}</small></li>`).join('');
    placeList.hidden = items.length === 0;
  };
  const pickPlace = (p: Place): void => {
    birthPlace.value = placeLabel(p); birthLat.value = String(p.lat); birthLon.value = String(p.lon); birthTz.value = p.tz;
    placeList.hidden = true; sel = -1;
    placeHint.textContent = `время — местное (${p.tz}); координаты остаются в браузере`;
  };
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
  (document.getElementById('birthHere') as HTMLButtonElement).addEventListener('click', () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      birthLat.value = pos.coords.latitude.toFixed(3);
      birthLon.value = pos.coords.longitude.toFixed(3);
      birthTz.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
      birthPlace.value = `здесь (${birthLat.value}, ${birthLon.value})`;
      placeHint.textContent = `время — местное (${birthTz.value}); координаты остаются в браузере`;
    });
  });

  // Момент рождения: дата (+ местное время по зоне города, иначе полдень UTC); место — если есть координаты.
  const moment = (): BirthMoment => {
    const t = birthTime.value || '12:00';
    const when = birth.value ? localToUtc(birth.value, t, birthTz.value || undefined) : new Date();
    const lat = parseFloat(birthLat.value), lon = parseFloat(birthLon.value);
    const place = birthTime.value && Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : undefined;
    return { when, place };
  };
  // Ссылка шеринга — в тех же терминах, что ввод: местное время + tz + координаты; без времени — только дата.
  const link = (m: BirthMoment): string =>
    `${location.origin}/?birth=${birth.value}${m.place ? `&t=${birthTime.value}&lat=${m.place.lat.toFixed(3)}&lon=${m.place.lon.toFixed(3)}${birthTz.value ? `&tz=${encodeURIComponent(birthTz.value)}` : ''}` : ''}`;
  // Входные данные для формы «число неверно» — только по явному согласию (§7.1).
  const inputsText = (): string | undefined => birthLat.value ? `lat ${birthLat.value}, lon ${birthLon.value}, birth ${birth.value} ${birthTime.value} ${birthTz.value}` : undefined;
  // Ссылка /?birth=YYYY-MM-DD[&t=HH:MM&lat=..&lon=..&tz=..] заполняет форму; true — карту надо открыть сразу.
  const applyQuery = (qs: URLSearchParams): boolean => {
    const shared = qs.get('birth');
    if (!shared || !/^\d{4}-\d{2}-\d{2}$/.test(shared)) return false;
    birth.value = shared;
    if (/^\d{2}:\d{2}$/.test(qs.get('t') ?? '')) {
      birthTime.value = qs.get('t')!;
      birthLat.value = qs.get('lat') ?? ''; birthLon.value = qs.get('lon') ?? ''; birthTz.value = qs.get('tz') ?? '';
      if (birthLat.value) { birthPlace.value = `${birthLat.value}, ${birthLon.value}`; placeHint.textContent = birthTz.value ? `из ссылки: время местное (${birthTz.value})` : 'из ссылки: время по UTC, координаты заданы'; }
      (document.getElementById('natalMore') as HTMLDetailsElement).open = true;
    }
    return true;
  };
  return { birth, moment, link, inputsText, applyQuery };
}
