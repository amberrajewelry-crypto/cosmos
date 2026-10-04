// Сферы жизни простым языком: характер, дело, деньги, любовь, здоровье, родные (KB 12–14 в ~/projects/бацзы).
// Каждый вывод — из фактов карты (полезный бог мозга, сила, боги, дворцы) + правило корпуса; цитаты — дословно из KB.
// Нельзя: число детей, «克», болезни и сроки, патриархальная женская карта (KB 12 §5, 13 §3, 14 §1).
import { STEMS, BRANCHES, EL, EL_GEN, GODS, godOf, type El } from './core';
import type { Analysis, Chart, Pillar } from './calc';
import { yearIdx } from './calc';
import { DM_TEXT, EL_NEED } from './interp';
import { periodVerdict } from './brain';
import { GOD_ACT } from './days';
import type { Note } from './reading';

export interface Sphere { key: string; title: string; lead: string; points: string[]; todo: string; notes: Note[]; how?: string }

type Role = 'yong' | 'xi' | 'ji' | 'neutral';
const role = (a: Analysis, e: El): Role =>
  a.brain.yong === e ? 'yong' : a.brain.xi.includes(e) ? 'xi' : a.brain.ji.includes(e) ? 'ji' : 'neutral';
const ROLE_RU: Record<Role, string> = { yong: 'главная полезная стихия', xi: 'полезная стихия', ji: 'стихия-нагрузка', neutral: 'нейтральная стихия' };
const good = (r: Role) => r === 'yong' || r === 'xi';

// Стихии по отношению к господину дня.
const rel = (a: Analysis) => ({
  self: a.dmEl, out: ((a.dmEl + 1) % 5) as El, wealth: ((a.dmEl + 2) % 5) as El,
  officer: ((a.dmEl + 3) % 5) as El, res: ((a.dmEl + 4) % 5) as El,
});
const P = (c: Chart, pos: Pillar['pos']) => c.pillars.find((p) => p.pos === pos);
const visibleEls = (c: Chart) => c.pillars.filter((p) => p.pos !== 'day').map((p) => STEMS[p.stem].el);
const hiddenEls = (c: Chart) => c.pillars.flatMap((p) => BRANCHES[p.branch].hidden.map((h) => STEMS[h].el));
const presence = (c: Chart, e: El) => (visibleEls(c).includes(e) ? 'shown' : hiddenEls(c).includes(e) ? 'hidden' : 'none');
const pc = (x: number) => `${Math.round(x * 100)}%`;
const sixCombo = (x: number, y: number) => (x + y) % 12 === 1;   // 子丑 寅亥 卯戌 辰酉 巳申 午未
const clash = (x: number, y: number) => Math.abs(x - y) === 6;

// Органы по стихиям (ДТС; СМ; 管见 探玄篇) и что бьёт что (KB 13 §3).
const ORGANS = ['печень и желчный пузырь, сухожилия и суставы', 'сердце, кровообращение, глаза', 'желудок и селезёнка, пищеварение',
  'лёгкие, толстая кишка, кожа', 'почки, мочевой пузырь, нижняя часть тела'];
const HIT_QUOTE = ['筋骨疼痛，盖因木被金伤', '眼暗目昏，多是火遭水剋', '土虚乘木旺之乡，脾伤', '金弱遇火炎之地，血疾', '下元冷疾，只缘水值土伤'];

const POS_FACE: Record<string, string> = { year: 'в обществе и среди старших', month: 'в работе и среде', hour: 'в замыслах, с детьми и во второй половине жизни' };
const SEASON = ['весной', 'летом', 'на стыках сезонов (середина и конец каждого)', 'осенью', 'зимой'];
/** Проступившие боги по столпам: «как вас видят». */
const faces = (c: Chart, a: Analysis) => c.pillars.filter((p) => p.pos !== 'day').reverse().map((p) => ({ pos: p.pos, g: godOf(a.dm, p.stem) }));
const currentLuck = (c: Chart, now: number) => [...c.luck].reverse().find((l) => l.year <= now);
const span = (y: number) => `${y}–${y + 9}`;

const PROF: Record<string, string> = {
  'Опора': 'самостоятельная работа, своё дело, спорт, команда равных',
  'Выражение': 'ремесло, творчество, речь, продукт, преподавание, всё, где результат — вещь или выступление',
  'Богатство': 'торговля, управление ресурсами, финансы, предпринимательство',
  'Власть': 'система, должность, право, государственная или корпоративная лестница, ответственность за людей',
  'Ресурс': 'знание, исследование, образование, медицина, консультирование, работа с документами',
};
const GROUP_BY_REL = ['Опора', 'Выражение', 'Богатство', 'Власть', 'Ресурс'];
const groupOf = (a: Analysis) => {
  const g: Record<string, number> = {};
  for (const [k, w] of Object.entries(a.gods)) g[GODS[k].group] = (g[GODS[k].group] ?? 0) + w;
  const tot = Object.values(g).reduce((x, y) => x + y, 0) || 1;
  return Object.entries(g).map(([k, w]) => [k, w / tot] as [string, number]).sort((x, y) => y[1] - x[1]);
};

