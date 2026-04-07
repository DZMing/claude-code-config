# CI/CD 集成

> 将项目管理集成到持续集成/部署流程中

---

## 自动生成报告

### GitHub Actions 配置

在项目 `.github/workflows/progress-report.yml`：

```yaml
name: Generate Progress Report

on:
  workflow_dispatch:  # 手动触发
  schedule:
    - cron: '0 9 * * 1'  # 每周一上午9点执行
  push:
    branches:
      - main  # 主分支有更新时

jobs:
  progress-report:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      issues: write
      pull-requests: write

    steps:
      - name: 检出代码
        uses: actions/checkout@v3
        with:
          fetch-depth: 0  # 获取完整Git历史

      - name: 设置Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'

      - name: 安装依赖
        run: |
          pip install claude-code-progress-tracker

      - name: 生成进度报告
        id: progress
        run: |
          progress_tracker generate --format markdown --output report.md
          echo "report_content=$(cat report.md)" >> $GITHUB_OUTPUT
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

**效果：** 每周一自动生成项目进度报告

---

## 自动更新项目状态

### 在 CI 流程末尾

```yaml
# .github/workflows/ci.yml
jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: 运行测试
        run: |
          npm install
          npm test

      - name: 生成测试覆盖率报告
        run: |
          npm run test:coverage

      - name: 更新项目状态
        if: github.ref == 'refs/heads/main' && success()
        run: |
          # 将测试覆盖率写入项目状态
          coverage=$(cat coverage/lcov-report/coverage-summary.json | jq '.total.lines.pct')
          echo "测试覆盖率: ${coverage}%" >> docs/项目状态.md
```

---

## Slack/企业微信通知

### 推送进度到Slack

```yaml
name: Slack Progress Notification

on:
  workflow_dispatch:

jobs:
  notify:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: 生成进度摘要
        id: summary
        run: |
          # 读取项目状态
          if [ -f "docs/项目状态.md" ]; then
            progress=$(grep "整体进度" docs/项目状态.md | grep -oP '\d+%')
            echo "progress=$progress" >> $GITHUB_OUTPUT
          fi

      - name: 发送到Slack
        uses: 8398a7/action-slack@v3
        with:
          status: custom
          custom_payload: |
            {
              "text": "📊 项目进度更新",
              "attachments": [{
                "color": "good",
                "fields": [
                  {
                    "title": "整体进度",
                    "value": "${{ steps.summary.outputs.progress }}",
                    "short": true
                  }
                ]
              }]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## 生产部署检查清单

```yaml
# deploy-production.yml
jobs:
  pre-deploy-check:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: 生产部署检查
        run: |
          # 1. 检查进度
          progress=$(grep "整体进度" docs/项目状态.md | grep -oP '\d+%')
          progress_num=${progress%\%}

          if [ $progress_num -lt 90 ]; then
            echo "⚠️ 项目进度 $progress，建议完成度达到90%再部署"
          fi

          # 2. 检查TODO
          todo_count=$(grep -r "TODO" src/ --include="*.py" | wc -l)
          if [ $todo_count -gt 5 ]; then
            echo "⚠️ 还有 $todo_count 个TODO，建议清理"
          fi

          # 3. 检查测试
          if ! grep -q "测试覆盖率" docs/项目状态.md; then
            echo "❌ 缺少测试覆盖率信息"
            exit 1
          fi
```

---

## 自动生成周报

```yaml
name: Weekly Report

on:
  schedule:
    - cron: '0 9 * * 5'  # 每周五上午9点

jobs:
  weekly-report:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 7

      - name: 生成本周总结
        run: |
          # 获取本周提交
          echo "## 本周完成" > weekly.md
          git log --oneline --since="1 week ago" >> weekly.md

          # 读取项目状态
          echo "## 项目状态" >> weekly.md
          cat docs/项目状态.md | head -50 >> weekly.md
```

---

## 快速开始

使用 GitHub Actions 集成项目管理：

```bash
# 在项目根目录创建
cd 项目
mkdir -p .github/workflows

# 创建以下工作流文件
# 1. progress-report.yml       - 自动生成进度报告
# 2. pre-deploy-check.yml      - 部署前检查
# 3. weekly-report.yml         - 自动生成周报
```

启用后，你的CI流程将自动：
- ✅ 检查进度和代码质量
- ✅ 生成报告并通知团队
- ✅ 更新项目文档
- ✅ 每周自动生成周报

---
