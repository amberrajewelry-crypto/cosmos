// Честность = тип данных (§1.5-1.6). Число (Computed) отделено от размеченного значения (Value):
// тег и статус верификации присваивает РЕЕСТР (registry/), а не compute-функция.

export type Tag = 'ТОЧНО' | 'ОЦЕНКА' | 'ГЛОБ' | 'СПОРНО' | 'МИФ' | 'ИНТЕРПРЕТАЦИЯ';
export type Status = 'ok' | 'loading' | 'error' | 'unavailable';
export type VerificationStatus = 'unverified' | 'verified' | 'diverged';

export type ScaleLevel =
  | 'кварк' | 'ядро' | 'атом' | 'клетка' | 'тело'
  | 'комната' | 'горизонт' | 'магнитосфера' | 'орбита' | 'галактика' | 'вселенная';

// union, а не голый string — опечатка id не должна компилироваться. Пополняется реестром 92 параметров.
export type LayerId =
  | `c.${string}`
  | 'sky.sun.altitude'
  | 'sky.sun.azimuth'
  | 'sky.moon.altitude'
  | 'sky.sun.constellation'
  | 'shadow.length'
  | 'body.relikt.photons'
  | 'body.radioactivity'
  | 'body.primordial.fraction'
  | 'physics.cmb.velocity'
  | 'physics.time.gradient'
  | 'flux.muon'
  | 'flux.neutrino'
  | 'magnetic.inclination'
  | 'magnetic.declination'
  | 'stars.birthyear'
  | 'stars.birthlight'
  | 'sky.planets.above'
  | 'natal.asc'
  | 'natal.mc'
  | 'live.kp';

// Возвращает compute/ и live/. Сырое число + провенанс. БЕЗ тега.
export interface Computed {
  id: LayerId;
  value: number | null;   // null = нет данных, слой гаснет (§3.9)
  source: string;         // «astronomy-engine», «WMM2025», «mock:kp»
  computedAt: number;     // ms epoch — момент РАСЧЁТА (для выцветания §3.9)
  text?: string;          // категориальный факт (созвездие, направление) — вместо числа
}

// Для UI/сцены. Тег и verification — из реестра.
export interface Value {
  id: LayerId;
  label: string;
  value: number | null;
  unit: string;
  tag: Tag;
  source: string;
  status: Status;
  verification: VerificationStatus;
  computedAt: number;
  explain: string;        // одна фраза объяснения (§2.5) — из реестра/контент-базы
  text?: string;          // категориальный факт вместо числа
  verifyUrl?: string;     // «где проверить» — независимый эталон (§2.5)
}
