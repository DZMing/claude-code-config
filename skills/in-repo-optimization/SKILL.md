---
name: in-repo-optimization
description: |
  仓库级优化：为项目创建 .claude-local.md 配置，覆盖全局规则。
  触发词：项目配置, .claude-local, 仓库优化
---
# In-Repo 优化

## 概念

```
会话上下文 > 仓库配置(.claude-local.md) > 全局配置(~/.claude/CLAUDE.md)
```

仓库配置放在项目根目录，优先级高于全局配置，只对当前项目生效

## .claude-local.md 模板

```markdown
# {项目名} 配置

## 技术栈
- 前端：React / Vue / Svelte
- 后端：FastAPI / Express / Next.js
- 数据库：PostgreSQL / MongoDB / SQLite
- 部署：Vercel / Railway / Cloudflare

## 代码风格
- 组件命名：PascalCase
- 工具函数：camelCase
- API路由：kebab-case

## 快捷命令
- `npm test` — 前端测试
- `pytest` — 后端测试
- `npm run dev` — 开发服务器

## 已知问题
- 问题：CORS 跨域 / 解决：vite.config.ts 配置代理
- 问题：连接池耗尽 / 解决：POOL_SIZE=20
```

## 自动检测项目类型

| 检测文件 | 项目类型 | 包管理器 |
|---------|---------|---------|
| pnpm-lock.yaml | Node.js | pnpm |
| yarn.lock | Node.js | yarn |
| package-lock.json | Node.js | npm |
| requirements.txt | Python | pip |
| pyproject.toml | Python | poetry |
| go.mod | Go | go |
| Cargo.toml | Rust | cargo |

## 最佳实践

- **只覆盖项目特定规则**：全局已有的不重复
- **团队共享**：提交到 Git，团队成员都能用
- **定期更新**：技术栈变化时同步更新
- **相对路径**：不要硬编码绝对路径
