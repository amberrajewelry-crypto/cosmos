import { describe, it, expect } from 'vitest';
import { pushMessage } from '../src/bazi/pushmsg';

describe('утренняя карточка дня (push)', () => {
  const q = { d: '1991-11-10', t: '00:37', p: '42.27,42.70,Asia/Tbilisi,Kutaisi', g: 'm' };
  it('даёт заголовок с оценкой, текст без имён божеств и ссылку на «Мои дни»', () => {
    const m = pushMessage(q, 'Asia/Tbilisi', new Date('2026-10-09T05:00:00Z'))!;
    expect(m.title).toMatch(/^Ваш день: .+, [1-5] из 5$/);
    expect(m.body).toMatch(/^Что делать: /);
    expect(m.body).not.toMatch(/«/);
    expect(m.url).toMatch(/^\/bazi\/\?d=1991-11-10.*#s-days$/);
  });
  it('плохие данные — null', () => {
    expect(pushMessage({ d: 'x' }, 'Asia/Tbilisi')).toBeNull();
    expect(pushMessage({ ...q, p: '1,2,Not/AZone,x' }, 'Asia/Tbilisi')).toBeNull();
  });
});

import { okEndpoint } from '../scripts/push-fn';
describe('подписка: только сервисы пушей', () => {
  it('пропускает FCM/Mozilla/Apple/Windows, режет остальное', () => {
    for (const ok of ['https://fcm.googleapis.com/fcm/send/abc', 'https://updates.push.services.mozilla.com/wpush/v2/x', 'https://web.push.apple.com/Q', 'https://db5p.notify.windows.com/w/?token=1'])
      expect(okEndpoint(ok)).toBe(true);
    for (const bad of ['http://fcm.googleapis.com/x', 'https://127.0.0.1/x', 'https://fcm.googleapis.com.evil.io/x', 'https://fcm.googleapis.com:8443/x', 'https://localhost/x', 'x'])
      expect(okEndpoint(bad)).toBe(false);
  });
});
