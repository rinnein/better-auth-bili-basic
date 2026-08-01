import { describe, expect, it, vi } from 'vitest';
import { RevokeBiliInfo, ValidateBiliInfo } from './validate-bili-info.ts';

vi.mock('./bili-info.ts', () => ({
  BiliInfo: vi.fn(async () => ({
    data: {
      card: {
        mid: '1001',
        name: 'Bili Test User',
        spacesta: 0,
        fans: 0,
        sign: 'ordinary sign',
        level_info: { current_level: 1 },
        vip: { type: 0 },
      },
    },
  })),
}));

describe('Bili validation bypass', () => {
  it('does not bypass sign verification by changing authMark', async () => {
    const result = await ValidateBiliInfo(1001n, undefined, undefined, 'dev');

    expect(result.success).toBe(false);
  });

  it('requires an explicit bypass flag', async () => {
    const result = await ValidateBiliInfo(
      1001n,
      undefined,
      undefined,
      'bauth',
      true,
    );
    const revoke = await RevokeBiliInfo(1001n, 'bauth', true);

    expect(result.success).toBe(true);
    expect(revoke.success).toBe(true);
  });
});
