import { describe, it, expect } from 'vitest';
import { natalPage, urlFor, slug } from '../src/natal/page';

describe('натальная страница (программатик §5.3)', () => {
  it('slug и URL по языку', () => {
    expect(slug(3, 9)).toBe('03-09');
    expect(urlFor('ru', 3, 9)).toBe('/natalnaya-karta/03-09/');
    expect(urlFor('en', 3, 9)).toBe('/en/natal-chart/03-09/');
  });

  it('03.09 честно: знак Дева, реальное созвездие Лев (контр-астрология)', () => {
    const html = natalPage(9, 3, 'ru');
    expect(html).toMatch(/знак Дева, а созвездие Лев/);
    expect(html).toMatch(/Реальное созвездие Солнца: <b>Лев<\/b>/);
  });

  it('EN-версия, та же дата: Virgo vs Leo', () => {
    expect(natalPage(9, 3, 'en')).toMatch(/sign Virgo, but constellation Leo/);
  });

  it('§3.7: страница знает только дату — ни координат, ни времени рождения', () => {
    const html = natalPage(9, 3, 'ru');
    expect(html).not.toMatch(/широт|долгот|latitude|longitude/i);
    expect(html).toMatch(/Твои координаты и время рождения никуда не уходят/);
  });

  it('обязательные SEO-теги: canonical, hreflang-пара, JSON-LD', () => {
    const html = natalPage(9, 3, 'ru');
    expect(html).toMatch(/<link rel="canonical" href="https:\/\/[^"]+\/natalnaya-karta\/09-03\/">/);
    expect(html).toMatch(/hreflang="en" href="[^"]+\/en\/natal-chart\/09-03\/"/);
    expect(html).toMatch(/application\/ld\+json/);
  });
});
