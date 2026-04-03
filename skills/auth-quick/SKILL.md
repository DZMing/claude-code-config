---
name: auth-quick
description: 5 分钟认证集成：Supabase Auth 或 Clerk，含 Google/GitHub OAuth，中间件保护路由，代码直接可用
---

# Auth Quick — 5 分钟认证集成

## 触发条件
- 用户说"加登录功能"、"做认证"、"用户注册登录"
- 需要保护路由，只有登录用户才能访问
- 需要 OAuth（Google / GitHub）

## 工作流程（Supabase Auth 路线）
1. **安装**：`npm install @supabase/supabase-js @supabase/ssr`
2. **创建 Supabase Client**：server / client / middleware 三个工具文件
3. **配置 OAuth**：在 Supabase Dashboard 开启 Google Provider
4. **登录页面**：邮箱密码 + Google 按钮
5. **中间件保护**：未登录自动跳转 `/login`
6. **测试**：注册 → 登录 → 访问保护页 → 退出

## 输出规范
- `lib/supabase/server.ts`：服务端 client
- `lib/supabase/client.ts`：客户端 client
- `middleware.ts`：路由保护
- `app/login/page.tsx`：登录页面（含 Google OAuth）

## 示例

**输出 — `middleware.ts`**：
```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options))
        }
      }
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/protected/:path*'],
}
```

**输出 — Google 登录按钮**：
```tsx
async function signInWithGoogle() {
  const supabase = createClient()
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${location.origin}/auth/callback` },
  })
}
```
