#!/usr/bin/env python3
"""База мест рождения из GeoNames (CC BY 4.0) → data/places.tsv.gz (вход для scripts/gen-places.mjs).

Источник (скачать в GEO_DIR, по умолчанию ~/work/geo):
  cities500.txt, alternateNamesV2.txt, admin1CodesASCII.txt, admin2Codes.txt, countryInfo.txt,
  cc/{RU,UA,BY,KZ,GE,AM,AZ,UZ,KG,TJ,MD,TM,LV,LT,EE}.txt — все населённые пункты СНГ/Балтии (сёла тоже).
Строка: [name, ru, lat, lon, tz, cc, region, district, pop, aliases]
  aliases — другие русские имена, включая исторические (Ленинград, Свердловск, Алма-Ата…).
Шард = первые 2 буквы любого слова любого имени (fold как в src/data/places.ts); большие шарды
делятся на 3 буквы, а 2-буквенный оставляет топ по населению. Индекс: public/places/index.json.
"""
import json, os, re, sys, unicodedata
from collections import defaultdict

GEO = os.environ.get('GEO_DIR', os.path.expanduser('~/work/geo'))
OUT = os.path.join(os.path.dirname(__file__), '..', 'public')
CIS = ['RU', 'UA', 'BY', 'KZ', 'GE', 'AM', 'AZ', 'UZ', 'KG', 'TJ', 'MD', 'TM', 'LV', 'LT', 'EE']
RU_SPEAK = {'RU', 'UA', 'BY', 'KZ', 'GE', 'AM', 'AZ', 'UZ', 'KG', 'TJ', 'MD', 'TM', 'LV', 'LT', 'EE', 'IL'}
SKIP_CODES = {'PPLX', 'PPLW', 'PPLCH'}
SPLIT_AT = 2500      # строк в шарде, после которых делим на 3 буквы
TOP_KEEP = 400       # сколько крупных оставить в 2-буквенном шарде после деления

CYR = re.compile('[а-яА-ЯёЁ]')
UKR = re.compile('[іїєґІЇЄҐўЎ]')


def fold(s: str) -> str:
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(ch for ch in s if not unicodedata.combining(ch))
    s = re.sub(r"[-‐–—/.,()]", ' ', s)
    s = re.sub(r"[^a-zа-я0-9 ]", '', s)
    return re.sub(r'\s+', ' ', s).strip()


def words(s: str):
    return [w for w in fold(s).split(' ') if w]


# --- 1. Места ------------------------------------------------------------------
places = {}  # gid -> dict


def take(row):
    gid, name, ascii_, alts, lat, lon, fcl, fcode, cc = row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8]
    if fcl != 'P' or fcode in SKIP_CODES:
        return
    tz = row[17]
    if not tz:
        return
    places[gid] = dict(name=name, ascii=ascii_, alts=alts, lat=round(float(lat), 3), lon=round(float(lon), 3),
                       cc=cc, a1=row[10], a2=row[11], pop=int(row[14] or 0), tz=tz, code=fcode)


with open(os.path.join(GEO, 'cities500.txt'), encoding='utf-8') as f:
    for line in f:
        take(line.rstrip('\n').split('\t'))
n500 = len(places)
for c in CIS:
    p = os.path.join(GEO, 'cc', c + '.txt')
    with open(p, encoding='utf-8') as f:
        for line in f:
            r = line.rstrip('\n').split('\t')
            if r[0] not in places:
                take(r)
print(f'мест: {len(places)} (cities500 {n500})', file=sys.stderr)

# --- 2. Регионы, районы, страны -------------------------------------------------
a1 = {}; a1gid = {}
with open(os.path.join(GEO, 'admin1CodesASCII.txt'), encoding='utf-8') as f:
    for line in f:
        code, name, _, gid = line.rstrip('\n').split('\t')
        a1[code] = name; a1gid[gid] = code
a2 = {}; a2gid = {}
with open(os.path.join(GEO, 'admin2Codes.txt'), encoding='utf-8') as f:
    for line in f:
        code, name, _, gid = line.rstrip('\n').split('\t')
        a2[code] = name; a2gid[gid] = code
