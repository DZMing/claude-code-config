# FastAPI 项目架构约束

## 技术栈
Python + FastAPI + PostgreSQL + SQLAlchemy + Alembic + Docker

## 目录规范
```
app/
├── api/          # API 路由（仅放路由定义）
├── core/         # 配置、安全、依赖注入
├── models/       # SQLAlchemy 模型
├── schemas/      # Pydantic 请求/响应模型
├── services/     # 业务逻辑
└── repositories/ # 数据库操作（Repository Pattern）
alembic/          # 数据库 migrations
tests/            # 测试
```

## 架构边界（violations = 阻断 commit）
- `app/api/` 禁止直接操作数据库，必须通过 `app/services/`
- `app/services/` 通过 `app/repositories/` 访问 DB，不能直接写 SQLAlchemy 查询
- `app/models/` 禁止包含业务逻辑

## 命令配置
```json
{
  "test": "pytest tests/ -v",
  "lint": "ruff check . && mypy app/",
  "format": "ruff format .",
  "dev": "uvicorn app.main:app --reload",
  "migrate": "alembic upgrade head"
}
```

## CI/CD
- **CI**: GitHub Actions（自动生成 `.github/workflows/ci.yml`）
  - Push 时触发：ruff + mypy + pytest
- **部署**: Docker + Railway / Render

## 测试策略
- 单元测试：pytest
- API 测试：httpx + pytest-asyncio
- 数据库：使用 SQLite 测试数据库

## 安全要求
- 密钥通过 `.env` + python-dotenv 管理
- 所有 API 端点必须配置权限验证
- SQL 查询使用参数化（禁止字符串拼接）