// Сочетания богов (KB 05 §4, KB 06): срабатывают только при наличии обоих участников — отсюда разница между картами.
type Combo = { sphere: string; title: string; text: string; quote: string; src: string };
const SHENG = ['木賴水生，水多木漂', '火賴木生，木多火熾', '土賴火生，火多土焦', '金賴土生，土多金埋', '水賴金生，金多水濁'];
export function combos(c: Chart, a: Analysis): Combo[] {
  const w = (k: string) => a.gods[k] ?? 0, has = (k: string) => w(k) >= 0.8;
  const shown = (k: string) => c.pillars.some((p) => p.pos !== 'day' && godOf(a.dm, p.stem).key === k);
  const k = a.brain.power.key, r = rel(a), res = has('ZY') || has('PY'), wealth = has('ZC') || has('PC');
  const month = P(c, 'month')!, out: Combo[] = [];
  if (has('QS') && (has('SS') || has('SG')) && k !== 'weak') out.push({ sphere: 'career', title: 'Давление под контролем (食神制杀)', text: 'В карте есть и «Давление», и талант, который его обуздывает: жёсткие задачи, конкуренция, кризисы — ваша среда, мастерство превращает нажим в результат.', quote: '七煞喜食神以制伏', src: 'ЦПЦЦ гл.8 (KB 05 §4.4)' });
  else if (has('QS') && k === 'weak' && !res) out.push({ sphere: 'career', title: 'Давления больше, чем сил', text: '«Давление» в карте тяжелее господина дня, а смягчить его нечем: постоянный прессинг вам вреден — выбирайте среду, где спрос за результат, а не за выносливость.', quote: '煞重身輕終身有損', src: 'СМ т.11 (KB 05 §4.4)' });
  if (has('QS') && res) out.push({ sphere: 'career', title: 'Давление через знание (杀印相生)', text: 'Рядом с «Давлением» стоит Печать: нажим переплавляется в опыт, наставника, квалификацию. Вы растёте через трудные экзамены и строгих учителей.', quote: '衆煞混行一仁可化', src: 'СМ т.11, 六神篇 (KB 05 §4.9)' });
  if (has('ZG') && has('ZY')) out.push({ sphere: 'career', title: 'Статус и образование заодно (官印相生)', text: 'Чиновник и Печать питают друг друга: дипломы, документы и репутация работают на должность — лестница в системе для вас рабочая.', quote: '官印雙全', src: 'ЦПЦЦ гл.9 (KB 05 §4.5)' });
  if (shown('SG') && shown('ZG')) {
    const metalWinter = a.dmEl === 3 && [11, 0, 1].includes(month.branch);
    out.push(metalWinter
      ? { sphere: 'career', title: 'Бунтарь рядом с начальником — на пользу', text: 'Обычно «Ранящий» и «Чиновник» в стволах — конфликт с правилами, но у Металла, рождённого зимой, Чиновник-Огонь греет: острый ум и критика ценятся системой.', quote: '金水見之，反爲秀氣', src: 'ЦПЦЦ гл.14 (KB 05 §4.1)' }
      : { sphere: 'career', title: 'Бунтарь против начальника (伤官见官)', text: '«Ранящий» и «Чиновник» оба на виду: вы видите, где правила глупы, и говорите это вслух. Лучше своя зона ответственности или роль эксперта, чем прямое подчинение.', quote: '伤官见官，为祸百端', src: 'ЮХ, 论十神 (KB 05 §4.1)' });
  }
  if (has('SG') && res && !(shown('SG') && shown('ZG'))) out.push({ sphere: 'career', title: 'Яркость с опорой на знание', text: '«Ранящий» уравновешен Печатью: смелость мысли держится на глубоком знании — экспертиза, преподавание, авторская работа.', quote: '傷官佩印', src: 'ЦПЦЦ, 傷官格 (KB 06)' });
  if (has('ZG') && has('QS') && shown('ZG') && shown('QS')) out.push({ sphere: 'career', title: 'Два стиля власти сразу (官煞混雜)', text: 'В стволах и «Статус», и «Давление»: вас тянет то к правилам, то к прорыву. Сильнее там, где выбрана одна линия.', quote: '取清則貴', src: 'ЦПЦЦ, 七煞格 (KB 05 §4.7)' });
  if (has('SS') && wealth) out.push({ sphere: 'money', title: 'Талант кормит (食神生财)', text: 'Бог еды питает Богатство: спокойное мастерство, продукт и сервис ровно превращаются в доход — без рывков, зато надолго.', quote: '食神生財', src: 'ЮХ (KB 06)' });
  else if (has('SG') && wealth) out.push({ sphere: 'money', title: 'Идея в деньги (伤官生财)', text: '«Ранящий» питает Богатство: деньги приносит смелая идея, своё дело, продажа себя — доход неровный, но крупнее среднего.', quote: '傷官生財', src: 'ЦПЦЦ, 傷官格 (KB 06)' });
  if (wealth && !has('ZG') && !has('QS')) out.push({ sphere: 'money', title: 'Деньги без статуса (孤財不貴)', text: 'Богатство в карте есть, а Власти, что его оформляет, нет: доход получается, но должность и признание надо строить отдельно.', quote: '孤財不貴', src: 'ЦПЦЦ, 財格 (KB 05 §4.9)' });
  if (has('PY') && has('SS') && !wealth) out.push({ sphere: 'character', title: 'Начать легко, закончить трудно (枭神夺食)', text: '«Интуиция» спорит с «Богом еды»: много начинаний и интересов, меньше доведённого до конца. Помогают сроки, заказчик и деньги как мерило.', quote: '好学艺而多学少成', src: 'ЮХ, 相心賦 (KB 05 §5)' });
  if (a.pct[r.res] >= 0.35) out.push({ sphere: 'character', title: 'Опеки больше, чем нужно', text: `Печати (${EL[r.res].toLowerCase()}, ${pc(a.pct[r.res])}) столько, что поддержка начинает душить: много советов и страховки, мало своего хода. Нужен выход — действие и результат.`, quote: SHENG[a.dmEl], src: 'ЮХ, 论五行生剋制化 (KB 05 §4.9)' });
  const zc = w('ZC'), pcw = w('PC');
  if (zc + pcw >= 0.8) out.push({ sphere: 'money', title: zc >= pcw ? 'Ваш тип денег — заработок' : 'Ваш тип денег — сделки', text: zc >= pcw ? 'Сильнее «Прямое богатство»: ваше — постоянный доход, накопление, понятная цена труда. Рискованные схемы дают меньше, чем кажется.' : 'Сильнее «Косвенное богатство»: ваше — проекты, сделки, оборот. Доход идёт волнами — держите резерв на тихие месяцы.', quote: '財喜根深，不宜太露', src: 'ЦПЦЦ гл.8' });
  const [s1, s2] = c.input.male ? ['ZC', 'PC'] : ['ZG', 'QS'];
  if (w(s1) + w(s2) >= 0.8) {
    const t = w(s1) >= w(s2) ? s1 : s2;
    const TYPE: Record<string, string> = { ZC: 'надёжный, хозяйственный человек, с которым строится быт', PC: 'яркий, щедрый, подвижный человек — с ним интересно, но нужен общий план', ZG: 'надёжный, правильный, с репутацией — опора и порядок', QS: 'сильный, решительный, ведущий — рядом с ним растёшь, но важно не потерять себя' };
    out.push({ sphere: 'love', title: 'Ваш тип партнёра', text: `Сильнее «${GODS[t].ru}» — тянет к типу «${TYPE[t]}».`, quote: c.input.male ? '用神即是财神，妻美而且富贵' : '女命之夫星，即是用神', src: c.input.male ? 'ЦЛ (KB 12 §4)' : 'ДТС (KB 14 §2)' });
  }
  return out;
}

