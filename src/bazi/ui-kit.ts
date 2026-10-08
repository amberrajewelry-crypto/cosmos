/** Общие помощники экрана /bazi: экранирование, простой язык (lay/plain/soften), картинки животных. Вынесено из ui.ts. */
import { placeLabel, type Place } from '../data/places';
import {
   BRANCHES, EL_RGB, EL_COLOR,
} from './core';
import {
   type Chart, type Analysis,
} from './calc';
import { luckReading } from './interp';
import { periodVerdict } from './brain';

export const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
export const AMOUNT = (x: number) => (x >= 0.3 ? 'много' : x >= 0.15 ? 'в меру' : x >= 0.06 ? 'мало' : 'почти нет');
// Посетителю — без иероглифов и ссылок на трактаты: убираем скобки/кавычки с китайским и одиночные знаки.
export const plain = (s: string) => s.replace(/\s*[(«「][^()«»「」]*[\u4e00-\u9fff][^()«»「」]*[)»」]/g, '').replace(/\s*[\u4e00-\u9fff]+/g, '').replace(/\s*\((?:ДТС|ЦПЦЦ|ЮХ|СМ|ШФ|ЦЛ|МЛЮЯ|ЦТБЦ|KB)[^)]*\)/g, '').replace(/(?<![А-Яа-яё])[Пп]о (?:ДТС|ЦПЦЦ|ЮХ|СМ|ШФ|ЦЛ)(?![А-Яа-яё])/g, (m) => m[0] + 'о классике').replace(/\s*\(\s*[,;·]?\s*\)/g, '').replace(/\s*\([^()]*\d+\s?%[^()]*\)/g, '').replace(/\s*\([+−-]?\d+\)/g, '').replace(/,?\s*[—-]?\s*\d+\s?%/g, '').replace(/\(\s*—\s*/g, '(').replace(/\s*—\s*(?=[.,;:)]|$)/g, '').replace(/\s+([.,;:])/g, '$1').replace(/:([.;])/g, '$1').replace(/(?<!\.)\.\.(?!\.)/g, '.');
// Классические имена богов звучат пугающе — на странице мягкие («Давление», «Соперник», «Бунтарь»).
export const RANG: Record<string, string> = { 'ий': 'Бунтарь', 'его': 'Бунтаря', 'ему': 'Бунтарю', 'им': 'Бунтарём' };
export const UBI: Record<string, string> = { 'о': 'Давление', 'а': 'Давления', 'у': 'Давлению', 'ом': 'Давлением' };
export const soften = (s: string) => s.replace(/Семь убийств/g, 'Давление').replace(/Грабител[а-я]* богатства/g, 'Соперник')
  .replace(/Ранящ(ий|его|ему|им)( чиновника)?/g, (_, e: string) => RANG[e]).replace(/Убийств(ом|о|а|у)/g, (_, e: string) => UBI[e]);
export const esc = (s: string) => plain(soften(s)).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
export const rgb = (e: number) => EL_RGB[e];
export const pol = (yang: boolean) => (yang ? 'ян' : 'инь');
export const lbl = (p: Place) => (p.cc ? placeLabel(p) : p.ru);
export const ANIMAL = ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig'];
export const IMGS = import.meta.glob('./img/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const animalSrc = (b: number) => IMGS[`./img/${ANIMAL[b]}.webp`];
// 160 px копии (≈14 КБ против ≈55 КБ) — для круга, иконок, клеток дней; большие — только в столпах карты
export const IMGS_S = import.meta.glob('./img-s/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const animalSm = (b: number) => IMGS_S[`./img-s/${ANIMAL[b]}.webp`];


export const ME_KEY = 'bazi-me';

/** Основной поток — без кухни расчёта: имена божеств в кавычках, ветви, такты, пустота, союзы, трактаты. */
export const lay = (s: string) => s.replace(/«[^»]*»\s*—\s*/g, '').split(/(?<=[.;])\s+/).filter((x) => !/ветв|пуст|союз|такт|трактат/i.test(x)).join(' ').replace(/[.;,]\s*$/, '');
export const animalOf = (idx: number) => `<span style="color:${EL_COLOR[BRANCHES[idx % 12].el]}">${BRANCHES[idx % 12].animal}</span>`;
/** Тон периода — тот же, что в прогнозе и раскладе (periodVerdict мозга), текст — luckReading. */
export const luckR = (c: Chart, a: Analysis, idx: number) => { const t = periodVerdict(a.brain, idx, c).tone; return { ...luckReading(a, idx, t), t4: t }; };
export const thumb = (b: number, size = 44) => `<img class="thumb" src="${animalSm(b)}" alt="${BRANCHES[b].animal}" width="${size}" height="${size}" loading="lazy" />`;
