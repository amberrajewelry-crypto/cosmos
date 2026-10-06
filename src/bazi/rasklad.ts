// «Расклад по 7 вопросам» — то, что обещает обычная консультация (кто ты и 4 животных, предназначение, стратегия,
// есть ли деньги и где, чем зарабатывать, какой партнёр, какой сейчас период), но каждый ответ — из расчёта карты,
// с пометкой, на чём он держится и насколько проверен (confidence.ts — HOLDOUT мастеров; портрет — слепой тест, KB 18 §8).
import { STEMS, BRANCHES, EL, GODS, type El } from './core';
import type { Analysis, Chart } from './calc';
import { describe } from './describe';
import { axisNote } from './reading';
import { rel, role, good, presence, PROF, GROUP_BY_REL, PARTNER_TYPE, groupOf } from './spheres';
import { yearForecast, type Tone } from './forecast';
import { confidence } from './confidence';

export interface Answer { q: string; a: string[]; basis: string }

const POS_ROLE: Record<string, string> = { year: 'год — род, старшие, как вас видит общество', month: 'месяц — работа и среда', day: 'день — вы сами и партнёр', hour: 'час — замыслы, дети, вторая половина жизни' };
const MONEY_PLACE: Record<string, string> = { year: 'от семьи и старших, через наследство и связи', month: 'через работу, профессию и среду', day: 'через партнёра, дом и личные договорённости', hour: 'через свои проекты, особенно во второй половине жизни' };
const STRATEGY = [
  'держаться союзников и партнёрства на равных: вместе вы сильнее, чем поодиночке',
  'делать и показывать: продукт, ремесло, выступление — сила растёт, когда выходит наружу',
  'брать ответственность за результат и деньги: конкретная цель и цена работают лучше общих идей',
  'встраиваться в систему и брать роль: должность, правила и чёткие обязательства вас собирают',
  'учиться и опираться на наставников, знания и документы: сначала база, потом рывок',
];
const TONE_Y: Record<Tone, string> = { good: 'попутный', bad: 'встречный — время укреплять, а не рисковать', mixed: 'смешанный: в одном помогает, в другом тормозит', calm: 'спокойный' };
const TONE_D: Record<Tone, string> = { good: 'попутное', bad: 'встречное — время укреплять, а не рисковать', mixed: 'смешанное: в одном помогает, в другом тормозит', calm: 'спокойное' };
const EL_ACC = ['дерево', 'огонь', 'землю', 'металл', 'воду'];
const PALACE = ['партнёр — равный и соратник, дом держится на общем деле', 'в паре важны лёгкость, разговоры и совместные радости', 'в паре важны быт, достаток и забота друг о друге', 'партнёр — сильный характер: рядом с ним рамки и дисциплина, и это нужно выдерживать', 'партнёр — опора и тыл, дом для вас место восстановления'];

