import { getTestInstance } from 'better-auth/test';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
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

async function createInstance(
  deleteUserOnRevoke?: boolean,
  signUpEnabled = true,
) {
  return getTestInstance(
    {
      plugins: [
        biliBasic({
          skipCodeValidation: true,
          signUpOnVerification: {
            enabled: signUpEnabled,
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

type BiliAuthPayload = {
  data: {
    account: { accountId: string };
    user: { id: string };
  };
};

describe('biliBasic Better Auth integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an account through the unified sign-in endpoint', async () => {
    const instance = await createInstance();
    const challenge = await instance.client.biliBasic.send({ mid: '1001' });
    const identifier = challenge.data?.data.identifier;

    expect(challenge.error).toBeNull();
    expect(identifier).toBeDefined();

    const signIn = await instance.client.signIn.biliBasic({
      mid: '1001',
      identifier: identifier!,
    });
    const mismatchedMid = await instance.client.signIn.biliBasic({
      mid: '1002',
      identifier: identifier!,
    });
    const replay = await instance.client.signIn.biliBasic({
      mid: '1001',
      identifier: identifier!,
    });

    expect(signIn.error).toBeNull();
    const signInData = signIn.data as unknown as BiliAuthPayload;
    expect(signInData.data.account.accountId).toBe('1001');
    expect(mismatchedMid.data).toBeNull();
    expect(mismatchedMid.error).toBeDefined();
    expect(replay.data).toBeNull();
    expect(replay.error).toBeDefined();
  });

  it('creates a fresh challenge for a bound mid and signs in with it', async () => {
    const instance = await createInstance();
    const initialChallenge = await instance.client.biliBasic.send({
      mid: '1004',
    });
    const firstSignIn = await instance.client.signIn.biliBasic({
      mid: '1004',
      identifier: initialChallenge.data!.data.identifier,
    });

    expect(firstSignIn.error).toBeNull();
    const firstSignInData = firstSignIn.data as unknown as BiliAuthPayload;

    await instance.client.signOut();
    const challenge = await instance.client.biliBasic.send({ mid: '1004' });
    const secondSignIn = await instance.client.signIn.biliBasic({
      mid: '1004',
      identifier: challenge.data!.data.identifier,
    });

    expect(challenge.error).toBeNull();
    expect(secondSignIn.error).toBeNull();
    const secondSignInData = secondSignIn.data as unknown as BiliAuthPayload;
    expect(secondSignInData.data.user.id).toBe(firstSignInData.data.user.id);
  });

  it('does not create an account when automatic sign-up is disabled', async () => {
    const instance = await createInstance(undefined, false);
    const challenge = await instance.client.biliBasic.send({ mid: '1005' });
    const signIn = await instance.client.signIn.biliBasic({
      mid: '1005',
      identifier: challenge.data!.data.identifier,
    });
    const context = await instance.auth.$context;

    expect(signIn.error?.message).toBe('Sign-up on verification is disabled.');
    expect(
      await context.internalAdapter.findAccountByProviderId(
        '1005',
        'bili-basic',
      ),
    ).toBeNull();
    expect(
      await context.internalAdapter.findUserByEmail('1005@bili.local'),
    ).toBeNull();
  });

  it('signs in existing bindings when automatic sign-up is disabled', async () => {
    const instance = await createInstance(undefined, false);
    const context = await instance.auth.$context;
    const existing = await context.internalAdapter.createOAuthUser(
      {
        email: 'existing@bili.local',
        emailVerified: true,
        name: 'Existing Bili User',
      },
      {
        accountId: '1006',
        providerId: 'bili-basic',
      },
    );
    const challenge = await instance.client.biliBasic.send({ mid: '1006' });
    const signIn = await instance.client.signIn.biliBasic({
      mid: '1006',
      identifier: challenge.data!.data.identifier,
    });

    expect(signIn.error).toBeNull();
    const signInData = signIn.data as unknown as BiliAuthPayload;
    expect(signInData.data.user.id).toBe(existing.user.id);
  });

  it('deletes the generated user on revoke by default', async () => {
    const instance = await createInstance();
    const challenge = await instance.client.biliBasic.send({ mid: '1002' });
    const signIn = await instance.client.signIn.biliBasic({
      mid: '1002',
      identifier: challenge.data!.data.identifier,
    });
    const userId = (signIn.data as unknown as BiliAuthPayload).data.user.id;
    const revoke = await instance.client.biliBasic.revoke({ mid: '1002' });
    const context = await instance.auth.$context;

    expect(revoke.error).toBeNull();
    expect(await context.internalAdapter.findUserById(userId)).toBeNull();
  });

  it('keeps the generated user when deletion is disabled', async () => {
    const instance = await createInstance(false);
    const challenge = await instance.client.biliBasic.send({ mid: '1003' });
    const signIn = await instance.client.signIn.biliBasic({
      mid: '1003',
      identifier: challenge.data!.data.identifier,
    });
    const userId = (signIn.data as unknown as BiliAuthPayload).data.user.id;
    await instance.client.biliBasic.revoke({ mid: '1003' });
    const context = await instance.auth.$context;

    expect(await context.internalAdapter.findUserById(userId)).not.toBeNull();
  });
});
