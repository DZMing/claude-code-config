# {项目名称} 仓库特定配置

> **说明**：将此文件复制到项目根目录并重命名为 `.claude-local.md`
> **优先级**：仓库配置 > 全局配置（`~/.claude/CLAUDE.md`）

---

## 项目技术栈

### 前端
- **框架**: React / Vue / Svelte / Next.js / Nuxt
- **样式**: Tailwind CSS / CSS Modules / Styled Components
- **状态管理**: Redux / Zustand / Jotai / Pinia

### 后端
- **框架**: FastAPI / Express / Django / Next.js API
- **数据库**: PostgreSQL / MongoDB / SQLite
- **ORM**: Prisma / SQLAlchemy / Mongoose

### 部署
- **平台**: Vercel / Railway / Cloudflare Workers
- **CI/CD**: GitHub Actions / GitLab CI

---

## 代码风格偏好

### 命名规范
- **组件/类**: PascalCase（如 `UserProfile.tsx`）
- **函数/变量**: camelCase（如 `formatDate`）
- **常量**: UPPER_SNAKE_CASE（如 `API_BASE_URL`）
- **文件名**: kebab-case（如 `user-profile.tsx`）

### 文件组织
- **按功能**: `features/auth/`, `features/user/`
- **按层级**: `components/`, `hooks/`, `utils/`, `services/`
- **按类型**: `api/`, `types/`, `utils/`, `constants/`

### 注释风格
- **函数**: JSDoc / TSDoc
- **复杂逻辑**: 块注释解释 Why
- **TODO**: 标记未完成功能

---

## 项目特定命令

### 测试
```bash
# 前端测试
npm test

# 后端测试
pytest

# E2E 测试
npm run test:e2e
```

### 开发
```bash
# 前端开发服务器
npm run dev

# 后端开发服务器
python -m uvicorn main:app

# 同时启动前后端
npm run dev:all
```

### 数据库
```bash
# 运行迁移
npm run db:migrate

# 回滚迁移
npm run db:rollback

# 重置数据库
npm run db:reset
```

### 构建
```bash
# 生产构建
npm run build

# 本地预览构建
npm run preview
```

### 部署
```bash
# 部署到预览环境
npm run deploy:preview

# 部署到生产环境
npm run deploy:prod
```

---

## 已知问题与解决方案

### 问题 1：CORS 跨域
**现象**：前端调 API 报 CORS 错误
**解决方案**：
- 开发环境：已在 `vite.config.ts` 配置代理
- 生产环境：已在后端配置 CORS 白名单

### 问题 2：数据库连接池耗尽
**现象**：高并发时数据库连接超时
**解决方案**：
- 环境变量：`DATABASE_POOL_SIZE=20`
- 连接超时：`DATABASE_TIMEOUT=30`

### 问题 3：环境变量缺失
**现象**：`process.env.XXX` 为 undefined
**解决方案**：
- 复制 `.env.example` 为 `.env`
- 填写必需的环境变量
- 不要提交 `.env` 到 Git

---

## 特定规则覆盖（覆盖全局配置）

### 测试框架
- **全局默认**: Jest
- **项目特定**: Vitest
- **覆盖命令**: `npm run test` 使用 Vitest

### 代码格式化
- **全局默认**: Prettier
- **项目特定**: Biome
- **覆盖命令**: `npm run format` 使用 Biome

### 包管理器
- **全局默认**: npm
- **项目特定**: pnpm
- **覆盖命令**: 所有 `npm` 命令替换为 `pnpm`

---

## 团队协作说明

### Git 工作流
- **主分支**: `main`
- **开发分支**: `feature/*`, `fix/*`
- **发布分支**: `release/*`

### Code Review
- **必须审查**: 所有 `main` 分支的 PR
- **自动检查**: CI 必须通过
- **审查重点**: 安全性、性能、可维护性

### 问题报告
- **Bug**: GitHub Issues
- **功能请求**: GitHub Discussions
- **紧急问题**: 联系维护者

---

## 项目特定快捷键（供 AI 使用）

| 快捷键 | 功能 | 说明 |
|-------|------|------|
| `/test` | 运行测试 | 根据项目类型选择测试命令 |
| `/dev` | 启动开发服务器 | 自动识别前后端并启动 |
| `/build` | 构建项目 | 运行生产构建 |
| `/deploy` | 部署项目 | 部署到配置的环境 |
| `/db-reset` | 重置数据库 | 删除并重新创建数据库 |
| `/clean` | 清理缓存 | 清理 node_modules、构建缓存等 |

---

**最后更新**: {YYYY-MM-DD}
**维护者**: {团队或个人}
