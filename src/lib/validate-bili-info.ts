import type { StandardSchemaV1 } from '@standard-schema/spec';
import z from 'zod';
import { BiliInfo } from './bili-info.ts';

export interface BiliInfoValidationData {
  mid: string;
  name: string;
  ban: boolean;
  fans: number;
  sign: string;
  level: number;
  vip: number;
}

/** A Standard Schema compatible validator for Bili account information. */
export type BiliInfoValidationSchema = StandardSchemaV1;

export const BiliInfoValidationOptionsDefaultSchema: BiliInfoValidationSchema =
  z.object({
    ban: z.boolean(),
    fans: z.int().nonnegative(),
    sign: z.string(),
    level: z.int().min(0).max(6),
    vip: z.int().min(0).max(2),
  });

function issuePath(
  path: readonly (PropertyKey | { key: PropertyKey })[] | undefined,
) {
  if (!path?.length) return 'value';
  return path
    .map((segment) =>
      typeof segment === 'object' && segment !== null && 'key' in segment
        ? String(segment.key)
        : String(segment),
    )
    .join('.');
}

function validationError(issues: readonly StandardSchemaV1.Issue[]) {
  const message = issues
    .map((issue) => `${issuePath(issue.path)}: ${issue.message}`)
    .join('; ');
  return new Error(message || 'Bili info validation failed.');
}

export async function ValidateBiliInfo(
  mid: bigint,
  code?: string,
  options: BiliInfoValidationSchema = BiliInfoValidationOptionsDefaultSchema,
  authMark: string = 'bauth',
  skipCodeValidation = false,
) {
  const info = await BiliInfo(mid);
  const card = info.data.card;
  const v: BiliInfoValidationData = {
    mid: card.mid,
    name: card.name,
    ban: card.spacesta === -2,
    fans: card.fans,
    sign: card.sign,
    level: card.level_info.current_level,
    vip: card.vip.type,
  };
  if (!skipCodeValidation) {
    if (v.sign.includes(`${authMark}::revoke`))
      return { success: false, error: new Error('Account is revoking.') };
    if (!v.sign.includes(`${authMark}:${code}`))
      return { success: false, error: new Error('Code not found in sign.') };
  }
  const customCheck = await options['~standard'].validate(v);
  if (!customCheck.issues) return { success: true, data: v };
  return { success: false, error: validationError(customCheck.issues) };
}

export async function RevokeBiliInfo(
  mid: bigint,
  authMark: string = 'bauth',
  skipCodeValidation = false,
) {
  if (skipCodeValidation) return { success: true };
  const info = await BiliInfo(mid);
  if (info.data.card.sign.includes(`${authMark}::revoke`))
    return { success: true };
  else return { success: false, error: new Error('Revoke code not found.') };
}