cname = {}; cgid = {}
with open(os.path.join(GEO, 'countryInfo.txt'), encoding='utf-8') as f:
    for line in f:
        if line.startswith('#'):
            continue
        r = line.rstrip('\n').split('\t')
        cname[r[0]] = r[4]; cgid[r[16]] = r[0]

# --- 3. Русские имена из alternateNamesV2 ---------------------------------------
want = set(places) | set(a1gid) | set(a2gid) | set(cgid)
ru = defaultdict(list)  # gid -> [(score, name, historic)]
with open(os.path.join(GEO, 'alternateNamesV2.txt'), encoding='utf-8') as f:
    for line in f:
        r = line.split('\t')
        if r[2] != 'ru' or r[1] not in want:
            continue
        pref, short, coll, hist = r[4] == '1', r[5] == '1', r[6] == '1', r[7].strip() == '1'
        if coll:
            continue
        score = (0 if hist else 4) + (2 if pref else 0) + (1 if not short else 0)
        ru[r[1]].append((score, r[3], hist))


def ru_main(gid):
    lst = sorted((x for x in ru.get(gid, []) if CYR.search(x[1])), key=lambda x: -x[0])
    return lst[0][1] if lst else ''


def ru_aliases(gid, main):
    seen = {fold(main)}; out = []
    for _, n, _h in sorted(ru.get(gid, []), key=lambda x: -x[0]):
        k = fold(n)
        if k and k not in seen and len(out) < 4:
            seen.add(k); out.append(n)
    return out


def short_region(s):
    s = re.sub(r'\bобласть\b', 'обл.', s, flags=re.I)
    s = re.sub(r'\bрайон\b', 'р-н', s, flags=re.I)
    s = re.sub(r'\bавтономный округ\b', 'АО', s, flags=re.I)
    return s


a1ru = {code: short_region(ru_main(g) or a1[code]) for g, code in a1gid.items()}
a2ru = {code: short_region(ru_main(g) or a2[code]) for g, code in a2gid.items()}
cru = {code: (ru_main(g) or cname[code]) for g, code in cgid.items()}
for k, v in {'US': 'США', 'GB': 'Великобритания', 'AE': 'ОАЭ', 'KR': 'Южная Корея', 'KP': 'КНДР', 'CZ': 'Чехия'}.items():
    cru[k] = v

# --- 4. Строки ------------------------------------------------------------------
rows = []
for gid, p in places.items():
    main = ru_main(gid)
    if not main and p['cc'] in RU_SPEAK:
        # кириллица из поля alternatenames страны (без украинских букв)
        for n in p['alts'].split(','):
            if CYR.search(n) and not UKR.search(n):
                main = n; break
    aliases = ru_aliases(gid, main) if main else []
    region = a1ru.get(f"{p['cc']}.{p['a1']}", '')
    district = ''
    if p['pop'] < 50000 and p['a2']:
        district = a2ru.get(f"{p['cc']}.{p['a1']}.{p['a2']}", '')
    rows.append([p['name'], main, p['lat'], p['lon'], p['tz'], p['cc'], region, district, p['pop'], aliases,
                 p['ascii'], p['code']])
rows.sort(key=lambda r: -r[8])

