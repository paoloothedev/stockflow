import { describe, expect, it } from 'vitest';
import { money } from './format';

describe('money', () => {
  it('formats numbers and strings', () => {
    expect(money(1850)).toBe('1,850 EGP');
    expect(money('99.5')).toBe('99.5 EGP');
  });
});
