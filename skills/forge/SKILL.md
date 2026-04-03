---
name: forge
description: Forge 全自动开发引擎：任何需求 → 全自动从规划到部署。融合 GSD（规划）+ gstack（执行质量）+ Hooks 线束（质量自动触发）。
triggers:
  - /forge
  - forge new
  - forge resume
---

# Forge — 全自动开发引擎

> 非程序员友好。你只需要：① 说明你想做什么（任何形式）② 等待完成报告

## 使用方式

- `/forge` — 任何场景入口（新项目 / 加功能 / 修 bug / 接管现有项目）
- `/forge resume <项目名>` — 恢复中断的项目
- `/forge:status` — 查看所有项目状态

## 支持的场景

| 用户输入 | 流程 |
|---------|------|
| "我想做一个XXX" / 粘贴 PRD | FLOW_NEW — 新项目 |
| "给番茄计时器加历史统计" | FLOW_EVOLVE — 给已有项目加功能 |
| "登录页面报错了" / "加载很慢" | FLOW_FIX — 修 bug |
| "需求变了，要加多语言" | FLOW_PIVOT — 需求变更 |
| "帮我更新依赖 / 清理代码" | FLOW_MAINTAIN — 维护任务 |
| "我有个项目，用 Forge 管起来" | FLOW_ADOPT — 接管现有项目 |

---

## 关键原则

1. **所有状态存磁盘，不依赖对话记忆**：GSD 的 `.planning/STATE.md` 是主状态，`~/.forge/projects/{slug}/state.json` 是状态枢纽
2. **薄集成层**：不修改 GSD/gstack 源文件，只编排它们
3. **自动处理所有错误**：测试失败自动修3轮，QA 问题自动修，只有真正的人工操作（OAuth、短信验证码）才停下来请求帮助
4. **中文报告**：所有进度、错误、结果用非技术中文

---

## ═══════════════════════════════════
## STEP 0 — 通用意图路由器
## ═══════════════════════════════════

读取 `~/.forge/config.json` 获取全局配置。
读取桥接文件（如存在）了解当前项目状态。

### 维度 1 — 分析用户输入（任何格式）

关键词匹配（按优先级）：

| 匹配词 | 路由 |
|--------|------|
| "resume" / "恢复" + 项目名 | FLOW_RESUME |
| "新项目" / "从零" / "PRD" / "我想做一个" | FLOW_NEW → STEP 1 |
| "加功能" / "新功能" / "扩展" / "我想加" / "增加" | FLOW_EVOLVE |
| "bug" / "修复" / "报错" / "不工作" / "很慢" / "出问题" | FLOW_FIX |
| "需求变了" / "改需求" / "客户要" / "要改" | FLOW_PIVOT |
| "更新依赖" / "清理" / "维护" / "重构" / "升级" | FLOW_MAINTAIN |
| "接管" / "用Forge管理" / "管起来" | FLOW_ADOPT |

### 维度 2 — 检测项目状态

```
有 .planning/ + ROADMAP.md              → 已有 GSD 项目（active）
forge state.json status == "completed"  → 已完成项目
有 package.json 但无 .planning/         → 有代码但未管理
空目录 / 无代码文件                     → 新项目
```

### 交叉路由决策

| 用户说 | 项目状态 | 路由 |
|--------|---------|------|
| 任何需求 | 空目录 | FLOW_NEW |
| 加功能 | 已有 GSD 项目（active） | FLOW_EVOLVE → `gsd:add-phase` |
| 加功能 | 已完成项目 | FLOW_EVOLVE → `gsd:new-milestone` |
| 修 bug | 任何有代码 | FLOW_FIX |
| 无法判断 | 有代码但未管理 | 输出选择题（见下） |

**无法判断时** — 输出选择题，不要猜：

```
我看到这个目录有代码，你想做什么？

A. 给现有代码加新功能
B. 修复一个 bug 或问题
C. 用 Forge 接管这个项目（建立规划结构）
D. 这是新项目，从头开始

请回复 A / B / C / D
```

等待用户回复后按 A→FLOW_EVOLVE / B→FLOW_FIX / C→FLOW_ADOPT / D→FLOW_NEW 路由。

