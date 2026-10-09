/** «Мои дни»: карточка дня, подробности, календарь 8 недель, лучшие дни — вынесено из ui.ts. */
import {
  STEMS, BRANCHES, EL, EL_COLOR,
} from './core';
import {
   type Chart, type Analysis,
} from './calc';
import { elIcon } from './fx';
import { daysFrom, showThenClose, bestHours, DAY_TYPE, type DayInfo } from './days';

/** iCloud-ссылка на готовую команду iPhone «Карта дня» (вопрос при импорте — ссылка на заставку). Пусто — ручная инструкция. */
export const WP_SHORTCUT = '';
import { esc, lay, animalSm, thumb, ME_KEY } from './ui-kit';

export function dayCard(d: DayInfo, big = false, extra = '') {
  const s = STEMS[d.idx % 10], b = BRANCHES[d.idx % 12];
  return `<div class="dcard ${d.type}${big ? ' big' : ''}">${thumb(d.idx % 12, big ? 64 : 44)}<div>
    <div class="dhead"><p class="ddate">${dLabel(d)}</p><span class="dscore ${d.type}" aria-label="${dayRu(d)} · ${d.score} из 5"><span class="dots" aria-hidden="true">${[1, 2, 3, 4, 5].map((k) => `<i${k <= d.score ? ' class="f"' : ''}></i>`).join('')}</span>${dayRu(d)} · ${d.score} из 5</span></div>
    <h3><span style="color:${EL_COLOR[s.el]}">${b.animal}</span></h3>
    <p><b>${d.type === 'heavy' ? 'Тема дня' : 'Что делать'}:</b> ${esc(lay(d.act))}${d.type === 'heavy' ? '. Сегодня готовить и обдумывать, а не решать' : ''}.</p>
    ${d.type === 'peak' ? '' : `<p class="dhint">${DAY_TYPE[d.type].hint[0].toUpperCase() + DAY_TYPE[d.type].hint.slice(1)}.</p>`}
    ${((w) => w.length ? `<p class="dnote">Осторожно: ${w.map(esc).join('; ')}.</p>` : '')([...d.notes, ...(big ? d.warn : [])].map(lay).filter(Boolean))}
    ${big && d.good.length ? `<p class="dgood">Плюс дня: ${d.good.map(esc).join('; ')}.</p>` : ''}
    ${big && extra ? extra : ''}
  </div></div>`;
}

// Часы на руке = солнечное время + сдвиг. Если человек в том же поясе, что при рождении, — по долготе места рождения,
// иначе — по середине своего пояса (точность ±30 мин).
export function clockShift(c: Chart): number {
  const off = -new Date().getTimezoneOffset() / 60;
  let tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* нет Intl */ }
  return c.input.tz && tz === c.input.tz ? off - c.input.lon / 15 : 0;
}
export const ACC_EL = ['Дерево', 'Огонь', 'Землю', 'Металл', 'Воду'];
/** «Сильный · 2 из 5» читается как противоречие: стихия дня полезна, но фон десятилетия/года тянет вниз — так и пишем. */
export const dayRu = (d: DayInfo) => DAY_TYPE[d.type].ru;
export const BG_RU = { good: 'благоприятное', bad: 'с нагрузкой', mixed: 'смешанное', calm: 'спокойное' } as const;
export const BG_RU_Y = { good: 'благоприятный', bad: 'с нагрузкой', mixed: 'смешанный', calm: 'спокойный' } as const;
export function bgRu(d: DayInfo): string {
  const b = d.bg, parts = [`${b.luck ? `десятилетие ${BG_RU[b.luck]}, ` : ''}год ${BG_RU_Y[b.year]}`];
  parts.push(b.adj > 0 ? 'фон приподнимает оценку дня' : b.adj < 0 ? 'фон снижает оценку дня' : 'на оценку дня не влияет');
  return parts.join(' — ') + (b.swung ? '. В это десятилетие ваша сила меняет баланс, поэтому полезные стихии на нём другие, чем по рождению.' : '.');
}
export function dayMore(c: Chart, a: Analysis, d: DayInfo, days: DayInfo[]): string {
  const hh = bestHours(a, d, clockShift(c));
  const k = days.findIndex((x) => x.iso === d.iso), next = days[k + 1], week = days.slice(k + 1, k + 8);
  const pick = week.filter(bigOk), top = (pick.length ? pick : week).reduce<DayInfo | null>((m, x) => (!m || x.score > m.score ? x : m), null);
  return `<div class="dmore">
    <p><b>${d.heal ? 'Чем выровнять день' : 'На что опереться'}:</b> ${EL[d.med]} — ${esc(d.why)}.</p>
    ${hh.length ? `<p><b>Лучшие часы:</b> ${hh.join(', ')} <span class="dhint">(примерно, по местному времени)</span>.</p>` : ''}
    ${d.bg.adj || d.bg.swung ? `<p class="dhint"><b>Фон:</b> ${bgRu(d)}</p>` : ''}
    ${d.heal || !/уже есть в этом дне/.test(d.why) ? `<h4>${d.heal ? 'Как добавить' : 'Как поддержать'} ${ACC_EL[d.med]}</h4>
    <ul class="list"><li>${esc(d.add.theory)}</li>
      <li>${esc(d.add.folk)}</li></ul>` : ''}
    ${next ? `<p class="dhint">Завтра, ${dLabel(next)}: ${dayRu(next).toLowerCase()}, ${next.score} из 5.${top ? (pick.length ? ` Лучший день недели для важного — ${dLabel(top)} (${top.score} из 5).` : (d.score >= 3 ? ` Дальше на неделе сильных дней нет — важное лучше поставить на сегодня.` : ` Сильных дней на неделе нет — важное лучше перенести; самый ровный — ${dLabel(top)}.`)) : ''}</p>` : ''}
    <p class="dhint">Оценка из 5 — расчёт по стихиям и связям дня с вашей картой, не гарантия.</p>
  </div>`;
}

