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
  verifyUrl?: string;           // «где проверить» (§2.5, §7.4): независимый эталон, куда может сходить читатель
}

const REGISTRY: Record<string, Entry> = {
  'sky.sun.altitude': {
    label: 'Высота Солнца', unit: '°', provisionalTag: 'ТОЧНО', verification: 'verified', // A4 vs JPL Horizons Δ0.006°
    explain: 'Где над горизонтом стоит Солнце в твоей точке прямо сейчас.',
    verifyUrl: 'https://www.timeanddate.com/sun/',
  },
  'sky.sun.azimuth': {
    label: 'Азимут Солнца', unit: '°', provisionalTag: 'ТОЧНО', verification: 'verified', // A4 vs JPL Horizons Δ0.001°
    explain: 'Направление на Солнце по горизонту, от Севера к Востоку.',
    verifyUrl: 'https://www.timeanddate.com/sun/',
  },
  'sky.moon.altitude': {
    label: 'Высота Луны', unit: '°', provisionalTag: 'ТОЧНО', verification: 'verified', // A4 vs JPL Horizons APPARENT=REFRACTED: 4.2536° vs 4.254328°, Δ0.0007° (прежнее «расхождение» 0.19° — сравнение с AIRLESS)
    explain: 'Где над горизонтом Луна — она тянет твоё тело приливом прямо сейчас.',
    verifyUrl: 'https://www.timeanddate.com/moon/',
  },
  'sky.sun.constellation': {
    label: 'Реальное созвездие vs знак', unit: '', provisionalTag: 'ТОЧНО', verification: 'verified', // A4 vs JPL Horizons Q29: 5/5 дат совпали (Sgr/Psc/Gem/Vir/Oph)
    explain: 'За две тысячи лет прецессия сдвинула небо на ~24°: знак и реальное созвездие Солнца больше не совпадают.',
    verifyUrl: 'https://in-the-sky.org/whatsup.php',
  },
  'sky.planets.above': {
    label: 'Планеты над горизонтом', unit: 'из 5', provisionalTag: 'ТОЧНО', verification: 'verified', // A4 vs JPL Horizons: аз Δ<0.001°, выс Δ≤0.07° (Сатурн 12.7°, рефракция)
    explain: 'Какие из пяти ярких планет сейчас над твоим горизонтом. Найди их глазом — планеты не мерцают.',
    verifyUrl: 'https://in-the-sky.org/whatsup.php',
  },
  'stars.birthlight': {
    label: 'Звезда твоего рождения', unit: 'св. лет', provisionalTag: 'ОЦЕНКА', verification: 'verified', // A4 vs SIMBAD параллаксы: ≤2 % для ≤130 св. лет; Бетельгейзе ±20 % (задокум.)
    explain: 'Свет летит с конечной скоростью: глядя на эту звезду, ты видишь её такой, какой она была примерно в год твоего рождения.',
    verifyUrl: 'https://simbad.cds.unistra.fr/simbad/',
  },
  'shadow.length': {
    label: 'Длина твоей тени', unit: '× роста', provisionalTag: 'ТОЧНО', verification: 'verified', // точная производная верифиц. высоты Солнца
    explain: 'Во столько раз твоя тень длиннее тебя прямо сейчас. Возьми линейку и проверь — это единственное число, которое видно глазом.',
    verifyUrl: 'https://www.timeanddate.com/sun/',
  },
  'body.relikt.photons': {
    label: 'Реликтовые фотоны в теле', unit: 'шт', provisionalTag: 'ОЦЕНКА', verification: 'verified', // A4: n_γ=410.7 см⁻³ Planck 2018; объём 70 кг/1.01
    explain: 'Столько фотонов, родившихся через 380 000 лет после Большого взрыва, пронизывают тебя сейчас.',
    verifyUrl: 'https://pdg.lbl.gov/2024/reviews/rpp2024-rev-cosmic-microwave-background.pdf',
  },
  'body.radioactivity': {
    label: 'Собственная радиоактивность', unit: 'расп/с', provisionalTag: 'ОЦЕНКА', verification: 'verified', // A4: HPS/ANS 4400 Бк K-40 + 3100 Бк C-14 на 70 кг
    explain: 'Столько ядер калия-40 и углерода-14 распадается внутри тебя каждую секунду. Ты сам источник.',
    verifyUrl: 'https://hps.org/publicinformation/ate/faqs/faqradbods.html',
  },
  'body.primordial.fraction': {
    label: 'Атомы старше любой звезды', unit: '%', provisionalTag: 'ОЦЕНКА', verification: 'verified', // A4: доля H по числу атомов 62–63 % (Freitas, Nanomedicine I, табл. 3-1)
    explain: 'Столько твоих атомов (по числу) — водород, синтезированный в первые минуты Вселенной.',
    verifyUrl: 'https://en.wikipedia.org/wiki/Composition_of_the_human_body#Elemental_composition_list',
  },
  'physics.cmb.velocity': {
    label: 'Твоя скорость сквозь космос', unit: 'км/с', provisionalTag: 'ГЛОБ', verification: 'verified', // A4: диполь CMB 369.82±0.11 км/с, Planck 2018 I
    explain: 'Ты «сидящий неподвижно» несёшься с этой скоростью относительно реликтового излучения. Покой — иллюзия.',
    verifyUrl: 'https://www.aanda.org/articles/aa/full_html/2020/09/aa33880-18/aa33880-18.html',
  },
  'physics.time.gradient': {
    label: 'Градиент времени голова/ноги', unit: 'нс/год', provisionalTag: 'ОЦЕНКА', verification: 'verified', // A4: g·h/c² согласуется с Chou et al. 2010 (Science 329) при масштабировании 33 см→1.7 м
    explain: 'На столько наносекунд в год твоя голова стареет быстрее ног — пространство-время искривлено внутри тебя.',
    verifyUrl: 'https://www.science.org/doi/10.1126/science.1192720',
  },
  'flux.muon': {
    label: 'Мюоны сквозь тело', unit: '/мин', provisionalTag: 'ОЦЕНКА', verification: 'verified', // A4: PDG 2024 §30.3.2 ~1 см⁻²мин⁻¹; сечение тела — оценка
    explain: 'Столько мюонов из верхней атмосферы прошивают тебя каждую минуту. Долетают только потому, что время для них течёт медленнее — они доказывают СТО собой.',
    verifyUrl: 'https://pdg.lbl.gov/2024/reviews/rpp2024-rev-cosmic-rays.pdf',
  },
  'flux.neutrino': {
    label: 'Нейтрино сквозь тебя', unit: '/см²·с', provisionalTag: 'ГЛОБ', verification: 'verified', // A4: Bahcall & Serenelli 2005, суммарный солнечный поток ~6.5·10¹⁰
    explain: 'Столько солнечных нейтрино проходит через каждый см² тебя каждую секунду, почти не касаясь.',
    verifyUrl: 'https://www.sns.ias.edu/~jnb/SNdata/sndata.html',
  },
  'magnetic.inclination': {
    label: 'Наклон магнитных линий', unit: '°', provisionalTag: 'ТОЧНО', verification: 'verified', // A4 vs BGS WMM2025: 61.02° vs 61.022°
    explain: 'Под этим углом магнитные линии Земли протыкают тебя насквозь в твоей точке.',
    verifyUrl: 'https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml',
  },
  'magnetic.declination': {
    label: 'Магнитное склонение', unit: '°', provisionalTag: 'ТОЧНО', verification: 'verified', // A4 vs BGS WMM2025: 7.00° vs 6.998°
    explain: 'На столько истинный север расходится с тем, куда показывает компас в твоей точке.',
    verifyUrl: 'https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml',
  },
  'live.kp': {
    label: 'Kp-индекс', unit: '', provisionalTag: 'ГЛОБ', verification: 'verified', // A4: источник переведён на официальный GFZ Potsdam (/api/kp); NOAA — fallback, расходится до 0.7 (задокум.)
    explain: 'Глобальный уровень геомагнитной возмущённости.',
    verifyUrl: 'https://www.swpc.noaa.gov/products/planetary-k-index',
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
    verifyUrl: e.verifyUrl,
    text: c.text,           // категориальный факт (созвездие/«тени нет») — пробрасываем в UI
  };
}
