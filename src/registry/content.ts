import { Body, HelioVector, GeoVector, Observer, Horizon, SearchRiseSet, SearchHourAngle, Illumination } from 'astronomy-engine';
import geomagnetism from 'geomagnetism';
import type { Tag, Value } from '../types';
import { LEVELS } from '../scene/scales';

// §2.3: «остальные 80 живут в контент-базе» — параметры по уровням лестницы масштабов (§4.2: 10–15 на уровень).
// Показываются на текущем уровне и целиком уходят в контекст «Спросить» (§2.2). LLM не считает (§3.3) — считает этот файл.
// Каждая строка: число или факт + источник + тег честности (§1.5). Входные данные не покидают браузер (§3.7).
export interface Ctx { when: Date; lat?: number; lon?: number; massKg: number; heightM: number; ageYears?: number; kp?: number; }
type Out = number | string | null;
export interface ContentParam {
  id: `c.${string}`; level: number; label: string; unit: string; tag: Tag; source: string; explain: string; verifyUrl?: string;
  compute: (c: Ctx) => Out;
}

const AU_KM = 149_597_870.7, C = 299_792_458, G = 6.674e-11, M_SUN = 1.989e30, M_MOON = 7.342e22, R_EARTH = 6_371_000;
const YEAR_S = 365.25 * 86400, LY_KM = 9.4607e12;
const sci = (x: number, d = 1) => { const e = Math.floor(Math.log10(Math.abs(x))); return `${(x / 10 ** e).toFixed(d)}·10${sup(e)}`; };
const sup = (n: number) => String(n).replace(/-/g, '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]);
const nucleons = (c: Ctx) => c.massKg / 1.6605e-27;
const place = (c: Ctx) => (c.lat != null && c.lon != null ? new Observer(c.lat, c.lon, 0) : null);
const altOf = (c: Ctx, ra: number, dec: number) => { const o = place(c); return o ? Horizon(c.when, o, ra, dec, 'normal').altitude : null; };
const geoDist = (b: Body, when: Date) => GeoVector(b, when, true).Length() * AU_KM;

export const CONTENT: ContentParam[] = [
  // ——— 10⁻¹⁵ ядро атома ———
  { id: 'c.nuc.protons', level: 0, label: 'Протонов в теле', unit: '', tag: 'ОЦЕНКА', source: 'состав тела, Z/A ≈ 0.55', explain: 'Столько протонов держат заряд твоего тела в равновесии — каждый старше 13.8 млрд лет.', compute: (c) => sci(nucleons(c) * 0.55) },
  { id: 'c.nuc.volume', level: 0, label: 'Доля объёма тела, занятая ядрами', unit: '', tag: 'ОЦЕНКА', source: 'r_p = 0.84 фм / r_атома ≈ 1 Å', explain: 'Вся твоя масса сидит в квадриллионной доле объёма. Остальное — поле.', compute: () => '10⁻¹⁵' },
  { id: 'c.nuc.mass_in_nuclei', level: 0, label: 'Масса, сидящая в ядрах', unit: '%', tag: 'ТОЧНО', source: 'm_e/m_p = 1/1836', explain: 'Электроны весят почти ничего: 99.97 % тебя — это ядра.', compute: () => 99.97 },
  { id: 'c.nuc.k40', level: 0, label: 'Атомов калия-40 в теле', unit: '', tag: 'ОЦЕНКА', source: '140 г K, 0.0117 % ⁴⁰K', explain: 'Каждый из них однажды распадётся — вместе они дают 4400 распадов в секунду.', compute: (c) => sci(c.massKg / 70 * 2.5e20) },
  { id: 'c.nuc.decays_life', level: 0, label: 'Распадов внутри тебя с рождения', unit: '', tag: 'ОЦЕНКА', source: 'K-40 4.3 кБк + C-14 3.1 кБк ≈ 7.4 кБк × возраст', explain: 'Столько ядер уже превратились в другие элементы внутри твоего тела.', compute: (c) => (c.ageYears != null ? sci(7400 * c.ageYears * YEAR_S * c.massKg / 70) : null) },
  { id: 'c.nuc.binding', level: 0, label: 'Масса тела, которая есть энергия связи', unit: 'г', tag: 'ОЦЕНКА', source: '≈8 МэВ/нуклон из 938', explain: 'Около 600 граммов тебя — не вещество, а энергия, которой ядра держатся вместе (E=mc²).', compute: (c) => Math.round(c.massKg * 1000 * 0.0085) },
  { id: 'c.nuc.fusion', level: 0, label: 'Если бы твой водород сгорел как в Солнце', unit: 'ТВт·ч', tag: 'ОЦЕНКА', source: '10 % массы — H; 0.7 % массы → энергия', explain: 'Столько энергии — потребление России за месяц.', compute: (c) => Math.round(c.massKg * 0.1 * 0.007 * C * C / 3.6e15) },
  // ——— 10⁻¹⁰ атом ———
  { id: 'c.atom.count', level: 1, label: 'Атомов в теле', unit: '', tag: 'ОЦЕНКА', source: 'Freitas, Nanomedicine; 70 кг', explain: 'Семь миллиардов миллиардов миллиардов — и ни один не был создан заново с Большого взрыва, кроме звёздных.', compute: (c) => sci(6.7e27 * c.massKg / 70) },
  { id: 'c.atom.top3', level: 1, label: 'Три главных атома', unit: '', tag: 'ТОЧНО', source: 'состав по числу атомов', explain: 'По числу атомов ты почти целиком водород, кислород и углерод.', compute: () => 'H 62 % · O 24 % · C 12 %' },
  { id: 'c.atom.stellar', level: 1, label: 'Атомов, рождённых в звёздах', unit: '%', tag: 'ОЦЕНКА', source: '100 % − доля H', explain: 'Всё, кроме водорода, — пепел звёзд: кислород, углерод, азот, кальций, железо.', compute: () => 38 },
  { id: 'c.atom.iron', level: 1, label: 'Атомов железа в теле', unit: '', tag: 'ОЦЕНКА', source: '4 г Fe в теле', explain: 'Железо в твоей крови рождено в умирающих звёздах — в теле его 4 грамма.', compute: (c) => sci(4.3e22 * c.massKg / 70) },
  { id: 'c.atom.oldest', level: 1, label: 'Возраст самого старого атома в тебе', unit: 'млрд лет', tag: 'ТОЧНО', source: 'Planck 2018; первичный нуклеосинтез', explain: 'Водород в тебе синтезирован в первые 3 минуты Вселенной.', compute: () => 13.8 },
  { id: 'c.atom.empty', level: 1, label: 'Пустота в атоме', unit: '', tag: 'ОЦЕНКА', source: 'объём ядра / объём атома', explain: 'Если убрать пустоту, всё человечество уместится в кубик сахара.', compute: () => '99.9999999999996 %' },
  { id: 'c.atom.turnover', level: 1, label: 'Атомов тела заменяется за год', unit: '%', tag: 'СПОРНО', source: 'Aebersold 1953 (радиоизотопы), популярная оценка', explain: 'Ты — не вещество, а узор: за год почти все атомы сменяются.', compute: () => 98 },
  { id: 'c.atom.electrons', level: 1, label: 'Электронов в теле', unit: '', tag: 'ОЦЕНКА', source: '= число протонов', explain: 'Каждая твоя мысль — их перераспределение.', compute: (c) => sci(nucleons(c) * 0.55) },
  { id: 'c.atom.line', level: 1, label: 'Твои атомы в одну нить', unit: 'св. лет', tag: 'ОЦЕНКА', source: '7·10²⁷ × 1 Å', explain: 'Выложенные в ряд, атомы твоего тела дотянутся дальше Веги.', compute: (c) => Math.round(6.7e27 * c.massKg / 70 * 1e-13 / LY_KM) },
  // ——— 10⁻⁵ клетка ———
  { id: 'c.cell.count', level: 2, label: 'Клеток в теле', unit: '', tag: 'ОЦЕНКА', source: 'Bianconi et al. 2013', explain: '37 триллионов — и почти столько же бактерий живут вместе с ними.', compute: (c) => sci(3.7e13 * c.massKg / 70) },
  { id: 'c.cell.bacteria', level: 2, label: 'Бактерий на тебе и в тебе', unit: '', tag: 'ОЦЕНКА', source: 'Sender, Fuchs, Milo 2016', explain: 'По числу клеток ты наполовину не человек.', compute: (c) => sci(3.8e13 * c.massKg / 70) },
  { id: 'c.cell.rbc', level: 2, label: 'Новых эритроцитов в секунду', unit: '', tag: 'ОЦЕНКА', source: 'гематология; 2.4·10⁶/с', explain: 'Каждую секунду костный мозг выпускает 2.4 миллиона красных клеток.', compute: () => sci(2.4e6) },
  { id: 'c.cell.dna', level: 2, label: 'Длина всей твоей ДНК', unit: 'а.е.', tag: 'ОЦЕНКА', source: '2 м × 3·10¹³ ядерных клеток', explain: 'Вытянутая ДНК тела — в 400 раз дальше, чем до Солнца.', compute: () => Math.round(2 * 3e13 / (AU_KM * 1000)) },
  { id: 'c.cell.neurons', level: 2, label: 'Нейронов в мозге', unit: '', tag: 'ОЦЕНКА', source: 'Azevedo et al. 2009', explain: '86 миллиардов — примерно столько звёзд в галактике поменьше нашей.', compute: () => sci(8.6e10) },
  { id: 'c.cell.heartbeats', level: 2, label: 'Ударов сердца с рождения', unit: '', tag: 'ОЦЕНКА', source: '70 уд/мин × возраст', explain: 'Каждый — сокращение миллиарда клеток по электрическому сигналу.', compute: (c) => (c.ageYears != null ? sci(70 * 525_960 * c.ageYears) : null) },
  { id: 'c.cell.atp', level: 2, label: 'АТФ, синтезируемого за сутки', unit: 'кг', tag: 'ОЦЕНКА', source: 'Törnroth-Horsefield & Neutze 2008', explain: 'За сутки ты производишь и расщепляешь примерно собственную массу молекул энергии.', compute: (c) => Math.round(c.massKg) },
  { id: 'c.cell.dna_damage', level: 2, label: 'Повреждений ДНК на клетку в сутки', unit: '', tag: 'ОЦЕНКА', source: 'Lindahl 1993', explain: 'До 100 000 в каждой клетке ежедневно — и почти все чинятся.', compute: () => '10⁴–10⁵' },
  // ——— 10⁰ тело ———
  { id: 'c.body.g', level: 3, label: 'Ускорение свободного падения здесь', unit: 'м/с²', tag: 'ТОЧНО', source: 'WGS84 (Somigliana)', explain: 'На экваторе ты легче, чем на полюсе, на полпроцента — Земля сплюснута и крутится.', compute: (c) => { if (c.lat == null) return null; const s = Math.sin(c.lat * Math.PI / 180) ** 2; return Math.round(9.7803253359 * (1 + 0.00193185265241 * s) / Math.sqrt(1 - 0.00669437999014 * s) * 10000) / 10000; } },
  { id: 'c.body.spin', level: 3, label: 'Скорость вращения Земли в твоей точке', unit: 'м/с', tag: 'ТОЧНО', source: '465 м/с × cos φ', explain: 'Ты несёшься на восток быстрее пассажирского самолёта — и не чувствуешь.', compute: (c) => (c.lat == null ? null : Math.round(465.1 * Math.cos(c.lat * Math.PI / 180))) },
  { id: 'c.body.mc2', level: 3, label: 'Энергия покоя твоего тела', unit: 'Мт ТНТ', tag: 'ТОЧНО', source: 'E = mc²', explain: 'Тысяча пятьсот мегатонн — тридцать «Царь-бомб».', compute: (c) => Math.round(c.massKg * C * C / 4.184e15) },
  { id: 'c.body.ir', level: 3, label: 'Инфракрасных фотонов, которые ты излучаешь', unit: '/с', tag: 'ОЦЕНКА', source: '≈100 Вт при 0.1 эВ на фотон', explain: 'Ты светишься — в инфракрасном, как лампочка на сто ватт.', compute: () => sci(6e21) },
  { id: 'c.body.water', level: 3, label: 'Возраст воды в тебе', unit: '', tag: 'СПОРНО', source: 'Cleeves et al. 2014 (D/H)', explain: 'Часть молекул воды в тебе старше Солнца — они сложились в межзвёздном облаке.', compute: () => 'старше Солнца (4.6 млрд лет)' },
  { id: 'c.body.gravity', level: 3, label: 'Твоё притяжение к человеку в метре', unit: 'мкН', tag: 'ТОЧНО', source: 'F = Gm₁m₂/r²', explain: 'Вы притягиваете друг друга. Слабо, но по тому же закону, что Земля и Луна.', compute: (c) => Math.round(G * c.massKg * c.massKg / 1 * 1e6 * 100) / 100 },
  { id: 'c.body.light', level: 3, label: 'Свет проходит твой рост за', unit: 'нс', tag: 'ТОЧНО', source: 'h / c', explain: 'Ты видишь свои ноги с задержкой в шесть наносекунд.', compute: (c) => Math.round(c.heightM / C * 1e9 * 100) / 100 },
  { id: 'c.body.rs', level: 3, label: 'Твой радиус Шварцшильда', unit: 'м', tag: 'ТОЧНО', source: 'r = 2Gm/c²', explain: 'Сожми себя до этого размера — станешь чёрной дырой.', compute: (c) => sci(2 * G * c.massKg / (C * C)) },
  { id: 'c.body.co2', level: 3, label: 'CO₂ выдыхаешь за сутки', unit: 'кг', tag: 'ОЦЕНКА', source: '≈1 кг/сутки в покое', explain: 'Углерод в нём был звёздным пеплом, потом растением, потом тобой.', compute: () => 1 },
  // ——— 10⁴ горизонт ———
  { id: 'c.hor.dist', level: 4, label: 'Расстояние до горизонта', unit: 'км', tag: 'ТОЧНО', source: '√(2Rh), высота глаз', explain: 'Дальше Земля прячется за собственной кривизной.', compute: (c) => Math.round(Math.sqrt(2 * R_EARTH * (c.heightM - 0.1)) / 100) / 10 },
  { id: 'c.hor.curve', level: 4, label: 'Земля уходит вниз за 1 км', unit: 'см', tag: 'ТОЧНО', source: 'd²/2R', explain: 'Кривизну Земли можно измерить на пляже — 8 см на километр.', compute: () => 7.8 },
  { id: 'c.hor.refraction', level: 4, label: 'Солнце видно после захода ещё', unit: 'мин', tag: 'ТОЧНО', source: 'рефракция 34′ у горизонта', explain: 'Диск, который ты видишь садящимся, геометрически уже под горизонтом.', compute: (c) => (c.lat == null ? null : Math.round(34 / 15 / Math.max(0.2, Math.cos(c.lat * Math.PI / 180)) * 10) / 10) },
  { id: 'c.hor.day', level: 4, label: 'Длина светового дня сегодня', unit: 'ч', tag: 'ТОЧНО', source: 'astronomy-engine, восход/заход', explain: 'От восхода до захода в твоей точке — с рефракцией.', compute: (c) => { const o = place(c); if (!o) return null; const d0 = new Date(Date.UTC(c.when.getUTCFullYear(), c.when.getUTCMonth(), c.when.getUTCDate()) - c.lon! * 240e3); const r = SearchRiseSet(Body.Sun, o, +1, d0, 1), s = r && SearchRiseSet(Body.Sun, o, -1, r.date, 1); return r && s ? Math.round((s.date.getTime() - r.date.getTime()) / 36e4) / 10 : 'полярный день/ночь'; } },
  { id: 'c.hor.noon', level: 4, label: 'Истинный полдень сегодня', unit: '', tag: 'ТОЧНО', source: 'SearchHourAngle(Sun, 0)', explain: 'Момент, когда Солнце выше всего и тень короче всего — не 12:00 по часам.', compute: (c) => { const o = place(c); if (!o) return null; const d0 = new Date(Date.UTC(c.when.getUTCFullYear(), c.when.getUTCMonth(), c.when.getUTCDate())); const h = SearchHourAngle(Body.Sun, o, 0, d0, 1); return `${h.time.date.toISOString().slice(11, 16)} UTC`; } },
  { id: 'c.hor.polaris', level: 4, label: 'Высота Полярной над горизонтом', unit: '°', tag: 'ТОЧНО', source: '= широта (±0.7°)', explain: 'Вытяни руку: кулак — 10°. Столько кулаков до Полярной — твоя широта.', compute: (c) => (c.lat == null ? null : c.lat > 0 ? Math.round(c.lat * 10) / 10 : 'не видна в южном полушарии') },
  { id: 'c.hor.air', level: 4, label: 'Масса воздуха над твоей макушкой', unit: 'кг', tag: 'ОЦЕНКА', source: '10.3 т/м² × 0.1 м²', explain: 'Тонна воздуха давит сверху — ты не замечаешь, потому что давит и изнутри.', compute: () => 1000 },
  { id: 'c.hor.moon_dist', level: 4, label: 'До Луны сейчас', unit: 'тыс. км', tag: 'ТОЧНО', source: 'astronomy-engine (ELP)', explain: 'Луна на эллипсе: от 356 до 407 тысяч км. Свет туда — 1.3 с.', compute: (c) => Math.round(geoDist(Body.Moon, c.when) / 1000) },
  { id: 'c.hor.moon_phase', level: 4, label: 'Луна освещена', unit: '%', tag: 'ТОЧНО', source: 'astronomy-engine', explain: 'Доля диска, которую сейчас освещает Солнце.', compute: (c) => Math.round(Illumination(Body.Moon, c.when).phase_fraction * 100) },
  // ——— 10⁷ магнитосфера ———
  { id: 'c.mag.f', level: 5, label: 'Магнитное поле в твоей точке', unit: 'нТл', tag: 'ТОЧНО', source: 'WMM2025', explain: 'Полная напряжённость поля, которое отклоняет твой компас и космические лучи.', compute: (c) => (c.lat == null ? null : Math.round(geomagnetism.model(c.when).point([c.lat, c.lon!]).f)) },
  { id: 'c.mag.pole', level: 5, label: 'Северный магнитный полюс движется', unit: 'км/год', tag: 'ОЦЕНКА', source: 'BGS / NCEI 2020–2025', explain: 'Полюс убегает от Канады к Сибири; в 1990-х — 55 км/год, сейчас замедлился.', compute: () => 35 },
  { id: 'c.mag.pause', level: 5, label: 'Магнитопауза к Солнцу', unit: 'тыс. км', tag: 'ОЦЕНКА', source: 'NASA, ~10 R⊕', explain: 'Здесь солнечный ветер упирается в поле Земли. Щит от 400 км/с плазмы.', compute: () => 64 },
  { id: 'c.mag.wind', level: 5, label: 'Солнечный ветер', unit: 'км/с', tag: 'ОЦЕНКА', source: 'типичный, NOAA SWPC', explain: 'Поток протонов от Солнца до тебя — четверо суток пути.', compute: () => 400 },
  { id: 'c.mag.aurora', level: 5, label: 'Граница сияний сейчас (широта)', unit: '°', tag: 'ОЦЕНКА', source: 'Kp → ~67° − 2°·Kp', explain: 'При Kp 9 сияния спускаются до 50°. Число зависит от живого Kp.', compute: (c) => (c.kp == null ? null : Math.round(67 - 2 * c.kp)) },
  { id: 'c.mag.flip', level: 5, label: 'Последняя инверсия поля', unit: 'тыс. лет назад', tag: 'ТОЧНО', source: 'Брюнес–Матуяма', explain: 'Северный и южный полюс менялись местами сотни раз. Следующая — неизвестно когда.', compute: () => 780 },
  { id: 'c.mag.tilt', level: 5, label: 'Наклон магнитной оси к оси вращения', unit: '°', tag: 'ТОЧНО', source: 'IGRF-13/14: геомагнитный полюс ≈80.7° N → 9.3° (учебные 11.5° — 1980-е)', explain: 'Поэтому компас не показывает на географический север.', compute: () => 9.3 },
  { id: 'c.mag.sats', level: 5, label: 'Активных спутников над Землёй', unit: '', tag: 'ОЦЕНКА', source: 'UCS / Jonathan McDowell 2026', explain: 'Над твоим горизонтом в любой момент — несколько сотен из них.', compute: () => '≈ 13 000' },
  // ——— 10¹¹ орбита ———
  { id: 'c.orb.speed', level: 6, label: 'Скорость Земли по орбите сейчас', unit: 'км/с', tag: 'ТОЧНО', source: 'astronomy-engine, |Δr/Δt|', explain: 'В январе (перигелий) быстрее, в июле медленнее — Кеплер прямо в твоём кресле.', compute: (c) => { const a = HelioVector(Body.Earth, c.when), b = HelioVector(Body.Earth, new Date(c.when.getTime() + 3600e3)); return Math.round(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) * AU_KM / 3600 * 100) / 100; } },
  { id: 'c.orb.path', level: 6, label: 'Пройдено по орбите с рождения', unit: 'млрд км', tag: 'ТОЧНО', source: '2π·а.е. = 939.95 млн км/год', explain: 'Ты уже проехал вокруг Солнца дальше, чем до Плутона и обратно.', compute: (c) => (c.ageYears != null ? Math.round(0.94 * c.ageYears * 10) / 10 : null) },
  { id: 'c.orb.sun_dist', level: 6, label: 'До Солнца сейчас', unit: 'млн км', tag: 'ТОЧНО', source: 'astronomy-engine (VSOP87)', explain: 'Свет отсюда идёт к тебе 8 с лишним минут — ты видишь Солнце прошлым.', compute: (c) => Math.round(HelioVector(Body.Earth, c.when).Length() * AU_KM / 1e4) / 100 },
  { id: 'c.orb.light', level: 6, label: 'Свет от Солнца идёт', unit: 'с', tag: 'ТОЧНО', source: 'd / c', explain: 'Если Солнце погаснет, ты узнаешь через восемь минут.', compute: (c) => Math.round(HelioVector(Body.Earth, c.when).Length() * AU_KM * 1000 / C) },
  { id: 'c.orb.moon_away', level: 6, label: 'Луна отдалилась с твоего рождения', unit: 'см', tag: 'ТОЧНО', source: 'LLR: 38.08 мм/год (Williams & Boggs 2016)', explain: 'Приливы тормозят Землю и отталкивают Луну — пока ты рос, она ушла на метр.', compute: (c) => (c.ageYears != null ? Math.round(3.8 * c.ageYears) : null) },
  { id: 'c.orb.tide', level: 6, label: 'Луна меняет твой вес на', unit: 'мг', tag: 'ТОЧНО', source: 'Δg = 2GMr/d³', explain: 'Приливная сила Луны действует и на тебя — на миллиграммы.', compute: (c) => Math.round(c.massKg * 2 * G * M_MOON * R_EARTH / (geoDist(Body.Moon, c.when) * 1000) ** 3 / 9.81 * 1e6 * 10) / 10 },
  { id: 'c.orb.sun_pull', level: 6, label: 'Солнце тянет тебя с силой', unit: 'Н', tag: 'ТОЧНО', source: 'GMm/d²', explain: 'Как 40 граммов на ладони — и этого хватает, чтобы держать тебя на орбите.', compute: (c) => Math.round(G * M_SUN * c.massKg / (HelioVector(Body.Earth, c.when).Length() * AU_KM * 1000) ** 2 * 1000) / 1000 },
  { id: 'c.orb.mars', level: 6, label: 'До Марса сейчас', unit: 'млн км', tag: 'ТОЧНО', source: 'astronomy-engine', explain: 'От 55 до 400 млн км — сигнал туда идёт от 3 до 22 минут.', compute: (c) => Math.round(geoDist(Body.Mars, c.when) / 1e6) },
  { id: 'c.orb.photon_age', level: 6, label: 'Возраст солнечного света', unit: 'лет', tag: 'СПОРНО', source: 'диффузия из ядра, 10⁴–10⁵ лет (оценки расходятся)', explain: 'Фотон, греющий тебя, родился в ядре Солнца задолго до цивилизации.', compute: () => '10 000–170 000' },
  // ——— 10²¹ Галактика ———
  { id: 'c.gal.speed', level: 7, label: 'Скорость Солнца вокруг центра Галактики', unit: 'км/с', tag: 'ОЦЕНКА', source: 'GRAVITY 2019, ~230 км/с', explain: 'Двести тридцать километров каждую секунду — и один оборот за 230 млн лет.', compute: () => 230 },
  { id: 'c.gal.path', level: 7, label: 'Пролетел вокруг центра Галактики с рождения', unit: 'млрд км', tag: 'ОЦЕНКА', source: 'Θ₀ = 229–236 км/с (Reid+2019; GRAVITY 2019) × возраст', explain: 'Дальше любого зонда человечества — не вставая с места.', compute: (c) => (c.ageYears != null ? Math.round(230 * YEAR_S * c.ageYears / 1e9) : null) },
  { id: 'c.gal.year', level: 7, label: 'Доля галактического года, прожитая тобой', unit: '', tag: 'ОЦЕНКА', source: '230 млн лет', explain: 'Динозавры видели Галактику с другой стороны орбиты.', compute: (c) => (c.ageYears != null ? `${(c.ageYears / 230e6 * 100).toExponential(1)} %` : null) },
  { id: 'c.gal.center', level: 7, label: 'Центр Галактики (Стрелец A*) сейчас', unit: '° над горизонтом', tag: 'ТОЧНО', source: 'RA 17h45m40s, Dec −29°00′', explain: 'Чёрная дыра в 4 млн масс Солнца — вот в этой стороне неба.', compute: (c) => { const a = altOf(c, 17.7611, -29.0078); return a == null ? null : Math.round(a); } },
  { id: 'c.gal.proxima', level: 7, label: 'Ближайшая звезда', unit: 'св. лет', tag: 'ТОЧНО', source: 'Gaia DR3, Проксима Центавра', explain: 'Свет, который ты видел бы от неё сегодня, вышел 4 года назад.', compute: () => 4.246 },
  { id: 'c.gal.visible', level: 7, label: 'Звёзд, видимых глазом', unit: '', tag: 'ОЦЕНКА', source: 'V < 6.5, Hipparcos', explain: 'Около 9 000 на всём небе; в одну ночь с одного места — до 2 500.', compute: () => '≈ 9 000' },
  { id: 'c.gal.bh', level: 7, label: 'Масса центральной чёрной дыры', unit: 'млн M☉', tag: 'ТОЧНО', source: 'GRAVITY 2019', explain: 'До неё 26 000 св. лет; её свет, который дошёл сегодня, вышел в ледниковый период.', compute: () => 4.3 },
  { id: 'c.gal.dm', level: 7, label: 'Частиц тёмной материи сквозь тебя', unit: '/с', tag: 'СПОРНО', source: 'если WIMP 100 ГэВ: n = 0.3 ГэВ/см³ ÷ 100 ГэВ, v = 230 км/с, сечение тела 0.7 м²', explain: 'Гипотеза: полмиллиарда в секунду. Ни одна не поймана — тег честно говорит «спорно».', compute: () => '≈ 5·10⁸' },
  { id: 'c.gal.sun_orbits', level: 7, label: 'Оборотов Солнца вокруг Галактики', unit: '', tag: 'ОЦЕНКА', source: '4.6 млрд / 230 млн лет', explain: 'Солнцу двадцать галактических лет.', compute: () => 20 },
  // ——— 10²⁶ Вселенная ———
  { id: 'c.uni.cmb', level: 8, label: 'Температура реликтового излучения', unit: 'K', tag: 'ТОЧНО', source: 'COBE/FIRAS, Planck', explain: 'Свет Большого взрыва остыл до 2.7 К — и до сих пор проходит сквозь тебя.', compute: () => 2.7255 },
  { id: 'c.uni.age', level: 8, label: 'Возраст Вселенной', unit: 'млрд лет', tag: 'ТОЧНО', source: 'Planck 2018', explain: 'Твоя жизнь — это ~0.0000005 % её истории.', compute: () => 13.787 },
  { id: 'c.uni.h0', level: 8, label: 'Точка в 1 млрд св. лет удаляется', unit: 'км/с', tag: 'СПОРНО', source: 'H₀ = 67.4 (Planck) или 73 (SH0ES) — «хаббловское напряжение»', explain: 'Две группы измеряют по-разному, и разница не объяснена. Это честный спор науки, не наш.', compute: () => '20 700–22 400' },
  { id: 'c.uni.atoms', level: 8, label: 'Твоя доля атомов Вселенной', unit: '', tag: 'ОЦЕНКА', source: '≈10⁸⁰ атомов', explain: 'Семь миллиардов миллиардов миллиардов из десяти в восьмидесятой.', compute: (c) => sci(6.7e27 * c.massKg / 70 / 1e80) },
  { id: 'c.uni.galaxies', level: 8, label: 'Галактик в наблюдаемой Вселенной', unit: '', tag: 'ОЦЕНКА', source: 'Conselice et al. 2016', explain: 'Два триллиона — и в каждой сотни миллиардов звёзд, сеющих такие же атомы, как твои.', compute: () => '≈ 2·10¹²' },
  { id: 'c.uni.dark', level: 8, label: 'Из чего Вселенная', unit: '', tag: 'ТОЧНО', source: 'Planck 2018', explain: 'Ты и всё видимое — 5 %. Остальное неизвестно.', compute: () => 'тёмная энергия 68 % · тёмная материя 27 % · обычное вещество 5 %' },
  { id: 'c.uni.photon_ratio', level: 8, label: 'Фотонов на один атом во Вселенной', unit: '', tag: 'ТОЧНО', source: 'η⁻¹, Planck 2018', explain: 'На каждый твой атом во Вселенной приходится полтора миллиарда реликтовых фотонов.', compute: () => sci(1.6e9) },
  { id: 'c.uni.neutrinos', level: 8, label: 'Реликтовых нейтрино внутри тебя', unit: '', tag: 'ОЦЕНКА', source: '336/см³ (предсказание ΛCDM, прямо не наблюдены)', explain: 'Как реликтовые фотоны, только их никто ещё не поймал.', compute: (c) => sci(336 * c.massKg * 1000 / 1.01) },
  { id: 'c.uni.first_light', level: 8, label: 'Самый старый свет от звёзд', unit: 'млрд лет', tag: 'ОЦЕНКА', source: 'JWST, z≈14 (JADES-GS-z14-0)', explain: 'Первые галактики светили, когда Вселенной было 300 млн лет.', compute: () => 13.5 },
];