function character(c: Chart, a: Analysis): Sphere {
  const t = DM_TEXT[a.dm], k = a.brain.power.key;
  const top = groupOf(a)[0];
  const godTop = Object.entries(a.gods).sort((x, y) => y[1] - x[1])[0][0];
  const month = P(c, 'month')!, winter = [11, 0, 1].includes(month.branch), summer = [5, 6, 7].includes(month.branch);
  const cold = winter && a.pct[1] < 0.08, hot = summer && a.pct[4] < 0.08;
  const points = [
    `Сильные стороны: ${t.gift}.`,
    `Тень, за которой стоит следить: ${t.shadow}.`,
    k === 'weak' ? 'Сил у господина дня немного: в новом месте вы сначала присматриваетесь и раскрываетесь, когда чувствуете поддержку.'
      : k === 'strong' ? 'Сил у господина дня много: вы уверены в себе и держитесь своего — сила, которой нужен выход, иначе она становится упрямством.'
        : 'Сила в равновесии: вы гибко подстраиваетесь — характер раскрывается по обстоятельствам и периодам жизни.',
    `Ярче всего в карте — «${GODS[godTop].ru}»: ${GODS[godTop].sense}.`,
  ];
  const fs = faces(c, a);
  if (fs.length) points.push(`Как вас видят: ${fs.map((f) => `${POS_FACE[f.pos]} — «${f.g.ru}» (${f.g.sense.split(',')[0]})`).join('; ')}.`);
  const inner = godOf(a.dm, BRANCHES[P(c, 'day')!.branch].hidden[0]);
  points.push(`Наедине и дома (ветвь дня) — «${inner.ru}»: ${inner.sense}.`);
  if (cold) points.push('Карта рождена в холод почти без Огня: внутри бывает зябко и одиноко — нужны тепло, люди, движение.');
  if (hot) points.push('Карта рождена в жару почти без Воды: много напора, мало остывания — нужны паузы и тишина.');
  return {
    key: 'character', title: 'Характер',
    lead: `${t.core} ${STEMS[a.dm].ru} — это «${STEMS[a.dm].image}»: так описывают ваш способ быть. Главная группа сил в карте — «${top[0].toLowerCase()}» (${pc(top[1])}).`,
    points, todo: t.way,
    notes: [
      { title: 'Сила и нрав', quote: '日干弱，则退缩怕羞；日干强，则妄诞，执一自傲', src: 'ЮХ (KB 13 §1)', text: 'Слабый господин дня — сдержанность, сильный — уверенность до упрямства.' },
      { title: 'Общий вид важнее одной стихии', quote: '五气不戾，性情中和；浊乱偏枯，性情乖逆', src: 'ДТС, 性情', text: 'Чем ровнее стихии, тем ровнее нрав; перекос карты — перекос характера.' },
    ],
  };
}

