import z from 'zod';
import { BiliInfo } from './bili-info';

export type BiliInfoValidationOptionsZodType = z.ZodObject<
  Partial<{
    ban: z.ZodBoolean | z.ZodLiteral<boolean>;
    fans: z.ZodInt | z.ZodLiteral<number>;
    sign: z.ZodString | z.ZodLiteral<string>;
    level: z.ZodInt | z.ZodLiteral<0 | 1 | 2 | 3 | 4 | 5 | 6>;
    vip: z.ZodInt | z.ZodLiteral<0 | 1 | 2>;
  }>
>;

export const BiliInfoValidationOptionsDefaultSchema: BiliInfoValidationOptionsZodType =
  z.object({
    ban: z.boolean(),
    fans: z.int().nonnegative(),
    sign: z.string(),
    level: z.int().min(0).max(6),
    vip: z.int().min(0).max(2),
  });

export async function ValidateBiliInfo(
  mid: bigint,
  code?: string,
  options: BiliInfoValidationOptionsZodType = BiliInfoValidationOptionsDefaultSchema,
  authMark: string = 'bauth',
) {
  const info = await BiliInfo(mid);
  const card = info.data.card;
  const v = {
    mid: card.mid,
    name: card.name,
    ban: card.spacesta === -2,
    fans: card.fans,
    sign: card.sign,
    level: card.level_info.current_level,
    vip: card.vip.type,
  };
  if (authMark !== 'dev') {
    if (v.sign.includes(`${authMark}::revoke`))
      return { success: false, error: new Error('Account is revoking.') };
    if (!v.sign.includes(`${authMark}:${code}`))
      return { success: false, error: new Error('Code not found in sign.') };
  }
  const customCheck = options.safeParse(v);
  if (customCheck.success) return { success: true, data: v };
  else return { success: false, error: customCheck.error };
}

export async function RevokeBiliInfo(mid: bigint, authMark: string = 'bauth') {
  if (authMark === 'dev') return { success: true };
  const info = await BiliInfo(mid);
  if (info.data.card.sign.includes(`${authMark}::revoke`))
    return { success: true };
  else return { success: false, error: new Error('Revoke code not found.') };
}
