import type { Computed, Value, Tag, VerificationStatus } from '../types';

// Реестр параметров — ЕДИНСТВЕННЫЙ источник тега и статуса верификации (§1.6).
// До прохождения A4 (verification !== 'verified') тег [ТОЧНО] структурно недоступен:
// toValue даунгрейдит его в [ОЦЕНКА]. Соврать [ТОЧНО] в коде расчёта технически нельзя.
interface Entry {
  label: string;
  unit: string;
  provisionalTag: Tag;          // каким станет тег ПОСЛЕ верификации
  verification: VerificationStatus;
}

const REGISTRY: Record<string, Entry> = {
  'sky.sun.altitude': { label: 'Высота Солнца', unit: '°', provisionalTag: 'ТОЧНО', verification: 'unverified' },
  'live.kp':          { label: 'Kp-индекс',     unit: '',  provisionalTag: 'ГЛОБ',  verification: 'unverified' },
};

const FALLBACK: Entry = { label: '', unit: '', provisionalTag: 'СПОРНО', verification: 'unverified' };

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
  };
}
