import { describe, expect, it } from 'vite-plus/test';
import { biliBasicClient } from './main.ts';

describe('biliBasicClient', () => {
  it('exposes Better Auth endpoint metadata and sends object payloads', async () => {
    const calls: Array<{ path: string; options: unknown }> = [];
    const plugin = biliBasicClient();
    type GetActions = NonNullable<typeof plugin.getActions>;
    type Fetch = Parameters<GetActions>[0];
    const fetch = (async (path: string, options: unknown) => {
      calls.push({ path, options });
      return { data: { ok: true } };
    }) as Fetch;
    const actions = plugin.getActions!(fetch);

    expect(plugin.pathMethods?.['/bili-basic/send']).toBe('POST');
    expect(plugin.pathMethods?.['/sign-in/bili-basic']).toBe('POST');
    expect(Object.keys(plugin.pathMethods ?? {})).not.toContain(
      '/sign-up/bili-basic',
    );
    expect(plugin.atomListeners?.[0]?.signal).toBe('$sessionSignal');

    await actions.biliBasic.send({ mid: 123456n });
    await actions.signIn.biliBasic({
      mid: '123456',
      identifier: 'bili-basic:bind:12345678:AbCdEfGhIjKlMnOpQrStU',
    });

    expect(calls).toEqual([
      {
        path: '/bili-basic/send',
        options: { method: 'POST', body: { mid: '123456' } },
      },
      {
        path: '/sign-in/bili-basic',
        options: {
          method: 'POST',
          body: {
            mid: '123456',
            identifier: 'bili-basic:bind:12345678:AbCdEfGhIjKlMnOpQrStU',
          },
        },
      },
    ]);
  });
});
