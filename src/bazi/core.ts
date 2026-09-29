// Бацзы: справочные таблицы. Всё здесь — традиция (классика «Юань хай цзы пин», «Сань мин тун хуэй»),
// кроме календаря, который считается астрономически в calc.ts.

export type El = 0 | 1 | 2 | 3 | 4; // Дерево, Огонь, Земля, Металл, Вода
export const EL = ['Дерево', 'Огонь', 'Земля', 'Металл', 'Вода'] as const;
export const EL_GEN = ['Дерева', 'Огня', 'Земли', 'Металла', 'Воды'] as const;
export const EL_ZH = ['木', '火', '土', '金', '水'] as const;
export const EL_COLOR = ['#5fc98a', '#ef5a3c', '#d6a64f', '#dfe4ec', '#4f8ef0'] as const;
export const EL_RGB = ['95,201,138', '239,90,60', '214,166,79', '223,228,236', '79,142,240'] as const;
export const gen = (e: number): El => ((e + 1) % 5) as El;  // e порождает
export const ctl = (e: number): El => ((e + 2) % 5) as El;  // e подавляет

export interface Stem { zh: string; ru: string; el: El; yang: boolean; image: string }
export const STEMS: Stem[] = [
  { zh: '甲', ru: 'Цзя', el: 0, yang: true, image: 'могучее дерево' },
  { zh: '乙', ru: 'И', el: 0, yang: false, image: 'лиана, цветок' },
  { zh: '丙', ru: 'Бин', el: 1, yang: true, image: 'солнце' },
  { zh: '丁', ru: 'Дин', el: 1, yang: false, image: 'свеча, звезда' },
  { zh: '戊', ru: 'У', el: 2, yang: true, image: 'гора' },
  { zh: '己', ru: 'Цзи', el: 2, yang: false, image: 'плодородное поле' },
  { zh: '庚', ru: 'Гэн', el: 3, yang: true, image: 'слиток, руда' },
  { zh: '辛', ru: 'Синь', el: 3, yang: false, image: 'драгоценность' },
  { zh: '壬', ru: 'Жэнь', el: 4, yang: true, image: 'океан, большая река' },
  { zh: '癸', ru: 'Гуй', el: 4, yang: false, image: 'дождь, роса' },
];

export interface Branch { zh: string; ru: string; animal: string; el: El; yang: boolean; hidden: number[]; hours: string }
export const BRANCHES: Branch[] = [
  { zh: '子', ru: 'Цзы', animal: 'Крыса', el: 4, yang: true, hidden: [9], hours: '23–01' },
  { zh: '丑', ru: 'Чоу', animal: 'Бык', el: 2, yang: false, hidden: [5, 9, 7], hours: '01–03' },
  { zh: '寅', ru: 'Инь', animal: 'Тигр', el: 0, yang: true, hidden: [0, 2, 4], hours: '03–05' },
  { zh: '卯', ru: 'Мао', animal: 'Кролик', el: 0, yang: false, hidden: [1], hours: '05–07' },
  { zh: '辰', ru: 'Чэнь', animal: 'Дракон', el: 2, yang: true, hidden: [4, 1, 9], hours: '07–09' },
  { zh: '巳', ru: 'Сы', animal: 'Змея', el: 1, yang: false, hidden: [2, 6, 4], hours: '09–11' },
  { zh: '午', ru: 'У', animal: 'Лошадь', el: 1, yang: true, hidden: [3, 5], hours: '11–13' },
  { zh: '未', ru: 'Вэй', animal: 'Коза', el: 2, yang: false, hidden: [5, 3, 1], hours: '13–15' },
  { zh: '申', ru: 'Шэнь', animal: 'Обезьяна', el: 3, yang: true, hidden: [6, 8, 4], hours: '15–17' },
  { zh: '酉', ru: 'Ю', animal: 'Петух', el: 3, yang: false, hidden: [7], hours: '17–19' },
  { zh: '戌', ru: 'Сюй', animal: 'Собака', el: 2, yang: true, hidden: [4, 7, 3], hours: '19–21' },
  { zh: '亥', ru: 'Хай', animal: 'Свинья', el: 4, yang: false, hidden: [8, 0], hours: '21–23' },
];
// Доли скрытых стволов: главный / средний / остаточный.
export const HIDDEN_W: Record<number, number[]> = { 1: [1], 2: [0.7, 0.3], 3: [0.6, 0.3, 0.1] };
export const hiddenOf = (b: number): { stem: number; w: number }[] =>
  BRANCHES[b].hidden.map((stem, i, a) => ({ stem, w: HIDDEN_W[a.length][i] }));

export const pillarName = (i: number): string => STEMS[i % 10].zh + BRANCHES[i % 12].zh;
export const pillarRu = (i: number): string => `${STEMS[i % 10].ru}-${BRANCHES[i % 12].ru}`;
export const cyc = (s: number, b: number): number => { for (let i = 0; i < 60; i++) if (i % 10 === s && i % 12 === b) return i; return -1; };