### FLOW_RESUME（恢复中断的项目）

```
从参数提取项目名/slug。
读取 ~/.forge/projects/{slug}/state.json：
  - 如有 .planning/HANDOFF.json → 调用 Skill("gsd:resume-work")
  - 否则读 state.json 的 phase.current → 跳到 STEP 4 的第 phase.current 次循环迭代

输出：「正在从第 N/M 阶段恢复项目 {名称}...」

注意：phase.current 是 ROADMAP 里的开发阶段序号（1, 2, 3...），不是 STEP 编号。
```

---

## ═══════════════════════════════════
## STEP 1 — 通用访谈（格式自适应）
## ═══════════════════════════════════

> **仅适用于 FLOW_NEW 和 FLOW_EVOLVE**。FLOW_FIX / FLOW_PIVOT / FLOW_MAINTAIN / FLOW_ADOPT 有独立流程，直接跳到对应 FLOW 章节。

读取用户输入（任何格式）。

### 1-0. 格式检测 → 决定访谈深度

| 输入类型 | 特征 | 访谈深度 |
|---------|------|---------|
| 结构化 PRD | 有标题/功能列表/技术要求 | 苏格拉底访谈（不限轮数，执行 1a→1d） |
| 自然语言一句话 | "我想做XXX" | 精简访谈（最多 3 轮，执行简化版 1a→1d） |
| 功能请求 | "加个XX功能" | 2 轮边界确认（跳过 1a，直接 1b） |
| 维护任务 | "更新依赖/清理代码" | 0 轮，直接继续 STEP 2 |

> **核心原则**：全自动开发方向错了代价极大，必须先搞清楚才开始。
> 维护类任务不需要访谈 — 直接执行。

---

### 1a. 提取已知信息

从 PRD 中识别：

| 维度 | 已知？ | 来源 |
|------|--------|------|
| 项目名称 | | |
| 核心问题/痛点 | | |
| 目标用户 | | |
| 核心功能（Must Have） | | |
| 非核心功能（Nice to Have） | | |
| 明确不做的事 | | |
| 技术/平台偏好 | | |
| 部署方式 | | |
| 特殊集成（支付/认证/第三方）| | |
| 上线时间要求 | | |

---

### 1b. 识别缺口与矛盾

逐条检查以下问题，标记哪些在 PRD 中**没有明确答案**或**有矛盾**：

**关于产品定义：**
- 核心用户场景是什么？（典型用户 → 做什么 → 得到什么结果）
- 哪 3 个功能是绝对 Must Have，没有就不能上线？
- 有没有功能乍看像必须的，但其实可以推后？
- 有没有隐含的功能（比如"用户系统"暗示需要注册/登录）？

**关于规模与约束：**
- 预期用户量级？（个人用、小团队、公开产品）
- 有没有现有系统要对接或迁移数据？
- 有没有预算/技术栈硬限制？

**关于验收标准：**
- 什么算"做完了"？用什么标准判断？
- 有没有具体的界面/交互描述，还是只有功能描述？

---

### 1c. 分轮提问（每轮最多 5 个问题）

**规则：**
- 只问**真正影响开发方向**的问题，技术实现细节自己决定
- 每轮把相关问题打包问，不要一次一个
- 用户回答后，更新已知信息表，再判断是否还有疑问
- **轮数不限** — 一直问到真正搞清楚为止，不能因为"问够了"就停
- 每轮结束后评估：如果还有任何影响核心方向的不确定，继续下一轮

**第一轮问题模板**（根据实际缺口调整）：

```
我读完了你的 PRD，有几个问题需要确认才能开始：

【核心场景】
1. {针对最核心用户场景的问题}

【功能边界】
2. {关于 Must Have vs Nice to Have 的问题}
3. {关于隐含功能是否真的需要的问题}

【验收标准】
4. {关于怎么算做完的问题}

【约束条件】（如果有不确定的）
5. {关于平台/预算/集成的问题}
```

**等待用户回答，然后继续第二轮（如有需要）。**

---

### 1d. 定稿确认

当所有关键问题已有答案后，输出定稿摘要：

