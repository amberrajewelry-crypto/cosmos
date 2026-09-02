import { Observer, Equator, Constellation, SunPosition, Body } from 'astronomy-engine';
import type { Computed } from '../types';

// Контр-астрология (§2.3 #11): в каком созвездии Солнце НА САМОМ ДЕЛЕ vs что говорит знак зодиака.
// Знак = эклиптическая долгота / 30° (тропический зодиак от точки весны).
// Созвездие = реальные границы IAU (Constellation ждёт J2000).
const SIGNS = ['Овен','Телец','Близнецы','Рак','Лев','Дева','Весы','Скорпион','Стрелец','Козерог','Водолей','Рыбы'];

const CONST_RU: Record<string, string> = {
  Aries:'Овен', Taurus:'Телец', Gemini:'Близнецы', Cancer:'Рак', Leo:'Лев', Virgo:'Дева',
  Libra:'Весы', Scorpius:'Скорпион', Ophiuchus:'Змееносец', Sagittarius:'Стрелец',
  Capricornus:'Козерог', Aquarius:'Водолей', Pisces:'Рыбы',
};

export function constellationVsSign(when: Date): Computed {
  const elon = SunPosition(when).elon;                 // эклиптическая долгота Солнца
  const sign = SIGNS[Math.floor(((elon % 360) + 360) % 360 / 30) % 12];

  const obs = new Observer(0, 0, 0);
  const eq = Equator(Body.Sun, when, obs, false, false); // J2000 для Constellation
  const cName = Constellation(eq.ra, eq.dec).name;
  const cRu = CONST_RU[cName] ?? cName;

  const text = cRu === sign
    ? `Солнце в созвездии «${cRu}» — совпадает со знаком.`
    : `Солнце сейчас в созвездии «${cRu}», а знак зодиака говорит «${sign}».`;
  return { id: 'sky.sun.constellation', value: null, source: 'astronomy-engine (границы IAU)', computedAt: Date.now(), text };
}