export function levelName(level: number): string { return LEVELS[level]?.name ?? ''; }

// A4 пройдено (test/content-a4.test.ts, 15.09.2026): Horizons, BGS, Planck/FIRAS/Gaia. Только эти могут носить [ТОЧНО].
export const VERIFIED = new Set<string>([
  'c.hor.moon_dist', 'c.hor.moon_phase', 'c.orb.sun_dist', 'c.orb.light', 'c.orb.mars', 'c.orb.speed', 'c.mag.f',
  'c.uni.cmb', 'c.uni.age', 'c.gal.proxima', 'c.hor.day', 'c.hor.noon', 'c.body.g',
  // Проход 3 (16.09) — параметры, попавшие в досье карты рождения: константы сверены с первоисточниками (VERIFICATION.md).
  'c.orb.path', 'c.orb.moon_away', 'c.nuc.decays_life', 'c.cell.heartbeats', 'c.gal.path',
  // Проход 4 (16.09) — формулы пересчитаны вручную, литературные числа сверены с первоисточником (VERIFICATION.md).
  'c.nuc.k40', 'c.atom.count', 'c.atom.iron', 'c.cell.count', 'c.cell.bacteria', 'c.cell.neurons', 'c.cell.dna',
  'c.body.mc2', 'c.body.rs', 'c.body.ir', 'c.hor.dist', 'c.hor.curve', 'c.hor.air',
  'c.mag.pause', 'c.mag.flip', 'c.mag.tilt', 'c.orb.tide', 'c.orb.sun_pull', 'c.gal.bh', 'c.gal.sun_orbits', 'c.gal.year',
  'c.uni.dark', 'c.uni.galaxies', 'c.uni.photon_ratio', 'c.uni.neutrinos',
  // Проход 5 (16.09) — остаток констант и формул; вне списка только 5 параметров, зависящих от точки/Kp пользователя.
  'c.nuc.protons', 'c.nuc.volume', 'c.nuc.mass_in_nuclei', 'c.nuc.binding', 'c.nuc.fusion',
  'c.atom.top3', 'c.atom.stellar', 'c.atom.oldest', 'c.atom.empty', 'c.atom.turnover', 'c.atom.electrons', 'c.atom.line',
  'c.cell.rbc', 'c.cell.atp', 'c.cell.dna_damage', 'c.body.water', 'c.body.gravity', 'c.body.light', 'c.body.co2',
  'c.mag.pole', 'c.mag.wind', 'c.mag.sats', 'c.orb.photon_age', 'c.gal.speed', 'c.gal.visible', 'c.gal.dm',
  'c.uni.h0', 'c.uni.atoms', 'c.uni.first_light',
]);

