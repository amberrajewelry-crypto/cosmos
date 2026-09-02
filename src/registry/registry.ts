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
    label: 'Высота Солнца', unit: '°', provisionalTag: 'ТОЧНО', verification: 'unverified',
    explain: 'Где над горизонтом стоит Солнце в твоей точке прямо сейчас.',
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
  'live.kp': {
    label: 'Kp-индекс', unit: '', provisionalTag: 'ГЛОБ', verification: 'unverified',
    explain: 'Глобальный уровень геомагнитной возмущённости.',
  },
};

const FALLBACK: Entry = { label: '', unit: '', provisionalTag: 'СПОРНО', verification: 'unverified', explain: '' };

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
    status: c.value == null ? 'unavailable' : 'ok',
    verification: e.verification,
    computedAt: c.computedAt,
    explain: e.explain,
  };
}