export function rasklad(c: Chart, a: Analysis, now = new Date()): Answer[] {
  const r = rel(a), conf = confidence(a), d = describe(c, a);
  const yongNote = `зависит от полезной стихии (у мастеров совпадает ~${conf.of10} из 10)`;
  const out: Answer[] = [];

  // 1. Кто ты: главный элемент и 4 животных
  const dm = STEMS[a.dm];
  const animals = c.pillars.filter((p) => p.pos !== 'hour' || c.input.timeKnown).slice().reverse()
    .map((p) => `${BRANCHES[p.branch].animal} (${POS_ROLE[p.pos]})`);
  out.push({ q: 'Кто вы: главный элемент и животные карты', basis: 'расчёт четырёх столпов — точный',
    a: [`Главный элемент — ${dm.ru}, ${EL[dm.el].toLowerCase()} ${dm.yang ? 'ян' : 'инь'}: «${dm.image}».`, `Животные: ${animals.join('; ')}.`, d.lines[0]] });

  // 2. Предназначение: тема месяца (格) + куда уходит сила (полезный бог)
  const ax = axisNote(c, a), g = GODS[ax.godKey];
  const yongGroup = GROUP_BY_REL[(a.brain.yong - a.dmEl + 5) % 5];
  out.push({ q: 'Ваше предназначение', basis: `главная тема — по месяцу рождения (точно); направление — ${yongNote}`,
    a: [ax.godKey === 'BJ' || ax.godKey === 'JC' ? 'Главная тема — стоять на своём и вести своё: опора внутри вас, направление задаёте вы сами.' : `Главная тема жизни — «${g.ru}»: ${g.sense}.`,
      `Сила раскрывается через ${EL_ACC[a.brain.yong]} — это для вас «${yongGroup.toLowerCase()}».`] });

  // 3. Стратегия
  out.push({ q: 'Успешная стратегия поведения', basis: `тип силы — по расчёту; совет — ${yongNote}`,
    a: [`Ваш ход — ${STRATEGY[(a.brain.yong - a.dmEl + 5) % 5]}.`, ...d.lines.filter((l) => l.startsWith('Где вы теряете'))] });

  // 4. Есть ли деньги и где лежат
  const w = a.pct[r.wealth], wr = role(a, r.wealth), pres = presence(c, r.wealth), k = a.brain.power.key;
  const verdict = pres === 'none' ? 'Своих денег в карте мало: деньги приносят периоды, когда Богатство приходит извне.'
    : w >= 0.3 && k === 'weak' ? 'Деньги вокруг есть, а сил удержать меньше: богатеете через партнёров и команду, а не в одиночку.'
      : good(wr) && k !== 'weak' ? 'Да: деньги в карте есть и вам по силам — их можно брать и удерживать.'
        : wr === 'ji' ? 'Деньги в карте есть, но гонка за ними вас изматывает: зарабатывайте через своё сильное место, а не через погоню.'
          : 'Деньги в карте средние: стабильный доход реален, крупные суммы — по периодам.';
  const places = c.pillars.filter((p) => (p.pos !== 'day' && STEMS[p.stem].el === r.wealth) || STEMS[BRANCHES[p.branch].hidden[0]].el === r.wealth)
    .filter((p) => p.pos !== 'hour' || c.input.timeKnown).map((p) => MONEY_PLACE[p.pos]);
  out.push({ q: 'Есть ли деньги в карте и где они лежат', basis: `где лежат — по расчёту (точно); «по силам ли» — ${yongNote}`,
    a: [verdict, places.length ? `Где лежат: ${[...new Set(places)].join('; ')}.` : 'На виду в карте Богатства нет — смотрите денежные периоды ниже.'] });

  // 5. Чем зарабатывать
  const top = groupOf(a)[0][0];
  out.push({ q: 'Какие занятия принесут деньги', basis: `сильная сторона — по расчёту; полезная сфера — ${yongNote}`,
    a: [`По полезной стихии: ${PROF[yongGroup]}.`, top !== yongGroup ? `По самой сильной стороне карты: ${PROF[top]}.` : 'Сильная сторона карты совпадает с полезной — это и есть ваша сфера.'] });

  // 6. Партнёр: звезда (Богатство у мужчины, Власть у женщины) + дворец (ветвь дня)
  const [s1, s2] = c.input.male ? ['ZC', 'PC'] : ['ZG', 'QS'];
  const t = (a.gods[s2] ?? 0) > (a.gods[s1] ?? 0) ? s2 : s1;
  const starEl = (c.input.male ? r.wealth : r.officer) as El, day = c.pillars.find((p) => p.pos === 'day')!;
  const palace = (STEMS[BRANCHES[day.branch].hidden[0]].el - a.dmEl + 5) % 5;
  out.push({ q: 'Какой партнёр нужен для гармоничного союза', basis: `тип — по расчёту; «на пользу ли» — ${yongNote}`,
    a: [`Ваш тип — ${PARTNER_TYPE[t]}.`,
      good(role(a, starEl)) ? 'Такой человек для вас — опора: союз усиливает и вас, и дела.' : role(a, starEl) === 'ji' ? 'Тянет к сильному партнёру, но рядом с ним легко потерять себя — договаривайтесь о границах заранее.' : 'Партнёр для вас — равный: союз держится на договорённостях, а не на притяжении.',
      `Дом и пара: ${PALACE[palace]}.`] });

  // 7. Какой сейчас период
  const Y = now.getMonth() === 0 || (now.getMonth() === 1 && now.getDate() < 4) ? now.getFullYear() - 1 : now.getFullYear();
  const yf = yearForecast(c, a, Y);
  out.push({ q: 'Какой сейчас период', basis: `смена десятилетий и годов — по расчёту (точно); их тон — ${yongNote}`,
    a: [yf.luck ? `Десятилетие с ${yf.luck.from} года — ${TONE_D[yf.luck.tone]}.` : '', `Год ${Y}–${Y + 1} (с начала февраля) — ${TONE_Y[yf.tone]}.`, yf.hits.length ? `В этом году: ${yf.hits.join('; ')}.` : ''].filter(Boolean) });
  return out;
}