// Почему слой погас: человек ещё не дал вход (§3.7 — только по действию), а не ошибка.
const NEEDS: Array<[RegExp, string]> = [
  [/^c\.(body\.g|body\.spin|gal\.center|hor\.day|hor\.noon|hor\.polaris|hor\.refraction|mag\.f)$/, 'нужна твоя точка — кнопка «Что происходит с тобой сейчас»'],
  [/^c\.(nuc\.decays_life|cell\.heartbeats|orb\.path|orb\.moon_away|gal\.path|gal\.year)$/, 'нужна дата рождения — поле рядом с «Карта рождения»'],
  [/^c\.mag\.aurora$/, 'ждёт живой Kp'],
];

// Value для карточек и контекста «Спросить». Число → value, факт → text; null — слой гаснет (§3.9).
export function contentValues(ctx: Ctx, level?: number): Value[] {
  const now = Date.now();
  return CONTENT.filter((p) => level == null || p.level === level).map((p) => {
    let out: Out; try { out = p.compute(ctx); } catch { out = null; }
    const need = out == null ? NEEDS.find(([re]) => re.test(p.id))?.[1] : undefined;
    return {
      // Правило реестра (§1.5, §3.8): [ТОЧНО] структурно недоступен до сверки A4 — понижаем до [ОЦЕНКА].
      id: p.id, label: p.label, unit: p.unit, tag: p.tag === 'ТОЧНО' && !VERIFIED.has(p.id) ? 'ОЦЕНКА' : p.tag,
      source: need ?? (VERIFIED.has(p.id) ? `${p.source} · сверено A4` : `${p.source} · не сверено`), explain: p.explain, verifyUrl: p.verifyUrl,
      value: typeof out === 'number' ? out : null, text: typeof out === 'string' ? out : undefined,
      status: out == null ? 'unavailable' : 'ok', verification: VERIFIED.has(p.id) ? 'verified' : 'unverified', computedAt: now,
    };
  });
}
