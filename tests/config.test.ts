import { describe, expect, it } from 'vitest';
import { validateConfig } from '../src/config/env';

const valid = {
  PASS_PERCENTAGE: '40',
  ACADEMIC_YEAR: '2026-27',
};

describe('validateConfig', () => {
  it('names a missing PASS_PERCENTAGE', () => {
    expect(() => validateConfig({ ACADEMIC_YEAR: '2026-27' })).toThrow(/PASS_PERCENTAGE is required but missing/);
    expect(() => validateConfig({ ...valid, PASS_PERCENTAGE: '' })).toThrow(/PASS_PERCENTAGE is required but missing/);
  });

  it('rejects a PASS_PERCENTAGE that is not a number in range', () => {
    expect(() => validateConfig({ ...valid, PASS_PERCENTAGE: 'abc' })).toThrow(
      /PASS_PERCENTAGE must be a number from 0 to 100 \(received "abc"\)/,
    );
    expect(() => validateConfig({ ...valid, PASS_PERCENTAGE: '150' })).toThrow(
      /PASS_PERCENTAGE must be a number from 0 to 100 \(received "150"\)/,
    );
  });

  it('rejects a malformed ACADEMIC_YEAR', () => {
    expect(() => validateConfig({ ...valid, ACADEMIC_YEAR: '26-27' })).toThrow(
      /ACADEMIC_YEAR must use YYYY-YY \(received "26-27"\)/,
    );
    expect(() => validateConfig({ ...valid, ACADEMIC_YEAR: '2026-28' })).toThrow(
      /ACADEMIC_YEAR: second year must follow the first \(received "2026-28"\)/,
    );
  });

  it('parses PASS_PERCENTAGE "33.5" as the number 33.5', () => {
    const config = validateConfig({ ...valid, PASS_PERCENTAGE: '33.5' });
    expect(config.PASS_PERCENTAGE).toBe(33.5);
    expect(config.ACADEMIC_YEAR).toBe('2026-27');
  });
});
