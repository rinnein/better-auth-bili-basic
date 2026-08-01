import { getTestInstance } from 'better-auth/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { biliBasic } from './main.ts';
import { biliBasicClient } from '../client/main.ts';

vi.mock('../lib/validate-bili-info.ts', () => ({
  BiliInfoValidationOptionsDefaultSchema: {
    safeParse: () => ({ success: true }),
  },
  ValidateBiliInfo: vi.fn(async () => ({
    success: true,
    data: { name: 'Bili Test User' },
  })),
  RevokeBiliInfo: vi.fn(async () => ({ success: true })),
}));

async function createInstance(deleteUserOnRevoke?: boolean) {
  return getTestInstance(
    {
      plugins: [
        biliBasic({
          skipCodeValidation: true,
          signUpOnVerification: {
            enabled: true,
            ...(deleteUserOnRevoke === undefined ? {} : { deleteUserOnRevoke }),
          },
        }),
      ],
    },
    {
      disableTestUser: true,
      clientOptions: { plugins: [biliBasicClient()] },
    },
  );
}

type SignUpPayload = {
  data: {
    account: { accountId: string };
    user: { id: string };
  };
};

describe('biliBasic Better Auth integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consumes a sign-up challenge exactly once', async () => {
    const instance = await createInstance();
    const challenge = await instance.client.biliBasic.send({ mid: '1001' });
    const identifier = challenge.data?.data.identifier;

    expect(challenge.error).toBeNull();
    expect(identifier).toBeDefined();

    const signUp = await instance.client.signUp.biliBasic({
      mid: '1001',
      identifier: identifier!,
    });
    const mismatchedMid = await instance.client.signUp.biliBasic({
      mid: '1002',
      identifier: identifier!,
    });
    const replay = await instance.client.signUp.biliBasic({
      mid: '1001',
      identifier: identifier!,
    });

    expect(signUp.error).toBeNull();
    const signUpData = signUp.data as unknown as SignUpPayload;
    expect(signUpData.data.account.accountId).toBe('1001');
    expect(mismatchedMid.data).toBeNull();
    expect(mismatchedMid.error).toBeDefined();
    expect(replay.data).toBeNull();
    expect(replay.error).toBeDefined();
  });

  it('deletes the generated user on revoke by default', async () => {
    const instance = await createInstance();
    const challenge = await instance.client.biliBasic.send({ mid: '1002' });
    const signUp = await instance.client.signUp.biliBasic({
      mid: '1002',
      identifier: challenge.data!.data.identifier,
    });
    const userId = (signUp.data as unknown as SignUpPayload).data.user.id;
    const revoke = await instance.client.biliBasic.revoke({ mid: '1002' });
    const context = await instance.auth.$context;

    expect(revoke.error).toBeNull();
    expect(await context.internalAdapter.findUserById(userId)).toBeNull();
  });

  it('keeps the generated user when deletion is disabled', async () => {
    const instance = await createInstance(false);
    const challenge = await instance.client.biliBasic.send({ mid: '1003' });
    const signUp = await instance.client.signUp.biliBasic({
      mid: '1003',
      identifier: challenge.data!.data.identifier,
    });
    const userId = (signUp.data as unknown as SignUpPayload).data.user.id;
    await instance.client.biliBasic.revoke({ mid: '1003' });
    const context = await instance.auth.$context;

    expect(await context.internalAdapter.findUserById(userId)).not.toBeNull();
  });
});
