// IndexNow (Yandex + Bing + Seznam через один эндпоинт): отправить все URL сайтмапа.
import { readFileSync, readdirSync } from 'node:fs';
const SITE = 'https://cosmos-alpha-three.vercel.app';
const key = readdirSync('public').find((f) => /^[0-9a-f]{32}\.txt$/.test(f)).replace('.txt', '');
const urls = [...readFileSync('public/sitemap-natal.xml', 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
for (let i = 0; i < urls.length; i += 500) {
  const r = await fetch('https://yandex.com/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host: new URL(SITE).host, key, keyLocation: `${SITE}/${key}.txt`, urlList: urls.slice(i, i + 500) }) });
  console.log('indexnow', i, r.status);
}