function career(c: Chart, a: Analysis, now: number): Sphere {
  const r = rel(a), groups = groupOf(a), y = a.brain.yong;
  const yGroup = GROUP_BY_REL[(y - a.dmEl + 5) % 5];
  const outStrong = a.pct[r.out] >= 0.2, offRole = role(a, r.officer);
  const points = [
    `Ваша главная полезная стихия — ${EL[y]} (для вас это «${yGroup.toLowerCase()}»): ${EL_NEED[y]}`,
    `Самая сильная группа в карте — «${groups[0][0].toLowerCase()}»: ${PROF[groups[0][0]]}.`,
    offRole === 'ji'
      ? 'Жёсткая иерархия и давление сверху для вас — нагрузка: лучше там, где оценивают результат, а не подчинение.'
      : good(offRole) ? 'Система и должность вам на пользу: дисциплина и ответственность поднимают, а не давят.'
        : 'Иерархия нейтральна: важнее, чем вы заняты, чем то, кто над вами.',
  ];
  const L = currentLuck(c, now);
  if (L) {
    const g = godOf(a.dm, L.idx % 10), v = periodVerdict(a.brain, L.idx, c);
    points.push(`Сейчас идёт такт ${span(L.year)}: его ствол — «${g.ru}», для дела это значит ${GOD_ACT[g.key]}. Фон такта — ${v.tone === 'good' ? 'попутный' : v.tone === 'bad' ? 'встречный: время укреплять базу' : 'смешанный'}.`);
  }
  const best = c.luck.filter((l) => l.year + 9 >= now && periodVerdict(a.brain, l.idx, c).tone === 'good').map((l) => span(l.year));
  if (best.length) points.push(`Самые попутные десятилетия для рывка: ${best.slice(0, 3).join(', ')}.`);
  if (outStrong) points.push(`Выражение (${EL[r.out]}) сильно — ${pc(a.pct[r.out])}: талант просится наружу, ему нужен продукт, сцена, ученики.`);
  return {
    key: 'career', title: 'Призвание и работа',
    lead: `Ваше дело — там, где много ${EL_GEN[y].toLowerCase()}, а сильнее всего в вас «${groups[0][0].toLowerCase()}» (${pc(groups[0][1])}): ${PROF[groups[0][0]].split(',').slice(0, 2).join(',')}.${outStrong ? ' Талант просится наружу.' : ''}`,
    how: 'Классика не называет профессию напрямую — она даёт стихию и роль богов; профессии ниже — сегодняшний перевод этих образов.',
    points,
    todo: `Ищите работу, где много ${EL_GEN[y].toLowerCase()}, и сверяйте решения с тактами: рывки — в периоды, когда приходит ${EL[y].toLowerCase()}.`,
    notes: [
      { title: 'Ищите, куда выходит сила', quote: '看格不拘月令，只看…归秀气在何处', src: 'ШФ, 伤官格 (KB 13 §2)', text: 'Талант — там, куда утекает самая сильная стихия.' },
      { title: 'Периоды весят наравне с картой', quote: '富贵人未必皆富贵命，或行运辅之以成也', src: 'ЦЛ, 应运 (KB 13 §2)', text: 'Успех делают и такты: смотрите блок «Такты удачи».' },
    ],
  };
}

