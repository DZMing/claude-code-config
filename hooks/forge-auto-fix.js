#!/usr/bin/env node
// forge-auto-fix.js - v2.4.0
// PostToolUse hook（Bash）: 检测失败并注入修复指令
//
// 机制：
// - exit_code != 0 且命令是测试/构建/lint → 注入修复指令
// - 同一错误重复出现超过 max 轮 → 升级到 /gsd:diagnose-issues
// - 使用 shared.mutateBridge 追踪 auto_fix 状态（并发安全，P1#1）

'use strict';

const crypto = require('crypto');

const shared = require('./forge-shared');

// ─── 命令分类 ─────────────────────────────────────────────────────────────────

// DUP-1: 正则移至 forge-shared.js 统一维护，此处直接引用
const { TEST_PATTERN, BUILD_PATTERN, LINT_PATTERN } = shared;

function classifyCommand(cmd) {
  if (TEST_PATTERN.test(cmd))  return 'test';
  if (BUILD_PATTERN.test(cmd)) return 'build';
  if (LINT_PATTERN.test(cmd))  return 'lint';
  return 'other';
}

// ─── 修复消息生成 ──────────────────────────────────────────────────────────────

function buildFixMessage(type, errorSnippet, attempts, max) {
  const remaining = max - attempts;
  const roundInfo = `（第 ${attempts}/${max} 轮自动修复，还剩 ${remaining} 次机会）`;

  const base = {
    test:  `⚠️ FORGE 自动修复 ${roundInfo}：测试失败。\n请分析失败的测试用例，修复代码使所有测试通过。\n错误片段：\n\`\`\`\n${errorSnippet}\n\`\`\``,
    build: `⚠️ FORGE 自动修复 ${roundInfo}：构建失败。\n请分析构建错误，修复类型错误或导入问题。\n错误片段：\n\`\`\`\n${errorSnippet}\n\`\`\``,
    lint:  `⚠️ FORGE 自动修复 ${roundInfo}：Lint 错误。\n请运行 \`npx eslint --fix\` 自动修复，再手动修复剩余问题。\n错误片段：\n\`\`\`\n${errorSnippet}\n\`\`\``,
    other: `⚠️ FORGE 自动修复 ${roundInfo}：命令失败。\n请分析错误原因并修复。\n错误片段：\n\`\`\`\n${errorSnippet}\n\`\`\``,
  };

  return base[type] || base.other;
}

// R3-OPT-4: max 参数动态化，文案不再硬编码 "3 轮"
// HIGH-2 fix: 新增 clientType 参数，路由到正确的 Skill 调用方式（cc→Skill / oc→use_skill）
function buildEscalateMessage(type, errorSnippet, max, clientType = 'cc') {
  const rounds    = max || 3;
  const skillCall = clientType === 'cc' ? 'Skill("gsd:debug")' : 'use_skill("gsd:debug")';
  if (type === 'lint') {
    return `⚠️ FORGE：Lint 错误经过 ${rounds} 轮自动修复仍未解决。记录并继续（lint 为非阻断性）。\n请在完成核心功能后再处理剩余 lint 问题。`;
  }
  return `⛔ FORGE 自动修复已达上限：经过 ${rounds} 轮自动修复仍未解决。\n升级到诊断模式：请调用 ${skillCall} 进行系统性 debug（并行 debug agent，找出根本原因）。\n错误片段：\n\`\`\`\n${errorSnippet}\n\`\`\``;
}

// ─── 错误签名（防止不同错误被当作同一问题计数）────────────────────────────────
// MED-4 fix: 加入 cmdType 前缀，避免 cargo build / npm test 输出相似时共享 failCount

function hashError(stderr, cmdType = '') {
  const prefix = cmdType ? cmdType + ':' : '';
  return crypto.createHash('sha256').update(prefix + stderr.slice(0, 500)).digest('hex').slice(0, 16);
}

// ─── 主流程 / 可复用导出 ──────────────────────────────────────────────────────
// require.main === module: 作为 CC hook 直接执行，启动 stdin 监听
// require.main !== module: 被 Cursor hooks require()，只导出函数，不执行副作用

if (require.main === module) {
  let input = '';
  const timeout = setTimeout(() => process.exit(0), 10000);
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => (input += c));
  process.stdin.on('end', async () => {
    clearTimeout(timeout);
    try {
      const data     = JSON.parse(input);
      const cwd      = data.cwd || process.cwd();
      const toolResp = data.tool_response || data.tool_result || {};

      // 只处理失败的 Bash 命令
      // DUP-4: 退出码解析统一用 shared.parseExitCode
      const exitCode = shared.parseExitCode(toolResp);
      if (exitCode === 0) process.exit(0);

      const cmd  = (data.tool_input || {}).command || '';
      const type = classifyCommand(cmd);

      // OPT-2: 只处理有意义的失败类型（test/build/lint）
      // 跳过 'other'，防止 ls/cat 等探测命令误触发修复循环（上下文噪音 + 无效 failCount 计数）
      if (type === 'other') process.exit(0);

      // 非 Forge 项目提前退出（无论命令类型）
      if (!shared.isForgeProject(cwd)) process.exit(0);

      const stderr  = toolResp?.stderr || toolResp?.output || '';
      const snippet = stderr.slice(-600).trim() || `（命令：${cmd.slice(0, 80)}，退出码：${exitCode}）`;
      const errHash = hashError(stderr || cmd, type);

      // 带锁读改写 auto_fix 状态（P1#1 并发安全，P2#14 升级 catch）
      let fixResult  = { issue_hash: null, attempts: 1, max: 3 };
      let clientType = 'cc';  // HIGH-2 fix: 默认 cc，从 bridge 读取实际客户端类型

      await shared.mutateBridge(cwd, (draft) => {
        const fix = draft.auto_fix || { issue_hash: null, attempts: 0, max: 3 };

        if (fix.issue_hash === errHash) {
          // 同一问题，累加计数
          fix.attempts = (fix.attempts || 0) + 1;
        } else {
          // 新问题，重置
          fix.issue_hash = errHash;
          fix.attempts   = 1;
        }

        draft.auto_fix = fix;
        fixResult      = fix;
        clientType     = draft.project?.client || 'cc';  // HIGH-2 fix: 读取客户端类型
        // R3-MED-4: 确保 _schema_version 存在，防止 migrateIfNeeded 在 context-bridge 执行时
        // 因缺少版本字段而重建整个 bridge，清除此处写入的 auto_fix 计数
        if (!draft._schema_version) draft._schema_version = 2;
      });

      let msg;
      if (fixResult.attempts >= fixResult.max) {
        msg = buildEscalateMessage(type, snippet, fixResult.max, clientType);
      } else {
        msg = buildFixMessage(type, snippet, fixResult.attempts, fixResult.max);
      }

      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: msg,
        },
      }));
    } catch (e) {
      shared.logHookError('forge-auto-fix', e);
      process.exit(0);
    }
  });
} else {
  // ─── 可复用导出（供 Cursor hooks 调用）────────────────────────────────────
  module.exports = { classifyCommand, hashError, buildFixMessage, buildEscalateMessage };
}
