import {
  BiliInfoValidationOptionsDefaultSchema,
  type BiliInfoValidationOptionsZodType,
  RevokeBiliInfo,
  ValidateBiliInfo,
} from '@/lib/validate-bili-info.ts';
import type { BetterAuthPlugin } from 'better-auth';
import {
  APIError,
  createAuthEndpoint,
  sessionMiddleware,
} from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { nanoid } from 'nanoid';
import { challengeRequestSchema, midSchema } from '../shared/contracts.ts';
import {
  BILI_BASIC_ERROR_CODES,
  type BiliBasicErrorCode,
} from '../shared/errors.ts';
import { pluginId, providerId } from '../const.ts';

export interface BiliBasicSignUpOptions {
  enabled?: boolean;
  /** Delete the generated user on revoke when this instance only uses Bili registration. */
  deleteUserOnRevoke?: boolean;
  getTempEmail?: (mid: string) => string;
  getTempName?: (mid: string) => string;
}

export interface BiliBasicPluginOptions {
  infoRestrictions?: BiliInfoValidationOptionsZodType;
  authMark?: string;
  /** Explicitly opt into skipping Bili sign validation for local development. */
  skipCodeValidation?: boolean;
  codeTTLSeconds?: number;
  codeLength?: number;
  userEmailDomain?: string;
  defaultUserNamePrefix?: string;
  signUpOnVerification?: BiliBasicSignUpOptions;
}

const now = () => new Date();

function error(code: BiliBasicErrorCode, message?: string): APIError {
  return new APIError('BAD_REQUEST', {
    message: message ?? BILI_BASIC_ERROR_CODES[code].message,
  });
}

function normalizeOptions(options: BiliBasicPluginOptions) {
  const codeTTLSeconds = options.codeTTLSeconds ?? 3600;
  const codeLength = options.codeLength ?? 5;

  if (!Number.isInteger(codeTTLSeconds) || codeTTLSeconds < 1) {
    throw new Error('codeTTLSeconds must be a positive integer.');
  }
  if (!Number.isInteger(codeLength) || codeLength < 1 || codeLength > 100) {
    throw new Error('codeLength must be an integer between 1 and 100.');
  }

  const signUpOnVerification = options.signUpOnVerification
    ? {
        ...options.signUpOnVerification,
        enabled: options.signUpOnVerification.enabled ?? false,
        deleteUserOnRevoke:
          options.signUpOnVerification.deleteUserOnRevoke ??
          options.signUpOnVerification.enabled ??
          false,
      }
    : undefined;

  const authMark = options.authMark ?? 'bauth';
  if (!authMark.trim()) throw new Error('authMark must not be empty.');

  return {
    infoRestrictions:
      options.infoRestrictions ?? BiliInfoValidationOptionsDefaultSchema,
    authMark,
    skipCodeValidation: options.skipCodeValidation ?? false,
    codeTTLSeconds,
    codeLength,
    userEmailDomain: options.userEmailDomain ?? 'bili.local',
    defaultUserNamePrefix: options.defaultUserNamePrefix ?? 'bili',
    signUpOnVerification,
  };
}

function parseMid(mid: string): bigint {
  if (!/^\d+$/.test(mid)) throw error('INVALID_MID');
  try {
    return BigInt(mid);
  } catch {
    throw error('INVALID_MID');
  }
}

function normalizeMid(mid: string): string {
  return parseMid(mid).toString();
}

function challengePrefix(midHash: string): string {
  return `${providerId}:bind:${midHash}:`;
}

function challengeIdentifier(midHash: string): string {
  return `${challengePrefix(midHash)}${nanoid()}`;
}

