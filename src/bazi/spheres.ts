// Сферы жизни простым языком: характер, дело, деньги, любовь, здоровье, родные (KB 12–14 в ~/projects/бацзы).
// Каждый вывод — из фактов карты (полезный бог мозга, сила, боги, дворцы) + правило корпуса; цитаты — дословно из KB.
// Нельзя: число детей, «克», болезни и сроки, патриархальная женская карта (KB 12 §5, 13 §3, 14 §1).
import { STEMS, BRANCHES, EL, EL_GEN, GODS, godOf, type El } from './core';
import type { Analysis, Chart, Pillar } from './calc';
import { yearIdx } from './calc';
import { DM_TEXT, EL_NEED } from './interp';
import type { Note } from './reading';

export interface Sphere { key: string; title: string; lead: string; points: string[]; todo: string; notes: Note[] }

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
  if (cold) points.push('Карта рождена в холод почти без Огня: внутри бывает зябко и одиноко — нужны тепло, люди, движение.');
  if (hot) points.push('Карта рождена в жару почти без Воды: много напора, мало остывания — нужны паузы и тишина.');
  return {
    key: 'character', title: 'Характер',
    lead: `${t.core} ${STEMS[a.dm].ru} — это «${STEMS[a.dm].image}»: так классика описывает ваш способ быть. Главная группа сил в карте — «${top[0].toLowerCase()}» (${pc(top[1])}).`,
    points, todo: t.way,
    notes: [
      { title: 'Сила и нрав', quote: '日干弱，则退缩怕羞；日干强，则妄诞，执一自傲', src: 'ЮХ (KB 13 §1)', text: 'Слабый господин дня — сдержанность, сильный — уверенность до упрямства.' },
      { title: 'Общий вид важнее одной стихии', quote: '五气不戾，性情中和；浊乱偏枯，性情乖逆', src: 'ДТС, 性情', text: 'Чем ровнее стихии, тем ровнее нрав; перекос карты — перекос характера.' },
    ],
  };
}

function career(a: Analysis): Sphere {
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
  if (outStrong) points.push(`Выражение (${EL[r.out]}) сильно — ${pc(a.pct[r.out])}: талант просится наружу, ему нужен продукт, сцена, ученики.`);
  return {
    key: 'career', title: 'Призвание и работа',
    lead: `Дело, в котором вам легче всего, — то, что приносит в жизнь ${EL[y].toLowerCase()}. Классика не называет профессию напрямую — она даёт стихию и роль; ниже — куда это ведёт сегодня.`,
    points,
    todo: `Ищите работу, где много ${EL_GEN[y].toLowerCase()}, и сверяйте решения с тактами: рывки — в периоды, когда приходит ${EL[y].toLowerCase()}.`,
    notes: [
      { title: 'Ищите, куда выходит сила', quote: '看格不拘月令，只看…归秀气在何处', src: 'ШФ, 伤官格 (KB 13 §2)', text: 'Талант — там, куда утекает самая сильная стихия.' },
      { title: 'Периоды весят наравне с картой', quote: '富贵人未必皆富贵命，或行运辅之以成也', src: 'ЦЛ, 应运 (KB 13 §2)', text: 'Успех делают и такты: смотрите блок «Такты удачи».' },
    ],
  };
}

function money(c: Chart, a: Analysis): Sphere {
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
    lead: `Партнёра в карте показывают звезда (${male ? 'для мужчины — Богатство' : 'для женщины — Чиновник'}, у вас это ${EL[star]}) и дворец — ветвь дня. Женская карта читается так же, как мужская.`,
    points,
    todo: good(sr) ? 'Ищите партнёра, рядом с которым вас становится больше: это и есть ваша звезда.' : 'В паре держите собственную опору: свои дела, свои деньги, своё время.',
    notes: [
      male ? { title: 'Роль важнее наличия', quote: '用神即是财神，妻美而且富贵', src: 'ЦЛ (KB 12 §4)', text: 'Когда звезда партнёра — ваш полезный бог, союз усиливает обоих; смотрим роль звезды, а не только её наличие.' }
        : { title: 'Роль важнее наличия', quote: '女命之夫星，即是用神', src: 'ДТС (KB 14 §2)', text: 'Партнёр — та стихия, что вам полезна; смотрим роль звезды, а не только её наличие.' },
      { title: 'Женская карта — как мужская', quote: '女命生克之理，与男命同', src: 'МЛЮЯ, 女命赋 (KB 14 §1)', text: 'Старые оценки «правильной жены» не используем.' },
    ],
  };
}

function health(c: Chart, a: Analysis): Sphere {
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
  if (!points.length) points.push('Резких перекосов стихий нет — классика называет такую карту ровной: «五行和者，一世无灾».');
  return {
    key: 'health', title: 'Здоровье',
    lead: 'Классика смотрит на здоровье как на равновесие стихий: где одна давит другую без защиты, там тонкое место. Это традиционное соответствие, а не медицинский совет.',
    points,
    todo: zones.length ? `Профилактика по зонам выше и регулярные обследования; всё, что усиливает ${EL[a.brain.yong].toLowerCase()} (ваша полезная стихия), выравнивает карту. С жалобами — к врачу.`
      : 'Держите режим, который поддерживает вашу полезную стихию; с жалобами — к врачу, не к карте.',
    notes: [
      { title: 'Болезнь — от разлада стихий', quote: '疾病皆因五行不和', src: 'СМ (KB 13 §3)', text: 'Смотрим, какая стихия бита и не защищена.' },
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
    lead: 'Родных показывают боги (кем человек приходится вам) и дворцы столпов (год — род, месяц — родители, день — партнёр, час — дети). Чем ближе человек, тем точнее карта.',
    points,
    todo: 'Опирайтесь на тех, чья стихия вам полезна, и держите дистанцию там, где стихия — нагрузка. Карта показывает отношения, а не судьбу родственника.',
    notes: [
      { title: 'Чем ближе, тем точнее', quote: '於人愈近，其验益灵', src: 'ЦПЦЦ гл.23 (KB 12 §3)', text: 'Про родителей и детей карта говорит увереннее, чем про дальнюю родню.' },
      { title: 'Роль, а не звезда', quote: '从印之喜忌看父母，非必以印为母', src: 'ЦПЦЦ-Х гл.23 (KB 12 §1)', text: 'Смотрим, полезна ли стихия родственника, а не только есть ли она.' },
    ],
  };
}

export function spheres(c: Chart, a: Analysis, now = new Date().getFullYear()): Sphere[] {
  return [character(c, a), career(a), money(c, a), love(c, a, now), health(c, a), family(c, a)];
}
