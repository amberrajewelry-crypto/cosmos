import type { Computed } from '../types';

// Мок-режим: сцена собирается без сети (§3.11). live/ никогда не бросает наружу (§3.2) —
// при ошибке value становится null (слой гаснет), исключение наверх не уходит.
export async function mockKp(): Promise<Computed> {
  return { id: 'live.kp', value: 3, source: 'mock:kp', computedAt: Date.now() };
}