function money(c: Chart, a: Analysis, now: number): Sphere {
  const r = rel(a), k = a.brain.power.key, w = a.pct[r.wealth], wr = role(a, r.wealth), pres = presence(c, r.wealth);
  const outW = a.pct[r.out];
  let lead: string, quote: string, src: string;
  if (w >= 0.3 && k === 'weak') {
    lead = `Денег и возможностей вокруг много (${EL[r.wealth]} ${pc(w)}), а сил их удержать меньше: «богатый дом, бедный хозяин». Деньги приходят через партнёров и команду, а не в одиночку.`;
    quote = '财多身弱，富屋贫人'; src = 'ЮХ; СМ т.5 (KB 13 §2)';
  } else if (k === 'strong' && good(wr)) {
    lead = `Вы сильны, и Богатство (${EL[r.wealth]}) для вас — ${ROLE_RU[wr]}: вы способны брать и удерживать деньги, когда действуете сами.`;
    quote = '身强财旺'; src = '继善篇 (KB 13 §2)';
  } else if (w < 0.06 && outW >= 0.2) {
    lead = 'Талант сильный, а Богатства в карте почти нет: умение есть, но само в деньги не превращается — нужен тот, кто продаёт, или период с Богатством.';
    quote = '伤官无财可恃，虽巧必贫'; src = 'ШФ, 元理赋 (KB 13 §2)';
  } else {
    lead = `Богатство (${EL[r.wealth]}, ${pc(w)}) для вас — ${ROLE_RU[wr]}. ${good(wr) ? 'Деньги — ваша опора: зарабатывать полезно и для силы, и для настроения.' : wr === 'ji' ? 'Погоня за деньгами отнимает силы: лучше доход от мастерства, чем ставка на быстрые сделки.' : 'Деньги идут ровно — они следуют за делом, а не наоборот.'}`;
    quote = '財喜根深，不宜太露'; src = 'ЦПЦЦ гл.8';
  }
  const points = [
    pres === 'shown' ? 'Богатство проступило в стволах — деньги на виду: доход заметен, его же легче потерять.'
      : pres === 'hidden' ? 'Богатство спрятано в ветвях — деньги копятся тихо: запасы, недвижимость, то, что не на виду.'
        : 'Своего Богатства в карте нет — деньги приносят такты и годы, где оно приходит.',
    outW >= 0.15 && w >= 0.1 ? 'Цепочка «талант → деньги» работает: продукт, услуга, ремесло прямо переходят в доход.' : '',
    a.gods.JC && a.gods.JC > 0.6 ? 'В карте заметен «Соперник»: траты, азарт, конкуренция за деньги — держите отдельный резерв.' : '',
    (() => {
      const ys: number[] = [];
      for (let y = now; y < now + 10; y++) { const i = yearIdx(y); if (STEMS[i % 10].el === r.wealth && periodVerdict(a.brain, i, c).tone !== 'bad') ys.push(y); }
      return ys.length ? `Денежные годы ближайшего десятилетия (Богатство приходит и не во вред): ${ys.join(', ')}.` : '';
    })(),
    (() => {
      const ds = c.luck.filter((l) => l.year + 9 >= now && (STEMS[l.idx % 10].el === r.wealth || BRANCHES[l.idx % 12].el === r.wealth)).map((l) => span(l.year));
      return ds.length ? `Десятилетия, когда Богатство приходит тактом: ${ds.slice(0, 3).join(', ')} — время для крупных денежных шагов (покупки, своё дело, рост дохода).` : '';
    })(),
    (() => {
      if (wr === 'yong') return '';
      const ys: number[] = [];
      for (let y = now; y < now + 10; y++) { const g = godOf(a.dm, yearIdx(y) % 10).key; if (g === 'JC') ys.push(y); }
      return ys.length && good(wr) ? `Годы «Соперника» (劫财 — отнимает Богатство): ${ys.join(', ')} — больше трат и конкурентов; крупные займы и общие кассы в эти годы не открывайте.` : '';
    })(),
    a.gods.PC && a.gods.PC >= 1 ? 'Косвенное богатство заметно: Шэнь Фэн по опыту считал его знаком достатка, но это мнение одного автора, а не правило.' : '',
  ].filter(Boolean);
  return {
    key: 'money', title: 'Деньги', lead, points,
    todo: good(wr) ? 'Ставьте денежные решения на периоды и дни с Богатством; сила — в том, чтобы удерживать, а не только брать.'
      : 'Зарабатывайте через то, что усиливает вас (главная полезная стихия), а не через погоню за объёмом.',
    notes: [{ title: 'Правило', quote, src, text: 'Деньги оцениваются по силе хозяина и роли Богатства, а не по их количеству.' }],
  };
}

