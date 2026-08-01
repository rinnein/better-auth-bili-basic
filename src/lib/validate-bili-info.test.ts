import { describe, expect, it, vi } from 'vitest';
import {
  BiliInfoValidationOptionsDefaultSchema,
  RevokeBiliInfo,
  ValidateBiliInfo,
  type BiliInfoValidationSchema,
} from './validate-bili-info.ts';

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

describe('Bili info restrictions', () => {
  it('uses the default Zod schema through Standard Schema', async () => {
    const result = await ValidateBiliInfo(
      1001n,
      undefined,
      BiliInfoValidationOptionsDefaultSchema,
      'bauth',
      true,
    );

    expect(result.success).toBe(true);
  });

  it('accepts synchronous Standard Schema validators', async () => {
    const schema: BiliInfoValidationSchema = {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate(value) {
          const info = value as { fans: number };
          return info.fans === 0
            ? { value }
            : { issues: [{ message: 'fans must be zero' }] };
        },
      },
    };

    const result = await ValidateBiliInfo(
      1001n,
      undefined,
      schema,
      'bauth',
      true,
    );

    expect(result.success).toBe(true);
  });

  it('accepts asynchronous validators and formats Standard Schema issues', async () => {
    const schema: BiliInfoValidationSchema = {
      '~standard': {
        version: 1,
        vendor: 'test',
        async validate() {
          return {
            issues: [{ message: 'not eligible', path: [{ key: 'fans' }] }],
          };
        },
      },
    };

    const result = await ValidateBiliInfo(
      1001n,
      undefined,
      schema,
      'bauth',
      true,
    );

    expect(result.success).toBe(false);
    if (!result.success && result.error) {
      expect(result.error.message).toBe('fans: not eligible');
    }
  });
});
