// Прокси официального Kp (GFZ Potsdam — производитель индекса; у него нет CORS).
// Никаких данных пользователя (§3.7). Кэш на edge 10 мин.
export default async function handler(req, res) {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 3600e3);
  const iso = (d) => d.toISOString().slice(0, 19) + 'Z';
  const url = `https://kp.gfz.de/app/json/?start=${iso(start)}&end=${iso(end)}&index=Kp&status=all`;
  try {
    const d = await (await fetch(url, { headers: { 'User-Agent': 'cosmos-kp-proxy' } })).json();
    const i = d.Kp.length - 1;
    if (i < 0) throw new Error('empty');
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ kp: d.Kp[i], time: d.datetime[i], status: d.status[i], source: 'GFZ Potsdam' });
  } catch (e) {
    res.status(502).json({ error: 'gfz unavailable' });
  }
}
