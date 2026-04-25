import {
  BiliInfoValidationOptionsDefaultSchema,
  BiliInfoValidationOptionsZodType,
  RevokeBiliInfo,
  ValidateBiliInfo,
} from '@/lib/validate-bili-info';
import type { Account, BetterAuthPlugin, User } from 'better-auth';
import { APIError, createAuthEndpoint } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { nanoid } from 'nanoid';
import z from 'zod';
import { providerId } from './const';

export interface BiliBasicPluginOptions {
  infoRestrictions?: BiliInfoValidationOptionsZodType;
  /**
   * @example `dev` 跳过code检查，直接验证成功。适用于开发和测试环境。生产环境请勿使用。
   */
  authMark?: string;
  codeTTLSeconds?: number;
  codeLength?: number;
  userEmailDomain?: string;
  defaultUserNamePrefix?: string;
  signUpOnVerification?: {
    enabled?: boolean;
    getTempEmail?: (mid: string) => string;
    getTempName?: (mid: string) => string;
  };
}

const requestBodySchema = z.object({
  mid: z.string().regex(/^\d+$/, 'mid must be numeric string'),
});

function parseMid(mid: string) {
  if (!/^\d+$/.test(mid)) {
    throw new APIError('BAD_REQUEST', {
      message: 'Invalid mid. It must be a numeric string.',
    });
  }
  return BigInt(mid);
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unknown error.';
}

function challengeIdentifier(midHash: string, i: string) {
  return `${providerId}:bind:${midHash}:${i}`;
}