```
好，定稿了。我对这个项目的理解是：

**项目**：{项目名} — {一句话定义}

**要解决的问题**：{用户痛点}

**核心功能**（按优先级）：
1. ✅ {Must Have 1} — {一句话说清楚边界}
2. ✅ {Must Have 2} — {一句话说清楚边界}
3. ✅ {Must Have 3} — {一句话说清楚边界}
4. 🕐 {Nice to Have，先跳过}

**不做**：{明确排除的功能}

**技术方向**：{技术栈} → 部署到 {平台}

**验收标准**：{什么算做完了}

---
有没有哪里不对？没问题的话我就开始了。
```

**等待用户确认。确认（或无异议）后继续 STEP 2。**

---

## ═══════════════════════════════════
## STEP 2 — 项目脚手架
## ═══════════════════════════════════

### 2a. 检测技术栈

读取 `~/.forge/templates/constraints/detect.md` 的检测规则：
1. PRD 是否明确提到框架？
2. 当前目录是否有 package.json / pyproject.toml？
3. 都没有 → 默认使用 Next.js（最适合非程序员）

确定技术栈后，告知用户：「将使用 {技术栈} 构建，部署到 {平台}」

### 2b. 创建 GSD 项目（全自动模式，跳过 GSD 访谈）

> STEP 1 已完成了产品访谈和定稿，不能让 GSD 再问一遍。
> 必须用 `--auto` 标志 + 传入定稿摘要，让 GSD 跳过自己的 Deep Questioning。

调用 GSD 初始化，传入的文档内容 = STEP 1 定稿摘要全文：
```
Skill("gsd:new-project") 并在提示中包含：
  --auto [粘贴 STEP 1 定稿摘要，包括：项目名、痛点、核心功能、不做的事、技术方向、验收标准]
```

`--auto` 告诉 GSD：
- 跳过 "What do you want to build?" 访谈（已由 Forge 完成）
- 跳过 Deep Questioning（已由 Forge 完成）
- 直接从提供的文档合成 PROJECT.md

GSD 将自动：
- 创建 `.planning/PROJECT.md`
- 创建 `.planning/REQUIREMENTS.md`
- 创建 `.planning/ROADMAP.md`
- 进行必要的技术调研

**ROADMAP.md 生成后**，读取其中的阶段总数（count phases），立即更新 `~/.forge/projects/{slug}/state.json` 的 `phase.total` 字段，使 status 显示从 "N/?" 变为 "N/M"。

**GSD 在 --auto 模式下仍会问配置问题（granularity/agents）。一律用以下预设回答，不要问用户：**
- 粒度？→ Standard（平衡）
- 并行？→ Parallel（推荐）
- Git 追踪？→ Yes（推荐）
- 研究代理？→ Yes（推荐）
- 计划检查代理？→ Yes（推荐）
- 验证代理？→ Yes（推荐）
- AI 模型？→ Balanced（推荐）

### 2c. 写入 GSD 自主配置

GSD 项目创建完成后，立即写入 `.planning/config.json`：

```json
{
  "mode": "yolo",
  "workflow": {
    "auto_advance": true,
    "skip_discuss": true
  },
  "gates": {
    "confirm_project": false,
    "confirm_phases": false,
    "confirm_roadmap": false,
    "confirm_breakdown": false,
    "confirm_plan": false,
    "execute_next_plan": false,
    "issues_review": false,
    "confirm_transition": false
  },
  "safety": {
    "always_confirm_destructive": true,
    "always_confirm_external_services": true
  },
  "parallelization": {
    "enabled": true,
    "max_concurrent": 3,
    "skip_checkpoints": true
  },
  "context": {
    "warnings_hook": true
  }
}
```

### 2d. 初始化 Forge 状态

生成 slug = 项目目录名（kebab-case）
创建 `~/.forge/projects/{slug}/state.json`：

```json
{
  "project_slug": "{slug}",
  "project_path": "{绝对路径}",
  "project_name": "{项目名}",
  "tech_stack": "{检测到的技术栈}",
  "status": "active",
  "phase": { "current": 1, "total": null, "name": "初始化" },  // total 将在 GSD 生成 ROADMAP.md 后自动更新
  "created_at": "{ISO时间}",
  "last_activity": "{ISO时间}",
  "resume_command": "/forge resume {slug}"
}
```

