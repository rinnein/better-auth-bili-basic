# Better Auth Bili Basic

用于 Better Auth 的 B 站账号归属验证插件。插件通过让用户临时修改 B 站签名完成验证，不会触发账号异地登录。

## 安装

```bash
vp add better-auth-bili-basic
```

## 服务端

```ts
import { betterAuth } from 'better-auth';
import { biliBasic } from 'better-auth-bili-basic/server';

export const auth = betterAuth({
  plugins: [
    biliBasic({
      signUpOnVerification: {
        enabled: true,
        // enabled=true 时默认开启；显式 false 可保留用户。
        deleteUserOnRevoke: true,
      },
    }),
  ],
});
```

`authMark` 默认是 `bauth`。本地测试如需跳过 B 站签名校验，必须显式设置 `skipCodeValidation: true`。

## 客户端

```ts
import { createAuthClient } from 'better-auth/client';
import { biliBasicClient } from 'better-auth-bili-basic/client';

export const authClient = createAuthClient({
  plugins: [biliBasicClient()],
});

const challenge = await authClient.biliBasic.send({ mid: 123456n });

await authClient.biliBasic.link({
  mid: 123456n,
  identifier: challenge.data.data.identifier,
});

await authClient.signIn.biliBasic({
  mid: 123456n,
  identifier: challenge.data.data.identifier,
});
```

所有客户端动作都接受 `number | bigint | string` 类型的 `mid`。`number` 必须是非负安全整数。

## 工具函数

```ts
import { BiliInfo, ValidateBiliInfo } from 'better-auth-bili-basic';
```

账号基本信息验证规则通过 `infoRestrictions` 配置。插件只使用 Better Auth 的核心 `account` 和 `verification` 表，不需要新增插件表或额外迁移。
