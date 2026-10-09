import { readFile, writeFile } from 'node:fs/promises';
// karta.html = шаблон + <style> главной (тот же CSS натала/навигации; на главной он инлайн намеренно — LCP).
const index = await readFile('index.html', 'utf8');
const style = index.match(/<style>[\s\S]*?<\/style>/)[0];
const tpl = await readFile('src/karta.template.html', 'utf8');
await writeFile('karta.html', tpl.replace('<!--STYLE-->', style), 'utf8');
console.log('karta.html собран');
