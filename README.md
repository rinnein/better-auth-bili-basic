# Better Auth Bili Basic

一个提供B站账号归属验证的BetterAuth库，通过临时修改签名添加验证码的方法进行验证，不会导致账号异地登录等安全风险。

附带提供了基于zod的账号基本信息验证。

## 安装

```bash
bun install better-auth-bili-basic
```

## 使用

```ts
import { biliBasicAuth } from 'better-auth-bili-basic';

