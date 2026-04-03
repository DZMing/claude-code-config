# 通用 Web 项目架构约束

## 适用场景
适用于技术栈无法自动识别，或使用非 Next.js/FastAPI 框架的项目。

## 通用目录规范
```
src/
├── components/   # UI 组件
├── utils/        # 工具函数
├── api/          # API 调用封装
├── types/        # 类型定义
└── styles/       # 样式文件
tests/            # 测试文件（与 src 平级）
```

## 通用架构边界
- UI 组件不包含业务逻辑（单一职责）
- API 调用必须集中在 `api/` 目录，不散落在组件里
- 工具函数不依赖外部状态

## 命令配置（Forge 会尝试自动检测，无法检测时用以下默认值）
```json
{
  "test": "npm test",
  "lint": "npm run lint",
  "format": "npm run format",
  "dev": "npm run dev",
  "build": "npm run build"
}
```

## CI/CD
- **CI**: GitHub Actions（自动生成）
- **部署**: 根据项目类型自动选择（Vercel/Netlify/Railway）

## 测试策略
- 框架无关：先跑现有测试命令
- 如无测试：Forge 在第一个执行阶段自动配置测试框架

## 安全要求
- 敏感信息通过环境变量管理
- 不硬编码 API Keys
- 输入验证在服务端进行
