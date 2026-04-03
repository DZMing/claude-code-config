---
name: stripe-setup
description: Stripe 支付 5 步集成：Checkout Session + Webhook + 订阅管理，含完整代码模板和测试清单
---

# Stripe Setup — 5 步集成支付

## 触发条件
- 用户说"帮我加支付"、"集成 Stripe"、"做付费功能"
- 产品需要收钱，还没有支付功能
- Webhook 不知道怎么配置

## 工作流程
1. **安装依赖**：`npm install stripe @stripe/stripe-js`
2. **配置环境变量**：`STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
3. **创建 Checkout Session**：服务端 API Route
4. **配置 Webhook**：处理 `checkout.session.completed` 事件
5. **更新数据库**：付款成功后解锁用户权限
6. **测试**：用 `stripe listen` 本地测试，再上线

## 输出规范
- `app/api/checkout/route.ts`：创建 Checkout Session
- `app/api/webhooks/stripe/route.ts`：Webhook 处理器
- `lib/stripe.ts`：Stripe 实例初始化
- `.env.example` 更新

## 示例

**输入**：
> 我有个 Next.js + Supabase 项目，需要加 $9/月订阅

**输出 — `lib/stripe.ts`**：
```ts
import Stripe from 'stripe'
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
})
```

**输出 — `app/api/checkout/route.ts`**：
```ts
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: user.email,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing`,
    metadata: { userId: user.id },
  })
  return Response.json({ url: session.url })
}
```

**输出 — Webhook 核心逻辑**：
```ts
case 'checkout.session.completed': {
  const session = event.data.object
  await supabase.from('subscriptions').upsert({
    user_id: session.metadata.userId,
    stripe_customer_id: session.customer as string,
    status: 'active',
  })
  break
}
```
