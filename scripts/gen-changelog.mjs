import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
// §7.8 публичный changelog из git-истории: что починили. Генерируется на сборке.
let raw = '';
try { raw = execSync('git log --date=short --pretty=format:%ad%x09%s -n 200', { encoding: 'utf8' }); } catch { process.exit(0); } // на Vercel нет .git — используем закоммиченный файл
const log = raw.split('\n').filter(Boolean).map((l) => l.split('\t'));
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const byDate = new Map();
for (const [d, s] of log) { if (!byDate.has(d)) byDate.set(d, []); byDate.get(d).push(s); }
const body = [...byDate].map(([d, items]) => `<h2>${d}</h2><ul>${items.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`).join('');
const html = `<!doctype html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Что изменилось — Космос внутри тебя</title><meta name="description" content="Публичный журнал изменений проекта: что починили, что добавили, по чьей наводке."><link rel="canonical" href="https://cosmos-alpha-three.vercel.app/changelog/"><style>@font-face{font-family:'Geist';font-weight:100 900;font-display:swap;src:url(/fonts/Geistwght.woff2) format('woff2')}@font-face{font-family:'Unbounded';font-weight:200 900;font-display:swap;src:url(/fonts/Unboundedwght.woff2) format('woff2')}body{margin:0;background:radial-gradient(120% 80% at 50% -10%,#1a1340 0%,#0a0820 60%);color:#ece6d3;font:16px/1.6 'Geist',system-ui,sans-serif;-webkit-font-smoothing:antialiased}.wrap{max-width:720px;margin:0 auto;padding:36px 22px 80px}h1{font:300 clamp(26px,3.6vw,40px)/1.12 'Unbounded',sans-serif;text-align:center;letter-spacing:-.02em}h2{font:300 15px 'Unbounded',sans-serif;color:#c9a85c;margin:28px 0 6px}ul{padding-left:18px;margin:0}li{margin:4px 0;color:rgba(236,230,211,.85)}a{color:#c9a85c}p.lede{text-align:center;color:rgba(236,230,211,.68)}</style></head><body><div class="wrap"><p><a href="/">← Космос внутри тебя</a></p><h1>Что изменилось</h1><p class="lede">Журнал из истории коммитов. Ошибка, найденная читателем, попадает сюда с пометкой «по наводке». Сообщить: кнопка «число неверно» на любой карточке.</p>${body}</div></body></html>`;
mkdirSync('public/changelog', { recursive: true });
writeFileSync('public/changelog/index.html', html);
console.log('changelog:', log.length, 'записей');
