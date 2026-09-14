#!/usr/bin/env python3
"""Google Indexing API: по 200 URL в день из sitemap-natal.xml, курсор в .gindex.json."""
import json, os, re, pathlib
from google.oauth2 import service_account
from googleapiclient.discovery import build
ROOT = pathlib.Path(__file__).resolve().parent.parent
STATE = ROOT / '.gindex.json'
urls = re.findall(r'<loc>([^<]+)</loc>', (ROOT / 'public/sitemap-natal.xml').read_text())
pos = json.loads(STATE.read_text())['pos'] if STATE.exists() else 200  # 200 отправлены вручную 14.09
if pos >= len(urls): raise SystemExit('done')
cr = service_account.Credentials.from_service_account_file(os.path.expanduser('~/sakhva-travel/service-account.json'), scopes=['https://www.googleapis.com/auth/indexing'])
s = build('indexing', 'v3', credentials=cr)
ok = 0
for u in urls[pos:pos + 200]:
    try: s.urlNotifications().publish(body={'url': u, 'type': 'URL_UPDATED'}).execute(); ok += 1
    except Exception as e: print('err', u, str(e)[:80]); break
STATE.write_text(json.dumps({'pos': pos + ok}))
print('sent', ok, 'next', pos + ok, '/', len(urls))
