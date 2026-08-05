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

`biliBasic` 是一个类 OAuth 的 Bili 登录方式。未登录流程统一调用 `signIn.biliBasic`：首次验证会创建用户、账户和 session，已绑定 MID 则直接登录原绑定账号。

## 服务端配置

`biliBasic(options?)` 支持以下配置：

| 配置项                  | 默认值               | 说明                                                                                                                                   |
| ----------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `infoRestrictions`      | 内置默认规则         | 使用 Standard Schema 兼容验证器限制 B 站账号信息。默认要求账号未封禁、粉丝数为非负数、等级为 `0-6`、VIP 类型为 `0-2`，并校验签名字段。 |
| `authMark`              | `"bauth"`            | 写入 B 站签名的标记。用户需要将 `${authMark}:${code}` 临时写入签名；撤销绑定时使用 `${authMark}::revoke`。                             |
| `skipCodeValidation`    | `false`              | 是否跳过 B 站签名和撤销标记校验。仅建议用于本地测试，生产环境不要开启。                                                                |
| `codeTTLSeconds`        | `3600`               | challenge 有效期，单位为秒，必须是正整数。每个 mid 同时只保留最新 challenge。                                                          |
| `codeLength`            | `5`                  | challenge 验证码长度，范围为 `1-100`。                                                                                                 |
| `userEmailDomain`       | `"bili.local"`       | 自动注册时临时邮箱的域名，例如 `123456@bili.local`。                                                                                   |
| `defaultUserNamePrefix` | `"bili"`             | B 站资料没有可用名称时生成用户名的前缀。                                                                                               |
| `signUpOnVerification`  | `{ enabled: false }` | 是否允许首次 Bili 登录自动创建用户。已有绑定账号的登录不受此开关影响。                                                                 |

### `signUpOnVerification`

```ts
{
  enabled?: boolean;
  deleteUserOnRevoke?: boolean;
  getTempEmail?: (mid: string) => string;
  getTempName?: (mid: string) => string;
}
```

- `enabled` 默认为 `false`。关闭时，首次 Bili 登录不会创建用户；已有绑定账号仍可通过 `signIn.biliBasic` 登录，已登录用户仍可调用 `link` 绑定 B 站账号。
- `deleteUserOnRevoke` 在 `enabled: true` 时默认也是 `true`。启用后，撤销绑定会删除该绑定对应的临时用户及其 session，适用于整个 Better Auth 实例只允许 B 站作为注册来源的场景。
- 将 `deleteUserOnRevoke` 设置为 `false` 时，撤销只删除 B 站绑定，保留 Better Auth 用户。
- 自动删除前会确认本地绑定账户确实对应目标用户，且用户邮箱仍是该配置生成的临时邮箱；用户修改过邮箱时不会被自动删除。
- `getTempEmail` 和 `getTempName` 可自定义自动注册用户的邮箱与名称。邮箱生成规则必须稳定，因为撤销时会使用同样的规则识别临时用户。

### `infoRestrictions` 示例

`infoRestrictions` 接受 Standard Schema 规范的验证器，下面以 Zod 为例：

```ts
import { z } from 'zod';

biliBasic({
  infoRestrictions: z.object({
    ban: z.literal(false),
    fans: z.number().int().min(100),
    level: z.literal(6),
  }),
});
```

Valibot、ArkType 等实现 Standard Schema 的常见验证库也可以直接传入。验证时会先检查 B 站签名，再使用 `infoRestrictions` 校验账号基本信息；自定义 schema 只需要声明希望限制的字段。

## 客户端

```ts
import { createAuthClient } from 'better-auth/client';
import { biliBasicClient } from 'better-auth-bili-basic/client';

export const authClient = createAuthClient({
  plugins: [biliBasicClient()],
});

const challenge = await authClient.biliBasic.send({ mid: 123456n });

// 未登录时：首次验证自动注册，已有绑定则直接登录。
await authClient.signIn.biliBasic({
  mid: 123456n,
  identifier: challenge.data.data.identifier,
});

// 已登录用户绑定未占用的 Bili 账号时，先为目标 MID 创建新的 challenge，
// 再调用 link；link 只用于绑定，不用于登录。
const linkChallenge = await authClient.biliBasic.send({ mid: 654321n });
await authClient.biliBasic.link({
  mid: 654321n,
  identifier: linkChallenge.data.data.identifier,
});
```

所有客户端动作都接受 `number | bigint | string` 类型的 `mid`。`number` 必须是非负安全整数。

## 工具函数

```ts
import { BiliInfo, ValidateBiliInfo } from 'better-auth-bili-basic';
```