// 10 божеств: отношение ствола s к Господину дня dm.
export interface God { key: string; zh: string; ru: string; short: string; group: string; sense: string }
export const GODS: Record<string, God> = {
  BJ: { key: 'BJ', zh: '比肩', ru: 'Друг', short: 'Друг', group: 'Опора', sense: 'равные, братья, партнёры, упорство и самостоятельность' },
  JC: { key: 'JC', zh: '劫财', ru: 'Грабитель богатства', short: 'Соперник', group: 'Опора', sense: 'соперники, азарт, смелость, риск потерять деньги ради цели' },
  SS: { key: 'SS', zh: '食神', ru: 'Бог еды', short: 'Бог еды', group: 'Выражение', sense: 'талант, вкус к жизни, мягкое творчество, ученики' },
  SG: { key: 'SG', zh: '伤官', ru: 'Ранящий чиновника', short: 'Бунтарь', group: 'Выражение', sense: 'яркость, критика правил, речь, изобретательность, конфликт с начальством' },
  PC: { key: 'PC', zh: '偏财', ru: 'Косвенное богатство', short: 'Удача в деньгах', group: 'Богатство', sense: 'сделки, предпринимательство, щедрость, отец' },
  ZC: { key: 'ZC', zh: '正财', ru: 'Прямое богатство', short: 'Заработок', group: 'Богатство', sense: 'стабильный доход, бережливость, для мужчины — жена' },
  QS: { key: 'QS', zh: '七杀', ru: 'Семь убийств', short: 'Давление', group: 'Власть', sense: 'жёсткое давление, вызов, военная воля, смелость лидера' },
  ZG: { key: 'ZG', zh: '正官', ru: 'Прямой чиновник', short: 'Статус', group: 'Власть', sense: 'порядок, репутация, должность, для женщины — муж' },
  PY: { key: 'PY', zh: '偏印', ru: 'Косвенный ресурс', short: 'Интуиция', group: 'Ресурс', sense: 'нестандартное знание, мистика, одиночество, изобретение' },
  ZY: { key: 'ZY', zh: '正印', ru: 'Прямой ресурс', short: 'Покровитель', group: 'Ресурс', sense: 'учёба, мать, покровительство, документы, забота' },
};
export function godOf(dm: number, s: number): God {
  const d = STEMS[dm], o = STEMS[s];
  const rel = (o.el - d.el + 5) % 5, same = d.yang === o.yang;
  return GODS[[same ? 'BJ' : 'JC', same ? 'SS' : 'SG', same ? 'PC' : 'ZC', same ? 'QS' : 'ZG', same ? 'PY' : 'ZY'][rel]];
}

// 12 стадий ци (长生十二宫).
export const STAGES = ['Рождение', 'Омовение', 'Юность', 'Служба', 'Расцвет', 'Упадок', 'Болезнь', 'Смерть', 'Могила', 'Исчезновение', 'Зачатие', 'Вынашивание'];
export const STAGES_ZH = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
const BIRTH = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];
export function stageOf(stem: number, b: number): number {
  return STEMS[stem].yang ? (b - BIRTH[stem] + 12) % 12 : (BIRTH[stem] - b + 12) % 12;
}

// На Инь — «звучание» пары, 30 образов.
export const NAYIN: [string, El][] = [
  ['Металл в море', 3], ['Огонь в печи', 1], ['Дерево большого леса', 0], ['Земля у дороги', 2], ['Металл острия меча', 3],
  ['Огонь на вершине горы', 1], ['Вода горного ручья', 4], ['Земля городской стены', 2], ['Металл белого воска', 3], ['Дерево ивы', 0],
  ['Вода источника', 4], ['Земля на крыше', 2], ['Огонь молнии', 1], ['Дерево сосны и кипариса', 0], ['Вода долгой реки', 4],
  ['Металл в песке', 3], ['Огонь под горой', 1], ['Дерево равнины', 0], ['Земля на стене', 2], ['Металл золотой фольги', 3],
  ['Огонь лампады', 1], ['Вода Небесной реки', 4], ['Земля большой дороги', 2], ['Металл шпилек и браслетов', 3], ['Дерево шелковицы', 0],
  ['Вода большого потока', 4], ['Земля в песке', 2], ['Огонь в небесах', 1], ['Дерево граната', 0], ['Вода большого моря', 4],
];
export const nayinOf = (i: number) => NAYIN[Math.floor(i / 2)];

// Пустота (空亡) декады дня.
export function voidOf(dayIdx: number): number[] {
  const b0 = (dayIdx - (dayIdx % 10)) % 12;
  return [(b0 + 10) % 12, (b0 + 11) % 12];
}

// 24 солнечных сезона, начиная с Личунь (315°).
export const TERMS = ['Личунь · начало весны', 'Юйшуй · дождевая вода', 'Цзинчжэ · пробуждение насекомых', 'Чуньфэнь · весеннее равноденствие',
  'Цинмин · ясный свет', 'Гуюй · хлебные дожди', 'Лися · начало лета', 'Сяомань · малая полнота', 'Манчжун · колос', 'Сячжи · летнее солнцестояние',
  'Сяошу · малая жара', 'Дашу · большая жара', 'Лицю · начало осени', 'Чушу · конец жары', 'Байлу · белая роса', 'Цюфэнь · осеннее равноденствие',
  'Ханьлу · холодная роса', 'Шуанцзян · иней', 'Лидун · начало зимы', 'Сяосюэ · малый снег', 'Дасюэ · большой снег', 'Дунчжи · зимнее солнцестояние',
  'Сяохань · малый холод', 'Дахань · большой холод'];

// Сезонное состояние стихии в месяце (旺相休囚死).
export const SEASON_STATE = ['Процветает', 'Крепнет', 'Отдыхает', 'Заперта', 'Мертва'];
export function seasonState(el: number, monthEl: number): number {
  if (el === monthEl) return 0;
  if (gen(monthEl) === el) return 1;
  if (gen(el) === monthEl) return 2;
  if (ctl(el) === monthEl) return 3;
  return 4;
}
