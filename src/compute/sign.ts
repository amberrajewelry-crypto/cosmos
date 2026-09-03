import { Observer, Equator, Constellation, SunPosition, Body } from 'astronomy-engine';
import type { Computed } from '../types';

// Контр-астрология (§2.3 #11): в каком созвездии Солнце НА САМОМ ДЕЛЕ vs что говорит знак зодиака.
// Знак = эклиптическая долгота / 30° (тропический зодиак от точки весны).
// Созвездие = реальные границы IAU (Constellation ждёт J2000).
// Ядро языконезависимое (индекс знака + латинское имя созвездия); локализация — в вызывающем коде.

// Латинские имена зодиакальных созвездий по индексу знака — для сверки «знак == созвездие».
const ZODIAC_LATIN = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpius','Sagittarius','Capricornus','Aquarius','Pisces'];

export const SIGNS_RU = ['Овен','Телец','Близнецы','Рак','Лев','Дева','Весы','Скорпион','Стрелец','Козерог','Водолей','Рыбы'];
export const SIGNS_EN = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

export const CONST_RU: Record<string, string> = {
  Aries:'Овен', Taurus:'Телец', Gemini:'Близнецы', Cancer:'Рак', Leo:'Лев', Virgo:'Дева',
  Libra:'Весы', Scorpius:'Скорпион', Ophiuchus:'Змееносец', Sagittarius:'Стрелец',
  Capricornus:'Козерог', Aquarius:'Водолей', Pisces:'Рыбы',
};
export const CONST_EN: Record<string, string> = {
  Aries:'Aries', Taurus:'Taurus', Gemini:'Gemini', Cancer:'Cancer', Leo:'Leo', Virgo:'Virgo',
  Libra:'Libra', Scorpius:'Scorpius', Ophiuchus:'Ophiuchus', Sagittarius:'Sagittarius',
  Capricornus:'Capricornus', Aquarius:'Aquarius', Pisces:'Pisces',
};

export interface SignFacts { sunLon: number; signIndex: number; constellationLatin: string; matches: boolean; }

// Структурный факт «знак vs созвездие» — переиспользуется в UI и в программатике натальных страниц.
export function sunSignAndConstellation(when: Date): SignFacts {
  const sunLon = ((SunPosition(when).elon % 360) + 360) % 360;
  const signIndex = Math.floor(sunLon / 30) % 12;

  const obs = new Observer(0, 0, 0);
  const eq = Equator(Body.Sun, when, obs, false, false);         // J2000 для Constellation
  const constellationLatin = Constellation(eq.ra, eq.dec).name;

  return { sunLon, signIndex, constellationLatin, matches: ZODIAC_LATIN[signIndex] === constellationLatin };
}

export function constellationVsSign(when: Date): Computed {
  const { signIndex, constellationLatin, matches } = sunSignAndConstellation(when);
  const sign = SIGNS_RU[signIndex];
  const constellation = CONST_RU[constellationLatin] ?? constellationLatin;
  const text = matches
    ? `Солнце в созвездии «${constellation}» — совпадает со знаком.`
    : `Солнце сейчас в созвездии «${constellation}», а знак зодиака говорит «${sign}».`;
  return { id: 'sky.sun.constellation', value: null, source: 'astronomy-engine (границы IAU)', computedAt: Date.now(), text };
}