async function hashMid(mid: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${providerId}:${mid}`),
  );
  return Array.from(new Uint8Array(hashBuffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 8);
}

function errorMessage(errorValue: unknown): string {
  return errorValue instanceof Error ? errorValue.message : 'Unknown error.';
}

async function assertChallengeBelongsToMid(identifier: string, mid: string) {
  const midHash = await hashMid(mid);
  if (!identifier.startsWith(challengePrefix(midHash))) {
    throw error('CHALLENGE_MISMATCH');
  }
}

async function getChallenge(
  ctx: any,
  identifier: string,
  mid: string,
  currentTime: Date,
) {
  await assertChallengeBelongsToMid(identifier, mid);
  const challenge =
    await ctx.context.internalAdapter.findVerificationValue(identifier);

  if (!challenge) throw error('CHALLENGE_NOT_FOUND');
  if (challenge.expiresAt.getTime() <= currentTime.getTime()) {
    throw error('CHALLENGE_EXPIRED');
  }
  return challenge;
}

async function consumeChallenge(ctx: any, identifier: string, mid: string) {
  await assertChallengeBelongsToMid(identifier, mid);
  const challenge =
    await ctx.context.internalAdapter.consumeVerificationValue(identifier);
  if (!challenge) throw error('CHALLENGE_CONSUMED');
  return challenge;
}

async function validateChallenge(
  ctx: any,
  identifier: string,
  mid: string,
  options: ReturnType<typeof normalizeOptions>,
) {
  const challenge = await getChallenge(ctx, identifier, mid, now());
  const validation = await ValidateBiliInfo(
    parseMid(mid),
    challenge.value,
    options.infoRestrictions,
    options.authMark,
    options.skipCodeValidation,
  );

  if (!validation.success) {
    throw error('CHALLENGE_NOT_FOUND', errorMessage(validation.error));
  }
  return validation.data;
}

async function hasUserBinding(ctx: any, userId: string) {
  const accounts =
    await ctx.context.internalAdapter.findAccountByUserId(userId);
  return accounts.find((account: { providerId: string }) => {
    return account.providerId === providerId;
  });
}

function accountAlreadyBound() {
  return error(
    'BINDING_EXISTS',
    'This mid is already bound. Publish the revoke mark and call revoke first.',
  );
}

function sessionResponse<TUser, TAccount>(
  session: { token: string },
  user: TUser,
  account: TAccount,
) {
  return {
    success: true,
    data: {
      token: session.token,
      user,
      account,
    },
  };
}

export const biliBasic = (pluginOptions: BiliBasicPluginOptions = {}) => {
  const options = normalizeOptions(pluginOptions);
  const ttlMs = options.codeTTLSeconds * 1000;

  return {
    id: pluginId,
    options,
    $ERROR_CODES: BILI_BASIC_ERROR_CODES,
    endpoints: {
      send: createAuthEndpoint(
        `/${providerId}/send`,
        {
          method: 'POST',
          body: midSchema,
          metadata: {
            openapi: {
              summary: 'Create a Bili verification challenge',
              description:
                'Create a challenge that must be published in Bili sign.',
            },
          },
        },
        async (ctx) => {
          const currentTime = now();
          const mid = normalizeMid(ctx.body.mid);

          const existingBinding =
            await ctx.context.internalAdapter.findAccountByProviderId(
              mid,
              providerId,
            );
          if (existingBinding) throw accountAlreadyBound();

          const midHash = await hashMid(mid);
          const identifier = challengeIdentifier(midHash);
          const code = nanoid(options.codeLength);

          await ctx.context.adapter.deleteMany({
            model: 'verification',
            where: [
              {
                field: 'identifier',
                value: challengePrefix(midHash),
                operator: 'contains',
              },
            ],
          });
          const expiresAt = new Date(currentTime.getTime() + ttlMs);
          await ctx.context.internalAdapter.createVerificationValue({
            identifier,
            value: code,
            expiresAt,
            createdAt: currentTime,
            updatedAt: currentTime,
          });

          return ctx.json({
            success: true,
            data: {
              mid,
              identifier,
              expiresAt,
              signInstruction: `${options.authMark}:${code}`,
            },
          });
        },
      ),
      link: createAuthEndpoint(
        `/${providerId}/link`,
        {
          method: 'POST',
          body: challengeRequestSchema,
          use: [sessionMiddleware],
          metadata: {
            openapi: {
              summary: 'Link a Bili account',
              description: 'Link a verified Bili account to the current user.',
            },
          },
        },
        async (ctx) => {
          const mid = normalizeMid(ctx.body.mid);
          const user = ctx.context.session.user;
          await validateChallenge(ctx, ctx.body.identifier, mid, options);

          if (await hasUserBinding(ctx, user.id)) {
            throw error('USER_BINDING_EXISTS');
          }
          if (
            await ctx.context.internalAdapter.findAccountByProviderId(
              mid,
              providerId,
            )
          ) {
            throw accountAlreadyBound();
          }

          await consumeChallenge(ctx, ctx.body.identifier, mid);
          const account = await ctx.context.internalAdapter.createAccount({
            accountId: mid,
            providerId,
            userId: user.id,
          });

          return ctx.json({
            success: true,
            data: { account, user },
          });
        },
      ),
      signIn: createAuthEndpoint(
        `/sign-in/${providerId}`,
        {
          method: 'POST',
          body: challengeRequestSchema,
          metadata: {
            openapi: {
              summary: 'Sign in with Bili',
              description: 'Sign in with a verified Bili account.',
            },
          },
        },
        async (ctx) => {
          const mid = normalizeMid(ctx.body.mid);
          await validateChallenge(ctx, ctx.body.identifier, mid, options);

          const account =
            await ctx.context.internalAdapter.findAccountByProviderId(
              mid,
              providerId,
            );
          if (!account) {
            throw error(
              'BINDING_EXISTS',
              'No account is bound to this mid. Please sign up first.',
            );
          }

          const user = await ctx.context.internalAdapter.findUserById(
            account.userId,
          );
          if (!user) throw error('USER_NOT_FOUND');

          await consumeChallenge(ctx, ctx.body.identifier, mid);
          const session = await ctx.context.internalAdapter.createSession(
            user.id,
          );
          await setSessionCookie(ctx, { session, user });

          return ctx.json(sessionResponse(session, user, account));
        },
      ),
      signUp: createAuthEndpoint(
        `/sign-up/${providerId}`,
        {
          method: 'POST',
          body: challengeRequestSchema,
          metadata: {
            openapi: {
              summary: 'Sign up with Bili',
              description: 'Create a user from a verified Bili account.',
            },
          },
        },
        async (ctx) => {
          const signUpOptions = options.signUpOnVerification;
          if (!signUpOptions?.enabled) throw error('SIGN_UP_DISABLED');

          const mid = normalizeMid(ctx.body.mid);
          const biliInfo = await validateChallenge(
            ctx,
            ctx.body.identifier,
            mid,
            options,
          );
          if (
            await ctx.context.internalAdapter.findAccountByProviderId(
              mid,
              providerId,
            )
          ) {
            throw accountAlreadyBound();
          }

          await consumeChallenge(ctx, ctx.body.identifier, mid);
          const email =
            signUpOptions.getTempEmail?.(mid) ??
            `${mid}@${options.userEmailDomain}`;
          const name =
            signUpOptions.getTempName?.(mid) ??
            biliInfo?.name ??
            `${options.defaultUserNamePrefix}_${mid}`;

          let createdUserId: string | undefined;
          try {
            const created = await ctx.context.internalAdapter.createOAuthUser(
              {
                email,
                emailVerified: true,
                name,
              },
              {
                accountId: mid,
                providerId,
              },
            );
            createdUserId = created.user.id;
            const session = await ctx.context.internalAdapter.createSession(
              created.user.id,
            );
            await setSessionCookie(ctx, { session, user: created.user });
            return ctx.json(
              sessionResponse(session, created.user, created.account),
            );
          } catch (caught) {
            if (createdUserId) {
              await ctx.context.internalAdapter.deleteUser(createdUserId);
            }
            throw caught;
          }
        },
      ),
      revoke: createAuthEndpoint(
        `/${providerId}/revoke`,
        {
          method: 'POST',
          body: midSchema,
          metadata: {
            openapi: {
              summary: 'Revoke a Bili binding',
              description:
                'Revoke a binding after the Bili revoke mark is published.',
            },
          },
        },
        async (ctx) => {
          const mid = normalizeMid(ctx.body.mid);
          const midBigInt = parseMid(mid);
          const revoke = await RevokeBiliInfo(
            midBigInt,
            options.authMark,
            options.skipCodeValidation,
          );
          if (!revoke.success) {
            throw error('CHALLENGE_NOT_FOUND', errorMessage(revoke.error));
          }

          const account =
            await ctx.context.internalAdapter.findAccountByProviderId(
              mid,
              providerId,
            );
          if (account) {
            const signUpOptions = options.signUpOnVerification;
            const user = await ctx.context.internalAdapter.findUserById(
              account.userId,
            );
            const tempEmail =
              signUpOptions?.getTempEmail?.(mid) ??
              `${mid}@${options.userEmailDomain}`;

            if (
              signUpOptions?.enabled &&
              signUpOptions.deleteUserOnRevoke &&
              user?.email === tempEmail
            ) {
              await ctx.context.internalAdapter.deleteUser(account.userId);
            } else {
              await ctx.context.internalAdapter.deleteAccount(account.id);
            }
          }

          const midHash = await hashMid(mid);
          await ctx.context.adapter.deleteMany({
            model: 'verification',
            where: [
              {
                field: 'identifier',
                value: challengePrefix(midHash),
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
        pathMatcher: (path) => path === `/${providerId}/link`,
        max: 10,
        window: 60,
      },
      {
        pathMatcher: (path) => path === `/sign-in/${providerId}`,
        max: 10,
        window: 60,
      },
      {
        pathMatcher: (path) => path === `/sign-up/${providerId}`,
        max: 10,
        window: 10,
      },
      {
        pathMatcher: (path) => path === `/${providerId}/revoke`,
        max: 20,
        window: 60,
      },
    ],
  } satisfies BetterAuthPlugin;
};

export type BiliBasicPlugin = ReturnType<typeof biliBasic>;