function love(c: Chart, a: Analysis, now: number): Sphere {
  const r = rel(a), male = c.input.male;
  const star = male ? r.wealth : r.officer, sr = role(a, star), pres = presence(c, star);
  const day = P(c, 'day')!, db = BRANCHES[day.branch];
  const palaceEl = STEMS[db.hidden[0]].el, pr = role(a, palaceEl), pGod = godOf(a.dm, db.hidden[0]);
  const points: string[] = [];
  points.push(pres === 'shown' ? `Звезда партнёра (${EL[star]}) видна в стволах — отношения занимают заметное место в жизни.`
    : pres === 'hidden' ? `Звезда партнёра (${EL[star]}) спрятана в ветвях — чувства глубже, чем видно со стороны; человек приходит не сразу.`
      : `Звезды партнёра (${EL[star]}) в карте нет — встречи приносят такты и годы с ${EL_GEN[star].toLowerCase()}; это не «одиночество», а другой путь.`);
  points.push(`Для вас ${EL[star].toLowerCase()} — ${ROLE_RU[sr]}: ${good(sr) ? 'партнёр поддерживает и усиливает вас.' : sr === 'ji' ? 'в отношениях легко раствориться или перегрузиться — нужен баланс «я и мы».' : 'союз держится на выборе, а не на судьбе.'}`);
  points.push(`Дворец партнёра (ветвь дня, ${db.animal}) несёт «${pGod.ru}» — ${good(pr) ? 'опора: дома и в паре вам хорошо' : pr === 'ji' ? 'трение: дома нужно больше договорённостей' : 'ровный фон'}.`);
  if (pGod.key === 'BJ' || pGod.key === 'JC') points.push('На ветви дня — ваша же стихия: в паре соперничество за лидерство и общие деньги; помогает ясный раздел ролей.');
  if (!male && visibleEls(c).filter((e) => e === r.officer).length && c.pillars.some((p) => p.pos !== 'day' && godOf(a.dm, p.stem).key === 'QS')
    && c.pillars.some((p) => p.pos !== 'day' && godOf(a.dm, p.stem).key === 'ZG')) points.push('Две разные звезды партнёра сразу — выбор между разными типами людей; яснее, когда один тип выбран.');
  for (const p of c.pillars) if (p.pos !== 'day' && clash(p.branch, day.branch)) points.push(`Ветвь ${p.pos === 'month' ? 'месяца' : p.pos === 'year' ? 'года' : 'часа'} бьёт дворец партнёра — дом и пара проходят через перемены; важны договорённости.`);
  const meet: number[] = [], change: number[] = [];
  for (let y = now; y < now + 10; y++) {
    const i = yearIdx(y);
    if (STEMS[i % 10].el === star || sixCombo(i % 12, day.branch)) meet.push(y);
    if (clash(i % 12, day.branch)) change.push(y);
  }
  if (meet.length) points.push(`Годы встреч и сближения (звезда партнёра или союз с ветвью дня), для пары — годы укрепления союза: ${meet.join(', ')}.`);
  if (change.length) points.push(`Годы перемен в доме и паре (удар по ветви дня): ${change.join(', ')} — не разрыв, а перестройка.`);
  return {
    key: 'love', title: 'Любовь и партнёрство',
    lead: `Ваша звезда партнёра — ${EL[star]}, ${pres === 'shown' ? 'на виду' : pres === 'hidden' ? 'спрятана' : 'приходит извне'}, и для вас она ${ROLE_RU[sr]}; дворец партнёра — ${db.animal}, ${good(pr) ? 'опора' : pr === 'ji' ? 'с трением' : 'ровный'}.${meet.length ? ` Ближайший год сближения — ${meet[0]}.` : ''}`,
    how: `Партнёра показывают звезда (${male ? 'для мужчины — Богатство' : 'для женщины — Чиновник'}) и дворец — ветвь дня. Женская карта читается так же, как мужская.`,
    points,
    todo: good(sr) ? 'Ищите партнёра, рядом с которым вас становится больше: это и есть ваша звезда.' : 'В паре держите собственную опору: свои дела, свои деньги, своё время.',
    notes: [
      male ? { title: 'Роль важнее наличия', quote: '用神即是财神，妻美而且富贵', src: 'ЦЛ (KB 12 §4)', text: 'Когда звезда партнёра — ваш полезный бог, союз усиливает обоих; смотрим роль звезды, а не только её наличие.' }
        : { title: 'Роль важнее наличия', quote: '女命之夫星，即是用神', src: 'ДТС (KB 14 §2)', text: 'Партнёр — та стихия, что вам полезна; смотрим роль звезды, а не только её наличие.' },
      { title: 'Женская карта — как мужская', quote: '女命生克之理，与男命同', src: 'МЛЮЯ, 女命赋 (KB 14 §1)', text: 'Старые оценки «правильной жены» не используем.' },
    ],
  };
}

