# Better Auth Bili Basic

一个提供B站账号归属验证的BetterAuth库，通过临时修改签名添加验证码的方法进行验证，不会导致账号异地登录等安全风险。

附带提供了基于zod的账号基本信息验证。

## 安装

```bash
bun install better-auth-bili-basic
```

## 使用

```ts
import { betterAuth } from 'better-auth';
import { createAuthClient } from 'better-auth/client';
import { biliBasicPlugin } from 'better-auth-bili-basic';
import { biliBasicClient } from 'better-auth-bili-basic/client';

const auth = betterAuth({
  plugins: [biliBasicPlugin()],
});

const client = createAuthClient({
  plugins: [biliBasicClient()],
});

await client.biliBasic.send(123456n);
await client.signIn.biliBasic({
  mid: 123456n,
  identifier: 'bili-basic:bind:12345678:abcde',
});
```
