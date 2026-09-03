import type { Computed, Value, Tag, VerificationStatus } from '../types';

// Реестр параметров — ЕДИНСТВЕННЫЙ источник тега, статуса верификации и текста (§1.6).
// До прохождения A4 (verification !== 'verified') тег [ТОЧНО] структурно недоступен:
// toValue даунгрейдит его в [ОЦЕНКА]. Соврать [ТОЧНО] в коде расчёта технически нельзя.
// Пока это прото-контент-база; в A5 переезжает в Airtable (92 параметра × 3 уровня текста).
interface Entry {
  label: string;
  unit: string;
  provisionalTag: Tag;          // каким станет тег ПОСЛЕ верификации
  verification: VerificationStatus;
  explain: string;              // одна фраза (§2.5)
}

const REGISTRY: Record<string, Entry> = {
  'sky.sun.altitude': {
    label: 'Высота Солнца', unit: '°', provisionalTag: 'ТОЧНО', verification: 'verified', // A4 vs JPL Horizons Δ0.006°
    explain: 'Где над горизонтом стоит Солнце в твоей точке прямо сейчас.',
  },
  'sky.sun.azimuth': {
    label: 'Азимут Солнца', unit: '°', provisionalTag: 'ТОЧНО', verification: 'verified', // A4 vs JPL Horizons Δ0.001°
    explain: 'Направление на Солнце по горизонту, от Севера к Востоку.',
  },
  'sky.moon.altitude': {
    label: 'Высота Луны', unit: '°', provisionalTag: 'ТОЧНО', verification: 'diverged', // A4: рефракция у горизонта Δ0.19° → [ОЦЕНКА]
    explain: 'Где над горизонтом Луна — она тянет твоё тело приливом прямо сейчас.',
  },
  'sky.sun.constellation': {
    label: 'Реальное созвездие vs знак', unit: '', provisionalTag: 'ТОЧНО', verification: 'unverified',
    explain: 'За две тысячи лет прецессия сдвинула небо на ~24°: знак и реальное созвездие Солнца больше не совпадают.',
  },
  'shadow.length': {
    label: 'Длина твоей тени', unit: '× роста', provisionalTag: 'ТОЧНО', verification: 'verified', // точная производная верифиц. высоты Солнца
    explain: 'Во столько раз твоя тень длиннее тебя прямо сейчас. Возьми линейку и проверь — это единственное число, которое видно глазом.',
  },
  'body.relikt.photons': {
    label: 'Реликтовые фотоны в теле', unit: 'шт', provisionalTag: 'ОЦЕНКА', verification: 'unverified',
    explain: 'Столько фотонов, родившихся через 380 000 лет после Большого взрыва, пронизывают тебя сейчас.',
  },
  'body.radioactivity': {
    label: 'Собственная радиоактивность', unit: 'расп/с', provisionalTag: 'ОЦЕНКА', verification: 'unverified',
    explain: 'Столько ядер калия-40 и углерода-14 распадается внутри тебя каждую секунду. Ты сам источник.',
  },
  'body.primordial.fraction': {
    label: 'Атомы старше любой звезды', unit: '%', provisionalTag: 'ОЦЕНКА', verification: 'unverified',
    explain: 'Столько твоих атомов (по числу) — водород, синтезированный в первые минуты Вселенной.',
  },
  'physics.cmb.velocity': {
    label: 'Твоя скорость сквозь космос', unit: 'км/с', provisionalTag: 'ГЛОБ', verification: 'unverified',
    explain: 'Ты «сидящий неподвижно» несёшься с этой скоростью относительно реликтового излучения. Покой — иллюзия.',
  },
  'physics.time.gradient': {
    label: 'Градиент времени голова/ноги', unit: 'нс/год', provisionalTag: 'ОЦЕНКА', verification: 'unverified',
    explain: 'На столько наносекунд в год твоя голова стареет быстрее ног — пространство-время искривлено внутри тебя.',
  },
  'flux.muon': {
    label: 'Мюоны сквозь тело', unit: '/мин', provisionalTag: 'ОЦЕНКА', verification: 'unverified',
    explain: 'Столько мюонов из верхней атмосферы прошивают тебя каждую минуту. Долетают только потому, что время для них течёт медленнее — они доказывают СТО собой.',
  },
  'flux.neutrino': {
    label: 'Нейтрино сквозь тебя', unit: '/см²·с', provisionalTag: 'ГЛОБ', verification: 'unverified',
    explain: 'Столько солнечных нейтрино проходит через каждый см² тебя каждую секунду, почти не касаясь.',
  },
  'magnetic.inclination': {
    label: 'Наклон магнитных линий', unit: '°', provisionalTag: 'ТОЧНО', verification: 'unverified',
    explain: 'Под этим углом магнитные линии Земли протыкают тебя насквозь в твоей точке.',
  },
  'magnetic.declination': {
    label: 'Магнитное склонение', unit: '°', provisionalTag: 'ТОЧНО', verification: 'unverified',
    explain: 'На столько истинный север расходится с тем, куда показывает компас в твоей точке.',
  },
  'live.kp': {
    label: 'Kp-индекс', unit: '', provisionalTag: 'ГЛОБ', verification: 'unverified',
    explain: 'Глобальный уровень геомагнитной возмущённости.',
  },
};

const FALLBACK: Entry = { label: '', unit: '', provisionalTag: 'СПОРНО', verification: 'unverified', explain: '' };

// Публичная таблица честности (§7.8): реестр — источник правды по верификации.
export interface VerificationRow { label: string; provisionalTag: Tag; verification: VerificationStatus; }
export function verificationTable(): VerificationRow[] {
  return Object.values(REGISTRY).map((e) => ({ label: e.label, provisionalTag: e.provisionalTag, verification: e.verification }));
}

export function toValue(c: Computed): Value {
  const e = REGISTRY[c.id] ?? { ...FALLBACK, label: c.id };
  // [ТОЧНО] разрешён только для верифицированных; иначе честный даунгрейд.
  const tag: Tag =
    e.verification === 'verified'
      ? e.provisionalTag
      : e.provisionalTag === 'ТОЧНО' ? 'ОЦЕНКА' : e.provisionalTag;

  return {
    id: c.id,
    label: e.label,
    value: c.value,
    unit: e.unit,
    tag,
    source: c.source,
    status: c.value == null && !c.text ? 'unavailable' : 'ok',
    verification: e.verification,
    computedAt: c.computedAt,
    explain: e.explain,
    text: c.text,           // категориальный факт (созвездие/«тени нет») — пробрасываем в UI
  };
}
