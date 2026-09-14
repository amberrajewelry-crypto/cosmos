import { neboPage, neboSitemapIndex, neboSitemapYear, NEBO_YEARS } from '../src/natal/page';

// /nebo/{YYYY-MM-DD}/ и /en/sky/{дата}/ (§5.3) + sitemap-nebo*.xml. Прошлое небо не меняется — кэш на год.
interface Req { query: Record<string, string | string[] | undefined>; }
interface Res { setHeader(k: string, v: string): Res; status(n: number): Res; send(b: string): void; }
export default function handler(req: Req, res: Res): void {
  const q = req.query as Record<string, string>;
  res.setHeader('Cache-Control', 'public, s-maxage=31536000, stale-while-revalidate=86400');
  if (q.sitemap === 'index') { res.setHeader('Content-Type', 'application/xml'); res.send(neboSitemapIndex()); return; }
  if (q.sitemap) {
    const y = Number(q.sitemap);
    if (y < NEBO_YEARS[0] || y > NEBO_YEARS[1]) { res.status(404).send('no'); return; }
    res.setHeader('Content-Type', 'application/xml'); res.send(neboSitemapYear(y)); return;
  }
  const iso = q.date ?? '';
  const y = Number(iso.slice(0, 4));
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(iso) && y >= NEBO_YEARS[0] && y <= NEBO_YEARS[1]
    && new Date(`${iso}T12:00:00Z`).toISOString().slice(0, 10) === iso;
  if (!valid) { res.status(404).setHeader('Cache-Control', 'no-store'); res.send('not found'); return; }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(neboPage(iso, q.lang === 'en' ? 'en' : 'ru'));
}