# Советские и прежние имена, которых нет в GeoNames с меткой ru (родились «в Ленинграде», «во Фрунзе»).
OLD = {
    ('Санкт-Петербург', 'RU'): 'Ленинград|Петроград', ('Волгоград', 'RU'): 'Сталинград|Царицын', ('Самара', 'RU'): 'Куйбышев',
    ('Нижний Новгород', 'RU'): 'Горький', ('Екатеринбург', 'RU'): 'Свердловск', ('Тверь', 'RU'): 'Калинин', ('Киров', 'RU'): 'Вятка',
    ('Ижевск', 'RU'): 'Устинов', ('Набережные Челны', 'RU'): 'Брежнев', ('Рыбинск', 'RU'): 'Андропов|Щербаков',
    ('Владикавказ', 'RU'): 'Орджоникидзе|Дзауджикау', ('Пермь', 'RU'): 'Молотов', ('Ульяновск', 'RU'): 'Симбирск',
    ('Йошкар-Ола', 'RU'): 'Краснококшайск', ('Черкесск', 'RU'): 'Баталпашинск', ('Ставрополь', 'RU'): 'Ворошиловск',
    ('Калининград', 'RU'): 'Кёнигсберг', ('Новосибирск', 'RU'): 'Новониколаевск', ('Новокузнецк', 'RU'): 'Сталинск',
    ('Королёв', 'RU'): 'Калининград|Подлипки', ('Тольятти', 'RU'): 'Ставрополь-на-Волге', ('Луганск', 'UA'): 'Ворошиловград',
    ('Днепр', 'UA'): 'Днепропетровск|Екатеринослав', ('Кропивницкий', 'UA'): 'Кировоград|Елисаветград', ('Донецк', 'UA'): 'Сталино|Юзовка',
    ('Мариуполь', 'UA'): 'Жданов', ('Хмельницкий', 'UA'): 'Проскуров', ('Ивано-Франковск', 'UA'): 'Станислав',
    ('Бахмут', 'UA'): 'Артёмовск', ('Каменское', 'UA'): 'Днепродзержинск', ('Краматорск', 'UA'): 'Краматорская',
    ('Бишкек', 'KG'): 'Фрунзе|Пишпек', ('Каракол', 'KG'): 'Пржевальск', ('Алматы', 'KZ'): 'Алма-Ата|Верный',
    ('Астана', 'KZ'): 'Целиноград|Акмолинск|Акмола|Нур-Султан', ('Шымкент', 'KZ'): 'Чимкент', ('Тараз', 'KZ'): 'Джамбул|Аулие-Ата',
    ('Атырау', 'KZ'): 'Гурьев', ('Актау', 'KZ'): 'Шевченко', ('Семей', 'KZ'): 'Семипалатинск', ('Усть-Каменогорск', 'KZ'): 'Оскемен',
    ('Кокшетау', 'KZ'): 'Кокчетав', ('Талдыкорган', 'KZ'): 'Талды-Курган', ('Актобе', 'KZ'): 'Актюбинск', ('Уральск', 'KZ'): 'Орал',
    ('Душанбе', 'TJ'): 'Сталинабад', ('Худжанд', 'TJ'): 'Ленинабад', ('Ашхабад', 'TM'): 'Полторацк', ('Туркменбашы', 'TM'): 'Красноводск|Туркменбаши',
    ('Гюмри', 'AM'): 'Ленинакан|Александрополь', ('Ванадзор', 'AM'): 'Кировакан', ('Гянджа', 'AZ'): 'Кировабад|Елизаветполь',
    ('Тбилиси', 'GE'): 'Тифлис', ('Озургети', 'GE'): 'Махарадзе', ('Таллин', 'EE'): 'Ревель', ('Даугавпилс', 'LV'): 'Двинск',
    ('Вильнюс', 'LT'): 'Вильно', ('Каунас', 'LT'): 'Ковно', ('Елгава', 'LV'): 'Митава', ('Кишинёв', 'MD'): 'Кишинев',
}
done = set()
for r in rows:  # по убыванию населения: имя получает крупнейший одноимённый город страны
    k = (r[1], r[5])
    if k in OLD and k not in done:
        done.add(k)
        for a in OLD[k].split('|'):
            if fold(a) not in {fold(x) for x in [r[1], *r[9]]}:
                r[9].append(a)
miss = sorted(set(OLD) - done)
if miss:
    print('нет в базе для старых имён:', miss, file=sys.stderr)

# --- 5. Выход: data/places.tsv.gz (каждое место один раз); шарды и ядро строит scripts/gen-places.mjs
import gzip
dst = os.path.join(os.path.dirname(__file__), '..', 'data', 'places.tsv.gz')
os.makedirs(os.path.dirname(dst), exist_ok=True)
clean = lambda x: str(x).replace('\t', ' ').replace('\n', ' ')
with gzip.open(dst, 'wt', encoding='utf-8', compresslevel=9) as f:
    f.write('#' + json.dumps(cru, ensure_ascii=False, separators=(',', ':')) + '\n')
    for r in rows:
        name, main, lat, lon, tz, cc, region, district, pop, aliases, ascii_, code = r
        f.write('\t'.join(map(clean, [name, main, lat, lon, tz, cc, region, district, pop or '', '|'.join(aliases),
                                         ascii_ if ascii_ != name else '', 'C' if code == 'PPLC' else ''])) + '\n')
print(f'{dst}: {os.path.getsize(dst)/1e6:.1f} МБ, строк {len(rows)}', file=sys.stderr)
