// Что на сайте проверено, а что — традиция без проверки. Одна таблица на весь сайт: метка под заголовком блока
// и сводка «Честно о Бацзы». Факты — только из проверок проекта (~/projects/бацзы: tools/verify, bench_masters,
// tools/virtual/RESULTS.md, проверка профессий на архиве биографий 07.10). Новую проверку — сначала сюда.
// Без процентов, книг и иероглифов: «софт для людей».

export type EvStatus = 'ok' | 'part' | 'fail' | 'open';

export interface Evidence { status: EvStatus; what: string; text: string }

export const EV_LABEL: Record<EvStatus, string> = {
  ok: 'Проверено',
  part: 'Проверено частично',
  fail: 'Проверено — не подтвердилось',
  open: 'Не проверено',
};

export const EVIDENCE = {
  calc: { status: 'ok', what: 'Расчёт карты, тактов и смены месяцев',
    text: 'Сверено с независимой программой на 3000 датах за 200 лет: расхождение одно, на 16 секунд.' },
  yong: { status: 'part', what: 'Полезные стихии',
    text: 'Сверено с разборами старых мастеров на 302 картах: главный выбор совпадает примерно в 4 случаях из 10.' },
  character: { status: 'fail', what: 'Описание характера',
    text: 'Проверка вслепую на биографиях известных людей: своё описание узнавалось не чаще, чем чужое наугад. Читайте как традицию, не как диагноз.' },
  work: { status: 'fail', what: 'Подходящие занятия',
    text: 'На большом архиве биографий с точным временем рождения связи карты с профессией не нашли.' },
  periods: { status: 'open', what: 'Хорошие и трудные годы, десятилетия',
    text: 'Нужны оценки прожитых лет от многих людей. Отметьте свои в «Сверке с вашей жизнью».' },
  days: { status: 'open', what: 'Оценка дня',
    text: 'Собираем ответы «день хороший / тяжёлый». Вывод — после 150 ответов, порог записан заранее.' },
  spheres: { status: 'open', what: 'Сферы жизни, деньги, партнёр',
    text: 'Традиционное толкование, отдельно не проверялось.' },
  compat: { status: 'open', what: 'Совместимость',
    text: 'Традиционное толкование, на парах не проверялось.' },
} satisfies Record<string, Evidence>;

export type EvKey = keyof typeof EVIDENCE;

const escH = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Метка под заголовком блока: «Проверено — не подтвердилось. …». extra — уточнение для конкретной карты. */
export function evTag(k: EvKey, extra = ''): string {
  const e: Evidence = EVIDENCE[k];
  return `<p class="ev ev-${e.status}"><b>${EV_LABEL[e.status]}.</b> ${escH(e.text)}${extra ? ' ' + escH(extra) : ''}</p>`;
}

/** Сводка для блока «Честно о Бацзы». */
export function evSummary(): string {
  return `<ul class="evlist">${(Object.values(EVIDENCE) as Evidence[])
    .map((e) => `<li class="ev-${e.status}"><b>${escH(e.what)}</b> — ${EV_LABEL[e.status].toLowerCase()}. ${escH(e.text)}</li>`).join('')}</ul>`;
}
