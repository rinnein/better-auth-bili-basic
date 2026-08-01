import z from 'zod';
import { providerId } from '../const.ts';

export type MID = number | bigint | string;

export const midSchema = z.object({
  mid: z.string().regex(/^\d+$/, 'mid must be numeric string'),
});

export const identifierSchema = z.templateLiteral([
  z.string().startsWith(`${providerId}:bind:`),
  z.string().length(8),
  z.literal(':'),
  z.nanoid(),
]);

export const challengeRequestSchema = midSchema.extend({
  identifier: identifierSchema,
});

export type MidRequest = z.infer<typeof midSchema>;
export type ChallengeRequest = z.infer<typeof challengeRequestSchema>;

export function midToString(mid: MID): string {
  if (typeof mid === 'number') {
    if (!Number.isSafeInteger(mid) || mid < 0) {
      throw new Error('Mid number must be a non-negative safe integer.');
    }
    return mid.toString();
  }
  return mid.toString();
}

export function parseIdentifier(identifier: string): string {
  return identifierSchema.parse(identifier);
}
