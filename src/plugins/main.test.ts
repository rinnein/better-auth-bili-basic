import { describe, expect, it } from 'vitest';
import { biliBasic } from './main.ts';

describe('biliBasic plugin', () => {
  it('defaults user deletion to enabled for Bili-only sign-up', () => {
    const plugin = biliBasic({
      signUpOnVerification: { enabled: true },
    });

    expect(plugin.options?.signUpOnVerification).toMatchObject({
      enabled: true,
      deleteUserOnRevoke: true,
    });
    expect(plugin.options?.skipCodeValidation).toBe(false);
  });

  it('requires an explicit development bypass', () => {
    const plugin = biliBasic({ skipCodeValidation: true });

    expect(plugin.options?.skipCodeValidation).toBe(true);
    expect(() => biliBasic({ authMark: '' })).toThrow();
  });

  it('registers the expected endpoint paths', () => {
    const plugin = biliBasic();

    expect(Object.keys(plugin.endpoints ?? {})).toEqual([
      'send',
      'link',
      'signIn',
      'signUp',
      'revoke',
    ]);
  });
});