function health(c: Chart, a: Analysis, now: number): Sphere {
  const zones: { e: El; att: El }[] = [];
  for (let e = 0 as El; e < 5; e = (e + 1) as El) {
    const att = ((e + 3) % 5) as El;
    if (a.pct[att] - a.pct[e] >= 0.15 && a.pct[e] < 0.15 && a.pct[((e + 4) % 5) as El] < 0.15) zones.push({ e, att });
  }
  const month = P(c, 'month')!, winter = [11, 0, 1].includes(month.branch), summer = [5, 6, 7].includes(month.branch);
  const points = zones.map(({ e, att }) => `${EL[att]} давит ${EL[e].toLowerCase()} (${pc(a.pct[att])} против ${pc(a.pct[e])}) — зона внимания: ${ORGANS[e]}.`);
  if (winter && a.pct[1] < 0.08) points.push('Холодная карта без Огня: берегите тепло — переохлаждение, кровообращение, сезонные простуды.');
  if (summer && a.pct[4] < 0.08) points.push('Жаркая карта без Воды: берегите влагу — сон, жидкость, перегрев, нервное истощение.');
  const max = a.pct.indexOf(Math.max(...a.pct)) as El;
  if (a.pct[max] >= 0.45) points.push(`${EL[max]} в избытке (${pc(a.pct[max])}): перекос сам по себе — зона внимания (${ORGANS[max]}).`);
  if (zones.length) points.push(`Особенно берегите себя ${SEASON[zones[0].att]}: в этот сезон давящая стихия (${EL[zones[0].att].toLowerCase()}) в силе.`);
  const DM_ORGAN = ['желчный пузырь', 'печень', 'тонкий кишечник', 'сердце', 'желудок', 'селезёнка', 'толстый кишечник', 'лёгкие', 'мочевой пузырь', 'почки'];
  points.push(`Ваш ствол дня — ${STEMS[a.dm].ru}; по «Дао тянь суй» ему соответствует ${DM_ORGAN[a.dm]} — это первое место, которое отзывается на перегрузки.`);
  const ji = a.brain.ji[0];
  if (ji !== undefined) {
    const inStems = visibleEls(c).includes(ji), inBranches = hiddenEls(c).includes(ji);
    if (inBranches && !inStems) points.push(`Стихия-нагрузка (${EL[ji].toLowerCase()}) спрятана в ветвях — действует исподволь и долго: регулярная профилактика важнее разовых мер.`);
    else if (inStems && !inBranches) points.push(`Стихия-нагрузка (${EL[ji].toLowerCase()}) только в стволах, без корня — её влияние поверхностное и проходит быстро.`);
  }
  const care: number[] = [];
  for (let y = now; y < now + 10; y++) { const i = yearIdx(y); if (periodVerdict(a.brain, i, c).tone === 'bad' && STEMS[i % 10].el !== a.brain.yong) care.push(y); }
  if (care.length) points.push(`Годы бережного режима (приходит нагрузка, полезная стихия под давлением): ${care.join(', ')} — сон, нагрузки по силам, плановые обследования.`);
  if (!points.length) points.push('Резких перекосов стихий нет — карта по здоровью ровная.');
  return {
    key: 'health', title: 'Здоровье',
    lead: zones.length ? `Тонкое место карты — ${EL[zones[0].e].toLowerCase()} под давлением ${EL_GEN[zones[0].att].toLowerCase()}: ${ORGANS[zones[0].e]}.${zones.length > 1 ? ` Второе — ${EL[zones[1].e].toLowerCase()}.` : ''}`
      : `Стихии без резкого давления одна на другую${a.pct[max] >= 0.45 ? `, но ${EL[max].toLowerCase()} в избытке (${pc(a.pct[max])})` : ''} — карта по здоровью скорее ровная.`,
    how: 'Классика смотрит на здоровье как на равновесие стихий: где одна давит другую без защиты, там тонкое место. Это традиционное соответствие, а не медицинский совет.',
    points,
    todo: zones.length ? `Профилактика по зонам выше и регулярные обследования; всё, что усиливает ${EL[a.brain.yong].toLowerCase()} (ваша полезная стихия), выравнивает карту. С жалобами — к врачу.`
      : 'Держите режим, который поддерживает вашу полезную стихию; с жалобами — к врачу, не к карте.',
    notes: [
      { title: 'Болезнь — от разлада стихий', quote: '疾病皆因五行不和', src: 'СМ (KB 13 §3)', text: 'Смотрим, какая стихия бита и не защищена.' },
      { title: 'Глубина нагрузки', quote: '忌神入五脏而病凶', src: 'ДТС (KB 13 §3)', text: 'Вредная стихия в ветвях действует глубже, чем на виду в стволах.' },
      { title: 'Полезный бог держит здоровье', quote: '用不受傷人不滅', src: 'СМ т.12, 骨髓歌 (KB 05 §4.9)', text: 'Годы, когда полезная стихия под давлением, — время беречь режим.' },
      ...zones.slice(0, 2).map(({ e }) => ({ title: `${EL[e]} под ударом`, quote: HIT_QUOTE[e], src: '管见 探玄篇; ЮХ 论疾病 (KB 13 §3)', text: `Традиционное соответствие: ${ORGANS[e]}.` })),
    ],
  };
}

