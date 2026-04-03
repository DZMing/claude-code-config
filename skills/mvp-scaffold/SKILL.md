---
name: mvp-scaffold
description: Next.js MVP 脚手架一键初始化：App Router + Supabase + Stripe + Shadcn/ui + 认证，含数据库 schema
---

# MVP Scaffold — 项目脚手架一键初始化

## 触发条件
- 用户说"帮我搭一个新项目"、"从零开始做 SaaS"、"脚手架"
- 新项目需要完整的认证 + 支付 + 数据库基础设施
- 不想每次都重新配置同样的东西

## 工作流程
1. **创建 Next.js 项目**：`npx create-next-app@latest --typescript --tailwind --app`
2. **安装核心依赖**：supabase, stripe, resend, shadcn/ui
3. **生成目录结构**：按标准约定创建所有文件夹
4. **生成数据库 Schema**：users + subscriptions + [主表]
5. **配置环境变量模板**：`.env.example`
6. **生成基础页面**：首页 + 登录 + Dashboard + Pricing

## 输出规范
- 完整的 `package.json` 依赖列表
- 标准化目录结构
- `supabase/migrations/001_init.sql` 基础 schema
- `.env.example` 完整变量列表
- 可直接运行的起步代码

## 示例

**输入**：> 帮我搭一个 AI 写作助手 SaaS，用 Supabase + Stripe

**输出 — 目录结构**：
```
my-app/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   └── dashboard/page.tsx
│   ├── api/
│   │   ├── checkout/route.ts
│   │   └── webhooks/stripe/route.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/ui/        # shadcn/ui 组件
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   └── stripe.ts
├── supabase/
│   └── migrations/
│       └── 001_init.sql
└── middleware.ts
```

**输出 — `supabase/migrations/001_init.sql`**：
```sql
-- 用户扩展表（Supabase auth.users 的业务数据）
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 订阅表
CREATE TABLE public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'inactive', -- inactive | active | canceled
  plan TEXT NOT NULL DEFAULT 'free',       -- free | pro | team
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 自动创建 profile（触发器）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name',
          NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```
