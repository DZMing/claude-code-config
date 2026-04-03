---
name: ship-checklist
description: 上线前必检清单：域名/SSL/SEO meta/OG 图/法律页面/错误监控/分析代码，逐项确认不漏项
---

# Ship Checklist — 上线前必检清单

## 触发条件
- 用户说"我要上线了"、"准备发布"、"deploy 之前要做什么"
- 产品功能开发完，准备对外公开
- 第一次上线，不知道要检查什么

## 工作流程
运行完整清单，每项都要确认 ✅ 或说明为什么跳过：

### 🌐 域名 & 基础设施
- [ ] 自定义域名已绑定（不用 vercel.app 子域）
- [ ] SSL 证书有效（HTTPS 强制跳转）
- [ ] www 重定向到 non-www（或反过来，保持一致）
- [ ] 环境变量全部在 Vercel/Railway 配好

### 🔍 SEO & 社交分享
- [ ] `<title>` 每页不同，< 60 字符
- [ ] `<meta name="description">` 每页，< 160 字符
- [ ] OG 图 1200×630px（`og:image`）
- [ ] `robots.txt` 存在（`/public/robots.txt`）
- [ ] `sitemap.xml` 已生成

### 💳 支付 & 认证
- [ ] Stripe Webhook 端点已在 Stripe Dashboard 注册
- [ ] Webhook Secret 已配到环境变量
- [ ] 用真实卡号测试过一次完整购买流程
- [ ] 退款流程已测试

### ⚖️ 法律页面
- [ ] Privacy Policy（隐私政策，用 AI 生成）
- [ ] Terms of Service（服务条款）
- [ ] Cookie Banner（如果在 EU 有用户）

### 📊 监控 & 分析
- [ ] Plausible 或 Vercel Analytics 已添加
- [ ] Sentry 错误监控已配置
- [ ] Uptime 监控（BetterUptime 免费计划）

### 📧 邮件
- [ ] 注册确认邮件能收到
- [ ] "忘记密码"邮件能收到
- [ ] 发件人不是 noreply@supabase.io（配自定义 SMTP）

## 输出规范
- 逐项输出 ✅ / ❌ / ⚠️ 状态
- ❌ 项给出最快修复方式（< 5 分钟能搞定的先搞定）
- 输出最终上线宣言格式

## 示例

**输入**：> 帮我做上线前检查，我的产品是 AI 写作助手，部署在 Vercel

**输出片段**：
```
🌐 域名 & 基础设施
✅ 域名：writefast.app 已绑定
✅ SSL：HTTPS 自动启用（Vercel 提供）
❌ www 重定向：未配置 → 在 Vercel Domains 设置中添加 www → writefast.app 的重定向规则

🔍 SEO
⚠️ OG 图：未找到 /public/og.png → 用 Figma 或 og-image.vercel.app 快速生成一张
✅ robots.txt：存在

📊 监控
❌ 错误监控：未配置 → 5 分钟方案：运行 npx @sentry/wizard@latest -i nextjs
```
