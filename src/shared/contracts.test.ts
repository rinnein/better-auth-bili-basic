import { describe, expect, it } from 'vitest';
import { identifierSchema, midToString, parseIdentifier } from './contracts.ts';

describe('shared contracts', () => {
  it('normalizes supported mid inputs', () => {
    expect(midToString(123456)).toBe('123456');
    expect(midToString(123456n)).toBe('123456');
    expect(midToString('123456')).toBe('123456');
  });

  it('rejects unsafe numeric mids', () => {
    expect(() => midToString(Number.MAX_SAFE_INTEGER + 1)).toThrow();
    expect(() => midToString(-1)).toThrow();
  });

  it('validates and parses challenge identifiers', () => {
    const identifier = 'bili-basic:bind:12345678:AbCdEfGhIjKlMnOpQrStU';
    expect(identifierSchema.safeParse(identifier).success).toBe(true);
    expect(parseIdentifier(identifier)).toBe(identifier);
    expect(
      identifierSchema.safeParse('bili-basic:other:12345678:test').success,
    ).toBe(false);
  });
});
