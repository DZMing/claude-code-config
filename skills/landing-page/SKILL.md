---
name: landing-page
description: 快速生成高转化落地页：Hero + Features + Pricing + CTA + FAQ，使用 shadcn/ui 组件，无需设计师
---

# Landing Page — 快速生成高转化落地页

## 触发条件
- 用户说"帮我做落地页"、"生成首页"、"做个 landing page"
- 产品需要对外展示，还没有公开页面
- 需要把产品卖出去，需要介绍页面

## 工作流程
1. **收集信息**：产品名、一句话描述、3 个核心功能、目标用户、定价
2. **生成结构**：Hero → Problem → Solution → Features → Pricing → FAQ → CTA
3. **写文案**：聚焦用户痛点，不写功能列表，写用户得到的结果
4. **生成代码**：Next.js + Tailwind + shadcn/ui，直接可运行
5. **检查转化**：确保每屏都有 CTA，主按钮颜色对比度足够

## 输出规范
- 完整的 `app/page.tsx` 文件
- 所有 section 都在一个文件（Landing Page 不需要拆组件）
- 移动端优先（sm: breakpoint）
- 包含 `<meta>` SEO 标签

## 示例

**输入**：
> 我做了一个 AI 写作助手，帮用户克服写作空白页恐惧，$9/月，目标是自由撰稿人

**输出文案结构**：
```
Hero: "再也不用盯着空白页发呆" — [开始免费试用]
Problem: 80% 的写作时间浪费在"不知道怎么开始"
Solution: AI 给你第一句话，你来写剩下的
Features: 智能开头生成 / 风格匹配 / 大纲生成
Pricing: $9/月，7 天免费试用，随时取消
FAQ: 和 ChatGPT 有什么不同？会不会替代我写作？
```

**代码片段**：
```tsx
// Hero Section
export function Hero() {
  return (
    <section className="flex flex-col items-center py-24 text-center">
      <h1 className="text-5xl font-bold tracking-tight max-w-2xl">
        再也不用盯着空白页发呆
      </h1>
      <p className="mt-4 text-xl text-muted-foreground max-w-lg">
        AI 给你第一句话，你来写剩下的。80% 的写作时间浪费在开头——我们解决这个问题。
      </p>
      <Button size="lg" className="mt-8">开始 7 天免费试用</Button>
    </section>
  )
}
```
