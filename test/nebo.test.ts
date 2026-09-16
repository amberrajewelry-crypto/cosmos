import { describe, it, expect } from 'vitest';
import { neboPage, neboSitemapIndex, neboSitemapYear } from '../src/natal/page';

describe('/nebo/{дата}', () => {
  it('14.09.2001: Солнце в созвездии Льва, гороскоп «Дева», 7 тел, Луна', () => {
    const h = neboPage('2001-09-14', 'ru');
    expect(h).toContain('созвездии <b>Лев</b>');
    expect(h).toContain('«Дева»');
    expect((h.match(/<li>/g) ?? []).length).toBe(8 + 7); // 7 тел + Луна; + 7 пунктов досье дня (с APOD)
    expect(h).toContain("Досье дня по реальным данным"); expect(h).toContain("ap010914.html");
    expect(h).toContain('/nebo/2001-09-13/');
    expect(h).toContain('href="/?birth=2001-09-14"');
  });
  it('en: canonical /en/sky/', () => {
    expect(neboPage('1969-07-20', 'en')).toContain('<link rel="canonical" href="https://cosmos-alpha-three.vercel.app/en/sky/1969-07-20/">');
  });
  it('sitemap: 101 год в индексе, 366×2 URL за 2024', () => {
    expect((neboSitemapIndex().match(/<sitemap>/g) ?? []).length).toBe(101);
    expect((neboSitemapYear(2024).match(/<url>/g) ?? []).length).toBe(732);
  });
});