// ——— Мои дни: календарь по карте ———
/** День, на который можно ставить важное: сильный, от 3 из 5, без запрета на крупное — одно правило для «Лучших дней» и «лучшего дня недели». */
export const bigOk = (d: DayInfo) => d.type === 'peak' && d.score >= 3 && !d.notes.some((n) => n.includes('не начинать') || n.includes('не для решений'));
export const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
export const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MON_S = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
export const dLabel = (d: DayInfo, wd = true) => { const [y, m, dd] = d.iso.split('-').map(Number); const w = new Date(y, m - 1, dd).getDay(); return `${dd} ${MON[m - 1]}${wd ? ', ' + WD[w] : ''}`; };
export const dayCell = (d: DayInfo, today: boolean) => { const s = STEMS[d.idx % 10], b = BRANCHES[d.idx % 12], dd = +d.iso.slice(8);
  return `<button class="dc ${d.type}${today ? ' now' : ''}" data-iso="${d.iso}" title="${esc(DAY_TYPE[d.type].ru + ' · ' + d.god.short)}">${dd === 1 ? `<i class="dmon">${MON_S[+d.iso.slice(5, 7) - 1]}</i>` : ''}<b>${dd}</b><span style="color:${EL_COLOR[s.el]}">${elIcon(s.el, EL_COLOR[s.el], 11)}</span><img src="${animalSm(d.idx % 12)}" alt="${b.animal}" loading="lazy" /></button>`; };

