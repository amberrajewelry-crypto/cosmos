import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// SSG 12 тестовых страниц эксперимента + 3 служебных (см. src/pages/experiment.ts) + sitemap-pages.xml.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://astropro.tech';
const vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { pages, renderPage, pageUrl } = await vite.ssrLoadModule('/src/pages/experiment.ts');

const urls = [];
for (const p of pages) {
  const url = pageUrl(p);
  const out = resolve(ROOT, 'public', url.replace(/^\//, ''), 'index.html');
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, renderPage(p), 'utf8');
  urls.push([url, p.dateModified]);
}
// главные приложения сайта — первыми в карте сайта
const today = new Date().toISOString().slice(0, 10);
urls.unshift(['/bazi/', today], ['/karta/', today]);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, d]) => `  <url><loc>${SITE}${u}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}</url>`).join('\n')}
</urlset>`;
await writeFile(resolve(ROOT, 'public', 'sitemap-pages.xml'), sitemap, 'utf8');
await vite.close();
console.log(`Сгенерировано ${urls.length} страниц + sitemap-pages.xml`);