---

## ═══════════════════════════════════
## STEP 3 — 生成架构约束
## ═══════════════════════════════════

### 3a. 读取约束模板

根据检测到的技术栈，读取对应模板：
- nextjs → 读 `~/.forge/templates/constraints/nextjs.md`
- fastapi → 读 `~/.forge/templates/constraints/fastapi.md`
- 其他 → 读 `~/.forge/templates/constraints/generic-web.md`

### 3b. 生成项目级配置

在项目目录创建 `.claude/` 目录（如不存在），写入命令配置到 `.claude/forge-project.json`：

```json
{
  "tech_stack": "{技术栈}",
  "commands": {
    "test": "{测试命令}",
    "lint": "{Lint命令}",
    "format": "{格式化命令}",
    "dev": "{启动命令}",
    "build": "{构建命令}",
    "arch_check": "{根据技术栈填入，见 ~/.forge/templates/constraints/{stack}.md}"
  },
  "is_web_project": true/false,
  "deploy_platform": "{部署平台}"
}
```

### 3c. 生成 CI 配置（如果是 GitHub 仓库）

检查是否已有 `.github/workflows/`。如果没有，**直接生成**基础 `.github/workflows/ci.yml`，包含：
- 触发：push 到 main/master
- 步骤：安装依赖 → lint → 测试
- 技术栈对应的运行环境

不要询问用户 — Forge 全自动原则，CI 是标配。

---

## ═══════════════════════════════════
## STEP 4 — 自动执行循环
## ═══════════════════════════════════

> **质量门由 Hooks 自动触发**：每次 Skill/Agent/Task 完成后，`forge-quality-pipeline.js` 自动检测状态并注入下一个质量命令（/autoplan → /review → /qa → /cso → /benchmark）。Forge 只需驱动 GSD 前进，不需要手动调用 gstack。

从 `.planning/ROADMAP.md` 读取所有阶段。按顺序执行每个阶段，直到全部完成。

### 每个阶段的执行流程

更新 state.json（深度合并，保留 total 等已有字段）：`{"status": "active", "phase": {"current": N, "total": M, "name": "..."}}`

输出进度：「🔨 第 N/M 阶段：{阶段名} — 开始...」

---

#### 4a. 规划（GSD plan-phase）

```
Skill("gsd:plan-phase", N, "--skip-research")
```

GSD 生成 PLAN.md（含详细任务列表）。

**forge-context-bridge.js 自动检测到 PLAN.md 写入 → 设置 `planned=true`**
→ **forge-quality-pipeline.js 自动注入 `/autoplan` 质量门**

当 /autoplan 执行完成后（bridge.js 检测到 autoplan Skill 调用）→ `plan_reviewed=true` → 质量管线继续。

AskUserQuestion 自动处理原则：
- 「批准/继续」类 → 自动 Approve
- 「覆盖/修改」类 → 有 CRITICAL 问题才选修改，否则 Approve

---

#### 4b. 执行（GSD execute-phase）

```
Skill("gsd:execute-phase", N, "--auto --no-transition")
```

子代理按 PLAN.md 写代码。每个 PLAN 完成后生成 SUMMARY.md。

**forge-context-bridge.js 自动检测到 SUMMARY.md 写入 → 设置 `executed=true`**
→ **forge-quality-pipeline.js 自动依序注入 `/review` → `/qa`（Web 项目）→ `/cso`（含安全词）→ `/benchmark`（Web + 阶段≥2）**

**处理 GSD 硬停止：**

| 停止类型 | 自动处理策略 |
|---------|------------|
| `checkpoint:human-verify` | 自动 Approve |
| `checkpoint:decision` | 自动选第一个选项 |
| `checkpoint:human-action` | 用 `.env` / 项目配置中已有的凭证；如没有则告知用户需要什么（一句话中文） |
| `gaps_found` | 自动选「运行缺口修复」；第二次仍 gaps_found 则选「继续」 |
| blocker（执行阻塞） | forge-auto-fix.js 自动修复 3 轮；失败则跳过此计划，记录到 state.json，继续 |
| 回归测试失败 | 自动选「修复」；3 轮后失败则选「继续并记录」 |