async function HashMid(mid: string) {
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${providerId}:${mid}`),
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 8);
}

export const biliBasicPlugin = ({
  infoRestrictions = BiliInfoValidationOptionsDefaultSchema,
  authMark = 'bauth',
  codeTTLSeconds = 3600,
  codeLength = 5,
  userEmailDomain = 'bili.local',
  defaultUserNamePrefix = 'bili',
  signUpOnVerification,
}: BiliBasicPluginOptions = {}) => {
  const ttlMs = Math.max(1, codeTTLSeconds) * 1000;

  return {
    id: 'biliBasicPlugin',
    endpoints: {
      send: createAuthEndpoint(
        `/${providerId}/send`,
        {
          method: 'POST',
          body: requestBodySchema,
        },
        async (ctx) => {
          const now = new Date();
          const mid = ctx.body.mid;

          parseMid(mid);

          const existingBinding =
            await ctx.context.internalAdapter.findAccountByProviderId(
              mid,
              providerId,
            );

          if (existingBinding) {
            throw new APIError('BAD_REQUEST', {
              message:
                'This mid is already bound to another account. Add revoke mark in sign and call revoke endpoint first.',
            });
          }

          const midHash = await HashMid(mid);
          const code = nanoid(codeLength);
          const expiresAt = new Date(now.getTime() + ttlMs);
          const identifier = challengeIdentifier(midHash, nanoid());

          const existingChallenge =
            await ctx.context.internalAdapter.findVerificationValue(identifier);

          if (existingChallenge) {
            await ctx.context.internalAdapter.updateVerificationByIdentifier(
              identifier,
              {
                value: code,
                expiresAt,
                updatedAt: now,
              },
            );
          } else {
            await ctx.context.internalAdapter.createVerificationValue({
              identifier,
              value: code,
              expiresAt,
              createdAt: now,
              updatedAt: now,
            });
          }

          return ctx.json({
            success: true,
            data: {
              mid,
              identifier,
              expiresAt,
              signInstruction: `${authMark}:${code}`,
            },
          });
        },
      ),
      verify: createAuthEndpoint(
        `/${providerId}/verify`,
        {
          method: 'POST',
          body: requestBodySchema.extend(
            z.object({
              identifier: z.templateLiteral([
                z.string().startsWith(`${providerId}:bind:`),
                z.string().length(8),
                z.literal(':'),
                z.nanoid(),
              ]),
            }).shape,
          ),
        },
        async (ctx) => {
          const now = new Date();
          const mid = ctx.body.mid;
          const midBigInt = parseMid(mid);
          const sessionUser = ctx.context.session?.user;
          const allowSignUp = signUpOnVerification?.enabled ?? false;

          if (!allowSignUp && !sessionUser) {
            throw new APIError('BAD_REQUEST', {
              message:
                'Sign-up on verification is disabled. Please sign in before linking.',
            });
          }

          const challenge =
            await ctx.context.internalAdapter.findVerificationValue(
              ctx.body.identifier,
            );

          if (!challenge) {
            throw new APIError('BAD_REQUEST', {
              message: 'No pending challenge found for this mid.',
            });
          }

          if (challenge.expiresAt.getTime() <= now.getTime()) {
            await ctx.context.adapter.deleteMany({
              model: 'verification',
              where: [{ field: 'expiresAt', value: now, operator: 'lte' }],
            });
            throw new APIError('BAD_REQUEST', {
              message: 'Challenge expired. Request a new code and retry.',
            });
          }

          if (sessionUser) {
            const hasBinding = await ctx.context.adapter.findOne<Account>({
              model: 'account',
              where: [
                { field: 'providerId', value: providerId },
                { field: 'userId', value: sessionUser.id },
              ],
            });

            if (hasBinding) {
              throw new APIError('BAD_REQUEST', {
                message:
                  'Your account already has a binding. Please unlink it before linking a new mid.',
              });
            }
          }

          const validation = await ValidateBiliInfo(
            midBigInt,
            challenge.value,
            infoRestrictions,
            authMark,
          );

          if (!validation.success) {
            throw new APIError('BAD_REQUEST', {
              message: toErrorMessage(validation.error),
            });
          }

          const existingBinding =
            await ctx.context.internalAdapter.findAccountByProviderId(
              mid,
              providerId,
            );

          if (existingBinding) {
            throw new APIError('BAD_REQUEST', {
              message:
                'This mid is already bound. If you own this account, publish revoke mark and call revoke endpoint first.',
            });
          }

          let user: User | null = sessionUser ?? null;
          let session = ctx.context.session?.session;
          let pwd: string | undefined = undefined;

          if (!user?.id) {
            const tempEmail =
              signUpOnVerification?.getTempEmail?.(mid) ??
              `${mid}@${userEmailDomain}`;
            const tempName =
              signUpOnVerification?.getTempName?.(mid) ??
              validation.data?.name ??
              `${defaultUserNamePrefix}_${mid}`;

            user = await ctx.context.internalAdapter.createUser({
              email: tempEmail,
              emailVerified: true,
              name: tempName,
              createdAt: now,
              updatedAt: now,
            });

            pwd = nanoid();
            await ctx.context.internalAdapter.updatePassword(user.id, pwd);

            session = await ctx.context.internalAdapter.createSession(user.id);
            await setSessionCookie(ctx, {
              session,
              user,
            });
          }

          const account = await ctx.context.internalAdapter.createAccount({
            accountId: mid,
            providerId,
            userId: user.id,
            createdAt: now,
            updatedAt: now,
          });

          await ctx.context.internalAdapter.deleteVerificationByIdentifier(
            ctx.body.identifier,
          );

          return ctx.json({
            success: true,
            data: {
              account,
              session,
              user,
              defaultPassword: pwd,
            },
          });
        },
      ),
      revoke: createAuthEndpoint(
        `/${providerId}/revoke`,
        {
          method: 'POST',
          body: requestBodySchema,
        },
        async (ctx) => {
          const mid = ctx.body.mid;
          const midBigInt = parseMid(mid);

          const revoke = await RevokeBiliInfo(midBigInt, authMark);
          if (!revoke.success) {
            throw new APIError('BAD_REQUEST', {
              message: toErrorMessage(revoke.error),
            });
          }

          await ctx.context.adapter.delete({
            model: 'account',
            where: [
              { field: 'providerId', value: providerId },
              { field: 'accountId', value: mid },
            ],
          });

          if (signUpOnVerification?.enabled) {
            const tempEmail =
              signUpOnVerification?.getTempEmail?.(mid) ??
              `${mid}@${userEmailDomain}`;

            await ctx.context.adapter.delete({
              model: 'user',
              where: [{ field: 'email', value: tempEmail }],
            });
          }

          await ctx.context.adapter.deleteMany({
            model: 'verification',
            where: [
              {
                field: 'identifier',
                value: await HashMid(mid),
                operator: 'contains',
              },
            ],
          });

          return ctx.json({
            success: true,
            data: { mid },
          });
        },
      ),
    },
    rateLimit: [
      {
        pathMatcher: (path) => path === `/${providerId}/send`,
        max: 10,
        window: 60,
      },
      {
        pathMatcher: (path) => path === `/${providerId}/verify`,
        max: 10,
        window: 60,
      },
      {
        pathMatcher: (path) => path === `/${providerId}/revoke`,
        max: 20,
        window: 60,
      },
    ],
  } satisfies BetterAuthPlugin;
};
