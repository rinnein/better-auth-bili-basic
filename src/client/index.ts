import type { BetterAuthClientPlugin } from 'better-auth';
import { ObjId, pluginId, providerId } from '../const';
import { biliBasic, identifierSchema } from '../plugins/index';
import { BetterFetchOption } from 'better-auth/client';

export interface BiliBasicClientOptions {}

const sessionUpdatePaths = new Set([
  `/${providerId}/link`,
  `/sign-in/${providerId}`,
  `/sign-up/${providerId}`,
]);

type MID = number | bigint | string;
function midParser(mid: MID) {
  if (typeof mid === 'number') {
    if (!Number.isSafeInteger(mid))
      throw new Error('Mid number must be a safe integer.');
    return mid.toString();
  }
  if (typeof mid === 'bigint') {
    return mid.toString();
  }
  return mid;
}

export const biliBasicClient = (_options: BiliBasicClientOptions = {}) => {
  return {
    id: pluginId,
    $InferServerPlugin: {} as ReturnType<typeof biliBasic>,
    atomListeners: [
      {
        signal: '$sessionSignal',
        matcher(path: string) {
          return sessionUpdatePaths.has(path);
        },
      },
    ],
    getActions: ($fetch) => {
      return {
        biliBasic: {
          send: async (mid: bigint, fetchOptions?: BetterFetchOption) => {
            const res = $fetch(`/${providerId}/send`, {
              method: 'POST',
              body: { mid: midParser(mid) },
              ...fetchOptions,
            });
            return res;
          },
          link: async (
            mid: bigint,
            identifier: string,
            fetchOptions?: BetterFetchOption,
          ) => {
            const res = $fetch(`/${providerId}/link`, {
              method: 'POST',
              body: {
                mid: midParser(mid),
                identifier: identifierSchema.parse(identifier),
              },
              ...fetchOptions,
            });
            return res;
          },
          revoke: async (mid: bigint, fetchOptions?: BetterFetchOption) => {
            const res = $fetch(`/${providerId}/revoke`, {
              method: 'POST',
              body: { mid: midParser(mid) },
              ...fetchOptions,
            });
            return res;
          },
        },
        signIn: {
          [ObjId]: async (
            mid: bigint,
            identifier: string,
            fetchOptions?: BetterFetchOption,
          ) => {
            const res = $fetch(`/sign-in/${providerId}`, {
              method: 'POST',
              body: {
                mid: midParser(mid),
                identifier: identifierSchema.parse(identifier),
              },
              ...fetchOptions,
            });
            return res;
          },
        },
        signUp: {
          [ObjId]: async (
            mid: bigint,
            identifier: string,
            fetchOptions?: BetterFetchOption,
          ) => {
            const res = $fetch(`/sign-up/${providerId}`, {
              method: 'POST',
              body: {
                mid: midParser(mid),
                identifier: identifierSchema.parse(identifier),
              },
              ...fetchOptions,
            });
            return res;
          },
        },
      };
    },
  } satisfies BetterAuthClientPlugin;
};

export type BiliBasicClientPlugin = ReturnType<typeof biliBasicClient>;
export type { BiliBasicPluginOptions } from '../plugins/index';