function family(c: Chart, a: Analysis): Sphere {
  const r = rel(a), month = P(c, 'month')!, hour = P(c, 'hour');
  const resR = role(a, r.res), outR = role(a, r.out), selfR = role(a, r.self);
  const mEl = STEMS[BRANCHES[month.branch].hidden[0]].el, mR = role(a, mEl);
  const points = [
    `Родители (Печать, ${EL[r.res]}) — ${good(resR) ? 'опора: их поддержка и знания вам на пользу' : resR === 'ji' ? 'с ними легко оказаться в опеке, которая тяготит — помогает дистанция' : 'ровные отношения'}. Дворец родителей (месяц) — ${good(mR) ? 'полезный: среда детства дала силы' : mR === 'ji' ? 'тяжёлый: детство было школой, а не опорой' : 'нейтральный'}.`,
    `Братья, сёстры, друзья (${EL[r.self]}) — ${good(selfR) ? 'реальная помощь: на равных вы сильнее' : selfR === 'ji' ? 'соперничество за внимание и ресурсы; держите границы в общих делах' : 'ровные связи'}.`,
    `Дети (Бог еды и Ранящий, ${EL[r.out]}) — ${good(outR) ? 'радость и продолжение: вкладываться в них вам полезно' : outR === 'ji' ? 'много сил уходит на заботу — важно не забывать о себе' : 'ровная тема'}${hour ? `; дворец детей (час) — ${good(role(a, STEMS[BRANCHES[hour.branch].hidden[0]].el)) ? 'полезный' : 'с нагрузкой'}` : ''}.`,
  ];
  return {
    key: 'family', title: 'Родные',
    lead: (() => { const R = [['родители', resR], ['братья и друзья', selfR], ['дети', outR]] as [string, Role][]; const up = R.filter(([, x]) => good(x)).map(([n]) => n), down = R.filter(([, x]) => x === 'ji').map(([n]) => n); return `${up.length ? `Опора — ${up.join(' и ')}.` : 'Опоры в родне карта не выделяет — вы строите её сами.'}${down.length ? ` Труднее с темой «${down.join(', ')}»: там нужна дистанция и ясные границы.` : ''}`; })(),
    how: 'Родных показывают боги (кем человек приходится вам) и дворцы столпов (год — род, месяц — родители, день — партнёр, час — дети). Чем ближе человек, тем точнее карта.',
    points,
    todo: 'Опирайтесь на тех, чья стихия вам полезна, и держите дистанцию там, где стихия — нагрузка. Карта показывает отношения, а не судьбу родственника.',
    notes: [
      { title: 'Чем ближе, тем точнее', quote: '於人愈近，其验益灵', src: 'ЦПЦЦ гл.23 (KB 12 §3)', text: 'Про родителей и детей карта говорит увереннее, чем про дальнюю родню.' },
      { title: 'Роль, а не звезда', quote: '从印之喜忌看父母，非必以印为母', src: 'ЦПЦЦ-Х гл.23 (KB 12 §1)', text: 'Смотрим, полезна ли стихия родственника, а не только есть ли она.' },
    ],
  };
}

export function spheres(c: Chart, a: Analysis, now = new Date().getFullYear()): Sphere[] {
  const cs = combos(c, a);
  return [character(c, a), career(c, a, now), money(c, a, now), love(c, a, now), health(c, a, now), family(c, a)].map((x) => {
    const mine = cs.filter((k) => k.sphere === x.key);
    return mine.length ? { ...x, points: [...mine.map((k) => `${k.title}. ${k.text}`), ...x.points], notes: [...x.notes, ...mine.filter((k) => !x.notes.some((n) => n.quote === k.quote)).map((k) => ({ title: k.title, quote: k.quote, src: k.src, text: k.text }))] } : x;
  });
}
