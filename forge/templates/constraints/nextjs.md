# Next.js 项目架构约束

## 技术栈
TypeScript + Next.js App Router + Prisma ORM + PostgreSQL + Vercel

## 目录规范
```
src/
├── app/          # 页面、布局、API Routes（仅放路由/页面文件）
├── components/   # 纯 UI 组件（无业务逻辑）
├── lib/          # 工具函数、配置、常量
├── server/       # 服务端逻辑（Server Actions、DB 查询）
└── types/        # TypeScript 类型定义
prisma/           # Prisma schema 和 migrations
```

## 架构边界（violations = 阻断 commit）
- `src/components/` 禁止直接导入 `src/server/`
- `src/app/` API Routes 只能调用 `src/server/`，不能直接操作 DB
- 所有 DB 操作必须经过 `src/server/`

## 命令配置
```json
{
  "test": "npx vitest run",
  "lint": "npx next lint && npx tsc --noEmit",
  "format": "npx prettier --write .",
  "arch_check": "npx tsc --noEmit && npx next lint",
  "dev": "npm run dev",
  "build": "npm run build"
}
```

## CI/CD
- **CI**: GitHub Actions（自动生成 `.github/workflows/ci.yml`）
  - Push 时触发：lint + type-check + vitest
- **部署**: Vercel（连接 GitHub 仓库后自动部署）

## 测试策略
- 单元测试：vitest
- 组件测试：@testing-library/react
- E2E：暂不配置（MVP 阶段）

## 安全要求
- 环境变量通过 `.env.local`（本地）和 Vercel 环境变量（生产）管理
- 禁止硬编码 API Keys、数据库密码
- Server Actions 必须验证用户权限
