---
name: feedback-loop
description: 用户反馈系统：嵌入式反馈按钮 + 自动分类（Bug/功能请求/好评）+ 邮件通知，15 分钟集成完成
---

# Feedback Loop — 用户反馈系统

## 触发条件
- 用户说"加反馈功能"、"收集用户意见"、"做用户反馈"
- 产品上线后需要了解用户在想什么
- 需要知道哪里出了问题

## 工作流程
1. **反馈按钮**：页面右下角固定按钮，点击弹出表单
2. **收集信息**：类型（Bug/功能请求/其他）+ 描述 + 截图（可选）
3. **存入数据库**：Supabase `feedback` 表
4. **发邮件通知**：Resend 发给开发者
5. **Dashboard**：在后台看所有反馈，标记已读/处理中/已完成

## 输出规范
- `components/feedback-widget.tsx`：悬浮反馈按钮 + 表单
- `app/api/feedback/route.ts`：API 端点
- `supabase/migrations/002_feedback.sql`：数据库表
- `app/(dashboard)/feedback/page.tsx`：反馈管理页

## 示例

**输入**：> 帮我在项目里加一个用户反馈收集功能，有 Bug 和功能请求两种类型

**输出 — `components/feedback-widget.tsx`**：
```tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquare, X } from 'lucide-react'

type FeedbackType = 'bug' | 'feature' | 'other'

export function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>('feature')
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)

  async function submit() {
    await fetch('/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ type, text, url: location.href }),
    })
    setSent(true)
    setTimeout(() => { setOpen(false); setSent(false); setText('') }, 2000)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <div className="bg-background border rounded-xl shadow-lg p-4 w-80">
          <div className="flex justify-between mb-3">
            <span className="font-medium text-sm">发送反馈</span>
            <X className="w-4 h-4 cursor-pointer" onClick={() => setOpen(false)} />
          </div>
          <div className="flex gap-2 mb-3">
            {(['bug', 'feature', 'other'] as FeedbackType[]).map(t => (
              <button key={t} onClick={() => setType(t)}
                className={\`px-3 py-1 text-xs rounded-full border \${type === t ? 'bg-primary text-primary-foreground' : ''}\`}>
                {t === 'bug' ? '🐛 Bug' : t === 'feature' ? '✨ 功能' : '💬 其他'}
              </button>
            ))}
          </div>
          <Textarea placeholder="描述一下..." value={text} onChange={e => setText(e.target.value)} rows={3} />
          <Button className="w-full mt-2" size="sm" onClick={submit} disabled={!text || sent}>
            {sent ? '已发送 ✅' : '发送'}
          </Button>
        </div>
      ) : (
        <Button size="icon" className="rounded-full shadow-lg" onClick={() => setOpen(true)}>
          <MessageSquare className="w-5 h-5" />
        </Button>
      )}
    </div>
  )
}
```

**输出 — 数据库 Schema**：
```sql
CREATE TABLE public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'other')),
  text TEXT NOT NULL,
  url TEXT,
  user_id UUID REFERENCES public.profiles,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'done')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
