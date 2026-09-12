import type { Computed } from '../types';

// §2.3 #12: свет какой звезды, видимой сейчас, вышел в год твоего рождения.
// Расстояния — параллаксы Hipparcos/Gaia (±несколько %), поэтому это [ОЦЕНКА], не [ТОЧНО].
// Только яркие звёзды ≤ 120 св. лет: их видно глазом.
const STARS: Array<[string, number]> = [ // [имя, расстояние, св. лет]
  ['Сириус', 8.6], ['Процион', 11.5], ['Альтаир', 16.7], ['Фомальгаут', 25.1],
  ['Вега', 25.0], ['Поллукс', 33.8], ['Арктур', 36.7], ['Капелла', 42.9],
  ['Кастор', 51.6], ['Альдебаран', 65.3], ['Регул', 79.3], ['Альгиеба', 130],
  ['Денебола', 36], ['Альферац', 97], ['Мирфак', 510], ['Ахернар', 139],
  ['Спика', 250], ['Антарес', 550], ['Бетельгейзе', 548], ['Ригель', 860],
];

export function birthLightStar(birth: Date, now: Date = new Date()): Computed {
  const ageYears = (now.getTime() - birth.getTime()) / (365.25 * 86_400_000);
  const [name, dist] = STARS.reduce((best, s) =>
    Math.abs(s[1] - ageYears) < Math.abs(best[1] - ageYears) ? s : best);
  const delta = Math.round(dist - ageYears);
  const when = delta === 0 ? 'в год твоего рождения'
    : delta > 0 ? `за ${delta} ${plural(delta)} до твоего рождения`
    : `когда тебе было ${-delta} ${plural(-delta)}`;
  return {
    id: 'stars.birthlight', value: Math.round(dist * 10) / 10, source: 'Hipparcos/Gaia параллакс',
    computedAt: now.getTime(),
    text: `${name}: свет, который ты видишь сегодня, вышел ${when}.`,
  };
}

function plural(n: number): string {
  const m = n % 10, h = n % 100;
  if (m === 1 && h !== 11) return 'год';
  if (m >= 2 && m <= 4 && (h < 12 || h > 14)) return 'года';
  return 'лет';
}