---

#### 4c. 等待质量门全部通过

读取桥接文件，确认当前阶段所有适用质量门均为 `true`：

| 质量门 | 适用条件 |
|--------|---------|
| `plan_reviewed` | 始终 |
| `code_reviewed` | 始终 |
| `qa_passed` | `is_web_project == true` |
| `security_checked` | 检测到安全敏感关键词 |
| `benchmark_done` | Web 项目 + 阶段 ≥ 2 |

全部通过后继续 4d。

---

#### 4d. 阶段完成

更新 state.json 状态：
```json
{"phase": {"current": N, "total": M, "name": "阶段名", "completed": true}, "last_activity": "..."}
```

**重置桥接文件质量门**（为下一阶段准备）：将所有 quality_gates 和 pending_triggers 重置为初始值。

输出进度报告（中文）：
```
✅ 第 N 阶段完成：{阶段名}
   完成了：{简短说明}
   下一步：第 N+1 阶段 — {名称}
```

继续下一个阶段。

---

## ═══════════════════════════════════
## STEP 5 — 里程碑完成
## ═══════════════════════════════════

> **质量门由 Hooks 自动触发**：当所有阶段完成且所有核心质量门通过后，`forge-quality-pipeline.js` 自动注入 `/ship`。Forge 只需调用 GSD audit 和 complete。

所有阶段完成后：

### 5a. 里程碑审计

```
Skill("gsd:audit-milestone")
```

GSD 自动检查是否有遗漏：
- CRITICAL 遗漏 → 自动创建补充阶段（decimal phase）并执行（返回 STEP 4）
- 技术债务 → 记录到 state.json，不阻断发布

### 5b. 等待 /ship 和 /land-and-deploy（Hooks 自动触发）

**forge-quality-pipeline.js 检测到 `allCoreGatesPassed && isLastPhase` → 自动注入 `/ship`**

当 /ship 执行完成：
- 运行全量测试（forge-auto-fix.js 自动修复失败，最多 3 轮）
- 生成 VERSION bump + CHANGELOG + PR

**forge-quality-pipeline.js 接着注入 `/land-and-deploy`**（如配置了部署）：
- 等待 CI 通过 → `gh pr merge --squash --auto --delete-branch`
- Canary 验证 → 部署失败自动 `git revert`

### 5c. 完成里程碑

```
Skill("gsd:complete-milestone")
```

更新 state.json：`{"status": "complete"}`

---

## ═══════════════════════════════════
## STEP 6 — 完成报告
## ═══════════════════════════════════

输出中文完成报告：

```
🎉 项目「{名称}」开发完成！

✅ 完成的功能
━━━━━━━━━━━━━━
• {功能1}
• {功能2}
• {功能3}

🌐 项目地址
━━━━━━━━━━━
{生产环境 URL（如果有）}
{GitHub PR URL}

📊 开发统计
━━━━━━━━━━━
共 {N} 个阶段 | {M} 个子任务
代码审查发现并修复 {X} 个问题
QA 测试健康分：{Y}%

⏭️ 后续可以做
━━━━━━━━━━━━━
如需新增功能，告诉我你想做什么就可以继续。
```

---

## 错误处理规则

| 情况 | 处理方式 |
|-----|---------|
| 测试失败 | 自动修复，最多3轮。3轮后跳过并记录 |
| 工具/命令不可用 | WebSearch 找替代方案，自动安装 |
| 依赖冲突 | 自动解决版本冲突 |
| 网络错误 | 重试2次，失败告知用户 |
| API 认证失败 | 检查 .env，没有则中文提示用户提供（一句话说清楚需要什么） |
| 不明错误 | 英文报错翻译成中文，说明影响范围和解决方向 |

---

## 硬性禁止

- ❌ 不向用户解释技术细节（代码、架构、框架）
- ❌ 不问技术问题（「你想用 React 还是 Vue？」— 自己决定）
- ❌ 不展示原始错误日志（翻译成人话）
- ❌ 不在流程中途随意停止等待确认（只有规定的确认点才停）

