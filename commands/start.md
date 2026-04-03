---
name: start
description: Start full-capability development engine
argument-hint: "[TASK_DESCRIPTION]"
---

# /start - 启动全能引擎

1. **记忆加载**：读取 `claude-progress.txt` 和 `feature_list.json`。
   - 如果没有，引导初始化项目结构。

2. **盲点扫描 (Blind Spot Check)**：
   - 快速浏览项目，问自己：“有什么脏活累活被遗漏了吗？”
   - 例如：是否有未处理的 TODO？目录结构乱不乱？

3. **状态汇报**：
   “老板，欢迎回来！
   - **当前进度**：[基于 claude-progress.txt]
   - **功能状态**：[基于 feature_list.json 的真实完成度]
   - ⚠️ **潜在遗漏**：[我发现目录有点乱/文档没更新...]”

4. **请指示模式**：
   - [1] **全自动开发** (按 SOP 流程闭环开发)
   - [2] **深度调研** (搜全网资料/找竞品)
   - [3] **产品补全** (帮我把想法想细)
   - [4] **整理打杂** (清理环境/规范命名)
