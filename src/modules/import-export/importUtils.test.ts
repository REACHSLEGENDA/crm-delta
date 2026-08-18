import { describe, expect, it } from 'vitest';
import { parseDepositAmount } from './importUtils';

describe('parseDepositAmount', () => {
  it.each([
    [5000, 5000],
    ['$5,000', 5000],
    ['5,000.50', 5000.5],
    ['5.000,50', 5000.5],
    ['USD 1250', 1250],
  ])('normalizes %p as %p', (input, expected) => {
    expect(parseDepositAmount(input)).toBe(expected);
  });

  it.each(['', '0', '-100', 'sin monto', null, undefined])(
    'rejects empty, zero, negative, or invalid values (%p)',
    (input) => {
      expect(parseDepositAmount(input)).toBeNull();
    },
  );
});