---

## ═══════════════════════════════════
## FLOW_EVOLVE — 给已有项目加功能
## ═══════════════════════════════════

触发条件：用户说"加功能 / 新功能 / 扩展 / 增加" + 有代码的目录

```
EVOLVE-1: 读 .planning/ + git log 了解项目现状
          如没有 .planning/ → 先走 FLOW_ADOPT 创建规划结构，再回来

EVOLVE-2: 精简访谈（最多 2 轮）：
          - 加什么功能？
          - 功能边界是什么？（什么算完成？）

EVOLVE-3: 路由到正确的 GSD 命令：
          已有 GSD 项目（active）→ Skill("gsd:add-phase")
          已完成项目（completed）→ Skill("gsd:new-milestone")

EVOLVE-4: 复用 STEP 4 执行循环（Hooks 自动触发质量门）

EVOLVE-5: 复用 STEP 5 完成流程
```

---

## ═══════════════════════════════════
## FLOW_FIX — 修 bug / 解决问题
## ═══════════════════════════════════

触发条件：用户说 "bug / 修复 / 报错 / 不工作 / 很慢 / 出问题"

```
FIX-1: 1 轮症状确认（如果描述不够清楚）：
       - 什么情况下出问题？（步骤）
       - 期望行为 vs 实际行为？
       - 有报错信息吗？

FIX-2: 调用 gstack /investigate 系统性调查：
       调查 → 分析 → 假设 → 修复，4 阶段

FIX-3: 运行测试验证修复（Hooks 检测到测试通过 → tests_passed=true）
       → forge-quality-pipeline.js 自动触发 /review

FIX-4: 输出修复报告（中文，说清楚修了什么、验证了什么）

FIX-5: 可选 /ship（如果修复足够重大，或用户要求上线）
```

---

## ═══════════════════════════════════
## FLOW_PIVOT — 需求变更
## ═══════════════════════════════════

触发条件：用户说 "需求变了 / 改需求 / 客户要 / 要改"

```
PIVOT-1: 变更影响分析：
         读 .planning/ROADMAP.md，评估受影响的阶段
         输出中文报告：哪些阶段受影响、预计工作量
         等待用户确认继续

PIVOT-2: Skill("gsd:insert-phase") 插入修补阶段（作为 decimal phase）

PIVOT-3: 复用 STEP 4 执行循环

PIVOT-4: 全量测试 + Hooks 自动触发质量门
```

---

## ═══════════════════════════════════
## FLOW_MAINTAIN — 维护任务
## ═══════════════════════════════════

触发条件：用户说 "更新依赖 / 清理 / 维护 / 重构 / 升级"

```
MAINTAIN-1: 任务映射（0轮访谈，直接执行）：
            更新依赖   → npm update + npm audit + 修复 audit 警告
            性能优化   → gstack /benchmark → 找瓶颈 → 优化
            安全审计   → gstack /cso（全量）
            清理代码   → gstack /review → 重构 → 测试

MAINTAIN-2: 执行任务 → Hooks 自动触发 /review → commit

MAINTAIN-3: 如果任务超过 200 行改动 → 升级为 FLOW_EVOLVE（创建正式阶段）
```

---

## ═══════════════════════════════════
## FLOW_ADOPT — 接管已有项目
## ═══════════════════════════════════

触发条件：用户说 "接管 / 用Forge管理 / 管起来" + 有代码但无 .planning/

```
ADOPT-1: 代码库分析：
         Skill("gsd:map-codebase") — 生成 7 个结构文档
         了解：技术栈、架构模式、测试覆盖、技术债务

ADOPT-2: 创建规划结构：
         创建 .planning/ 目录
         写入 .planning/PROJECT.md（从代码库反向推导）
         创建 ~/.forge/projects/{slug}/state.json（status: "adopted"）
         写入 .planning/config.json（yolo 模式）

ADOPT-3: 引导用户选择下一步：
         「项目已接管。你想：
         A. 加新功能 → /forge 加 XXX 功能
         B. 修 bug → /forge 修 XXX 问题
         C. 做维护 → /forge 更新依赖/清理代码」
```