export function secDays(c: Chart, a: Analysis) {
  const now = new Date(), start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = daysFrom(c, a, start, 120), today = days[0];
  // Лучшие — от 3 из 5; самые высокие оценки без запрета на крупное, потом по дате (раньше брались первые 5 подряд, в т.ч. «3 из 5, крупное не начинать»).
  const best = days.slice(0, 45).filter(bigOk)
    .sort((x, y) => y.score - x.score || x.iso.localeCompare(y.iso)).slice(0, 5).sort((x, y) => x.iso.localeCompare(y.iso));
  const pairs = showThenClose(days).slice(0, 5);
  const off = (start.getDay() + 6) % 7, grid = days.slice(0, 56);
  const cells = Array.from({ length: off }, () => '<i></i>').join('') + grid.map((d, k) => dayCell(d, k === 0)).join('');
  const fav = a.consensus.map((e) => EL[e].toLowerCase()).join(', ').replace(/, (?=[^,]*$)/, ' и '), bad = a.avoid.map((e) => EL[e].toLowerCase()).join(', ').replace(/, (?=[^,]*$)/, ' и ');
  return `<section class="block" id="s-days"><div class="bhead"><div><h2>Мои дни</h2></div>
    <p>Сильный день (4–5 из 5) — когда приходит полезная вам стихия (${fav}) и ничто её не перебивает: для главных шагов — переговоров, запусков, оплат, публикаций. Дни нагрузки (1–2 из 5) — когда ${bad ? `приходят ${bad} или ` : ''}день бьёт по вашей карте. Нажмите на день — подскажем, что на него ставить.</p></div>
    <div class="card pane"><p class="eyebrow">Сегодня</p><div id="dsel">${dayCard(today, true, dayMore(c, a, today, days))}</div></div>
    <div class="card pane jr" id="jr"><p class="eyebrow">Проверка прогноза</p>
      <p class="dhint">Как прошёл день — по ощущению, не глядя на прогноз? Ответы показывают, работает ли расчёт лично для вас. Дата рождения не отправляется.</p>
      <div id="jrows"></div><p class="dhint" id="jmy"></p><p class="dhint" id="jall" hidden></p></div>
    <div class="dsplit"><div class="dcal"><h3 style="margin-top:26px">8 недель</h3>
    <div class="dlegend"><span class="peak">сильный</span><span class="peak-hit">сильный, но с риском</span><span class="calm">ровный</span><span class="heavy">нагрузка</span></div>
    <div class="dgrid"><span>пн</span><span>вт</span><span>ср</span><span>чт</span><span>пт</span><span>сб</span><span>вс</span>${cells}</div></div>
    <div class="dbest"><h3 style="margin-top:26px">Лучшие дни ближайших 45 дней</h3><div class="dlist">${best.map((d) => dayCard(d)).join('') || '<p>Чистых сильных дней нет — ставьте важное на ровные дни.</p>'}</div></div></div>
    ${pairs.length ? `<h3 style="margin-top:26px">Связка «покажи → закрой»</h3><p class="dhint">День выражения (показать работу, продать), за ним день денег (закрыть сделку, выставить счёт): ${pairs.map(([x, y]) => `<b>${dLabel(x, false)} → ${dLabel(y, false)}</b>`).join(' · ')}.</p>` : ''}
    <div class="saved" hidden></div>
    <div class="acts dacts" style="margin-top:20px"><button class="ghost" data-push type="button">Мой день — каждое утро</button><button class="ghost" id="ics" type="button">Сильные дни — в календарь телефона</button><button class="ghost" id="addlist" type="button">Добавить в «Мои карты»</button><button class="ghost" id="saveme" type="button">${localStorage.getItem(ME_KEY) ? 'Обновить главную карту' : 'Сделать главной («Моя карта»)'}</button><span class="dhint" id="savemsg"></span></div>
    <details class="card pane wp" style="margin-top:16px"><summary><b>Заставка на телефон</b> — карта дня сама меняется каждое утро</summary>
      <p class="dhint">Экран блокировки на сегодня: оценка дня, лучшие часы, что делать и чего беречься, неделя вперёд. Часы и кнопки телефона ничего не закрывают.</p>
      ${WP_SHORTCUT ? `<div class="acts"><button class="primary" id="wpinstall" type="button">Поставить на iPhone</button><a class="ghost" id="wpopen" target="_blank" rel="noopener">Посмотреть картинку</a></div>
      <ol class="list"><li>Нажмите «Поставить на iPhone» — ссылка скопируется, откроется команда «Карта дня». «Добавить команду», в поле ссылки — «Вставить».</li>
        <li>«Команды» → «Автоматизация» → «+» → «Время суток»: 6:00, ежедневно, «Запускать сразу» → команда «Карта дня».</li>
        <li>Всё: каждое утро заставка обновляется сама.</li></ol>
      <p class="dhint"><button class="linkbtn" id="wpcopy" type="button">Только скопировать ссылку</button></p>`
      : `<div class="acts"><button class="ghost" id="wpcopy" type="button">Скопировать ссылку на заставку</button><a class="ghost" id="wpopen" target="_blank" rel="noopener">Посмотреть картинку</a></div>
      <ol class="list"><li>iPhone: «Команды» → «Автоматизация» → «+» → «Время суток»: 6:00, ежедневно, «Запускать сразу».</li>
        <li>Действие «Получить содержимое URL» — вставить скопированную ссылку.</li>
        <li>Действие «Установить обои» — экран блокировки; «Показать предпросмотр» выключить.</li>
        <li>Готово: каждое утро заставка обновится сама. Разово — откройте картинку, «Поделиться» → «Сделать обоями».</li></ol>`}
    </details>
  </section>`;
}
