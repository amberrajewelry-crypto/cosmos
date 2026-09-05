import { describe, it, expect } from 'vitest';
import { natalPage, urlFor, slug, signPage, signUrl, ophiuchusPage, ophiuchusUrl } from '../src/natal/page';
import type { SignDay } from '../src/natal/page';

describe('натальная страница (программатик §5.3)', () => {
  it('slug и URL по языку', () => {
    expect(slug(3, 9)).toBe('03-09');
    expect(urlFor('ru', 3, 9)).toBe('/natalnaya-karta/03-09/');
    expect(urlFor('en', 3, 9)).toBe('/en/natal-chart/03-09/');
  });

  it('03.09 честно: гороскоп Дева, реальный знак Лев — позиционирование «настоящая астрология»', () => {
    const html = natalPage(9, 3, 'ru');
    expect(html).toMatch(/настоящ/i);
    expect(html).toMatch(/Твой реальный знак \(созвездие Солнца\): <b>Лев<\/b>/);
    expect(html).toMatch(/Знак по гороскопу \(тропический\): <b>Дева<\/b>/);
    expect(html).not.toMatch(/без астрологии|вр[её]т/i); // не бьём по интенту
  });

  it('EN-версия, та же дата: гороскоп Virgo, настоящий знак Leo', () => {
    const html = natalPage(9, 3, 'en');
    expect(html).toMatch(/your true sign Leo|true sign.*Leo/i);
    expect(html).toMatch(/sidereal/i);
  });

  it('§3.7: страница знает только дату — ни координат, ни времени рождения', () => {
    const html = natalPage(9, 3, 'ru');
    expect(html).not.toMatch(/широт|долгот|latitude|longitude/i);
    expect(html).toMatch(/Твои координаты и время рождения никуда не уходят/);
  });

  it('FAQ уникален для даты + FAQPage-схема (против thin-content)', () => {
    const html = natalPage(9, 3, 'ru');
    expect(html).toMatch(/Какой мой настоящий знак, если я родился 3 сентября/);
    expect(html).toMatch(/"@type":"FAQPage"/);
  });

  it('Змееносец-вопрос только на датах созвездия Змееносец', () => {
    expect(natalPage(12, 5, 'ru')).toMatch(/Змееносец — правда 13-й знак/); // 5 дек = Змееносец
    expect(natalPage(9, 3, 'ru')).not.toMatch(/13-й знак/);                  // 3 сен = Лев, без вопроса
  });

  it('обязательные SEO-теги: canonical, hreflang-пара, JSON-LD', () => {
    const html = natalPage(9, 3, 'ru');
    expect(html).toMatch(/<link rel="canonical" href="https:\/\/[^"]+\/natalnaya-karta\/09-03\/">/);
    expect(html).toMatch(/hreflang="en" href="[^"]+\/en\/natal-chart\/09-03\/"/);
    expect(html).toMatch(/application\/ld\+json/);
  });
});

describe('страница знака (long-tail)', () => {
  it('signUrl по языку', () => {
    expect(signUrl('ru', 5)).toBe('/natalnaya-karta/znak/deva/');
    expect(signUrl('en', 5)).toBe('/en/natal-chart/sign/virgo/');
  });

  it('Козерог: период читается Дек→Янв, а не «1 января — 31 декабря»', () => {
    // Козерог (индекс 9): вход Jan 1-19 + Dec 22-31 — эмулируем неотсортированный порядок Янв→Дек.
    const entries: SignDay[] = [
      { month: 1, day: 1, constellationLatin: 'Sagittarius' },
      { month: 1, day: 19, constellationLatin: 'Sagittarius' },
      { month: 12, day: 22, constellationLatin: 'Sagittarius' },
      { month: 12, day: 31, constellationLatin: 'Sagittarius' },
    ];
    const html = signPage(9, 'ru', entries);
    expect(html).toMatch(/22 декабря — 19 января/);
    expect(html).not.toMatch(/1 января — 31 декабря/);
  });

  it('честно называет реальное созвездие вместо знака', () => {
    const entries: SignDay[] = [{ month: 9, day: 3, constellationLatin: 'Leo' }];
    const html = signPage(5, 'ru', entries); // знак Дева, созвездие Лев
    expect(html).toMatch(/Лев/);
    expect(html).toMatch(/Знак Дева/);
  });
});

describe('хаб Змееносца (13-й знак, пивот на живой suggest-кластер)', () => {
  // Реальные даты: конец ноября — середина декабря (порядок специально перемешан).
  const oph: SignDay[] = [
    { month: 12, day: 5, constellationLatin: 'Ophiuchus' },
    { month: 11, day: 30, constellationLatin: 'Ophiuchus' },
    { month: 12, day: 17, constellationLatin: 'Ophiuchus' },
  ];

  it('ophiuchusUrl по языку', () => {
    expect(ophiuchusUrl('ru')).toBe('/natalnaya-karta/zmeenosec/');
    expect(ophiuchusUrl('en')).toBe('/en/natal-chart/ophiuchus/');
  });

  it('span берётся из min/max дат (отвечает «с какого по какое число»), не из порядка массива', () => {
    const html = ophiuchusPage('ru', oph);
    expect(html).toMatch(/30 ноября<\/b> по <b>17 декабря/); // первый=мин, последний=макс
  });

  it('отвечает на suggest-кластер: 13-й знак, даты, созвездие, гороскоп + FAQPage', () => {
    const html = ophiuchusPage('ru', oph);
    expect(html).toMatch(/13-й знак/);
    expect(html).toMatch(/С какого по какое число/i);
    expect(html).toMatch(/созвездие/i);
    expect(html).toMatch(/гороскоп/i);
    expect(html).toMatch(/"@type":"FAQPage"/);
    expect(html).toMatch(/canonical" href="https:\/\/[^"]+\/natalnaya-karta\/zmeenosec\/"/);
  });

  it('EN-хаб: Ophiuchus, 13th sign, hreflang-пара на RU', () => {
    const html = ophiuchusPage('en', oph);
    expect(html).toMatch(/13th (zodiac )?sign/i);
    expect(html).toMatch(/hreflang="ru" href="[^"]+\/natalnaya-karta\/zmeenosec\/"/);
  });
});
