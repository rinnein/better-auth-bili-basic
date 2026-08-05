import type { BetterAuthClientPlugin } from 'better-auth';
import type { BetterFetchOption } from 'better-auth/client';
import { ObjId, pluginId, providerId } from '../const.ts';
import {
  identifierSchema,
  midToString,
  type MID,
} from '../shared/contracts.ts';
import { BILI_BASIC_ERROR_CODES } from '../shared/errors.ts';
import type { biliBasic } from '../plugins/main.ts';

export interface BiliBasicClientOptions {}

export interface BiliBasicRequestOptions {
  fetchOptions?: BetterFetchOption;
}

const sessionUpdatePaths = new Set([
  `/${providerId}/link`,
  `/sign-in/${providerId}`,
]);

function requestBody(mid: MID): { mid: string } {
  return { mid: midToString(mid) };
}

export const biliBasicClient = (_options: BiliBasicClientOptions = {}) => {
  return {
    id: pluginId,
    $ERROR_CODES: BILI_BASIC_ERROR_CODES,
    $InferServerPlugin: {} as ReturnType<typeof biliBasic>,
    pathMethods: {
      [`/${providerId}/send`]: 'POST',
      [`/${providerId}/link`]: 'POST',
      [`/${providerId}/revoke`]: 'POST',
      [`/sign-in/${providerId}`]: 'POST',
    },
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
          send: async (
            data: { mid: MID },
            fetchOptions?: BetterFetchOption,
          ) => {
            return $fetch(`/${providerId}/send`, {
              method: 'POST',
              body: requestBody(data.mid),
              ...fetchOptions,
            });
          },
          link: async (
            data: { mid: MID; identifier: string },
            fetchOptions?: BetterFetchOption,
          ) => {
            return $fetch(`/${providerId}/link`, {
              method: 'POST',
              body: {
                mid: midToString(data.mid),
                identifier: identifierSchema.parse(data.identifier),
              },
              ...fetchOptions,
            });
          },
          revoke: async (
            data: { mid: MID },
            fetchOptions?: BetterFetchOption,
          ) => {
            return $fetch(`/${providerId}/revoke`, {
              method: 'POST',
              body: requestBody(data.mid),
              ...fetchOptions,
            });
          },
        },
        signIn: {
          [ObjId]: async (
            data: { mid: MID; identifier: string },
            fetchOptions?: BetterFetchOption,
          ) => {
            return $fetch(`/sign-in/${providerId}`, {
              method: 'POST',
              body: {
                mid: midToString(data.mid),
                identifier: identifierSchema.parse(data.identifier),
              },
              ...fetchOptions,
            });
          },
        },
      };
    },
  } satisfies BetterAuthClientPlugin;
};

export type BiliBasicClientPlugin = ReturnType<typeof biliBasicClient>;
