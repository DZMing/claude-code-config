#!/usr/bin/env node
// forge-state-sync.js - v2.5.0
// PostToolUse hook (Write|Edit): 同步 GSD 状态到 Forge State Hub
//
// 监控：
// - .planning/STATE.md 写入 → 解析并同步到 ~/.forge/projects/{slug}/state.json
// - .planning/ 目录下任意文件写入 → 主动检查 STATE.md 是否变化（覆盖 worktree 合并盲区）
// - claude-progress.txt 写入 → 同步最新 session 条目到 state.json
//
// 修复（相比 v1.x）：
// - P3#18：路径判断改用 path.relative（不再用 includes('.planning') 字符串匹配）
// - 共享 shared.js：读写改用 safeReadJson / writeJsonAtomic（不覆写损坏文件）
// - F17/F19：改用 shared.resolveProjectRoot（git root → 最多12层向上），替换本地 findProjectRoot

'use strict';

const fs   = require('fs');
const path = require('path');

const shared = require('./forge-shared');

// ─── 解析函数 ─────────────────────────────────────────────────────────────────

// 解析 YAML frontmatter（---\n...\n---\n 格式）
function parseYamlFrontmatter(content) {
  const result = {};
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return result;

  const block = frontmatterMatch[1];
  for (const line of block.split('\n')) {
    const kv = line.match(/^(\w[\w_]*):\s*(.+)$/);
    if (!kv) continue;
    const key   = kv[1];
    const value = kv[2].trim();
    const num   = Number(value);
    result[key] = Number.isNaN(num) ? value : num;
  }
  return result;
}

function parseStateMd(content) {
  // 从 STATE.md 提取关键信息
  // 优先读 YAML frontmatter（更可靠），prose 正文作为 fallback
  const result = {};
  const yaml   = parseYamlFrontmatter(content);

  // --- 当前阶段：YAML completed_phases > current_phase > prose 匹配 ---
  const yamlPhase = yaml.completed_phases ?? yaml.current_phase;
  if (yamlPhase != null && !Number.isNaN(Number(yamlPhase))) {
    result._phase_current = Number(yamlPhase);
  } else {
    // C4 fix: (\d+\.?\d*) 支持小数阶段（如 "Phase 5.1"），原 (\d+) 截断小数部分
    const phaseMatch = content.match(/##\s*Current.*?Phase[^\n]*\n.*?(\d+\.?\d*)[^\n]*/i) ||
                       content.match(/\*\*Phase\*\*[:\s]+(\d+\.?\d*)/i) ||
                       content.match(/Phase[:\s]+(\d+\.?\d*)/i) ||
                       content.match(/阶段[：:\s]+(\d+\.?\d*)/i);
    if (phaseMatch) result._phase_current = Number(phaseMatch[1]);  // F14：Number 兼容小数阶段
  }

  // --- 总阶段数 ---
  if (yaml.total_phases != null) {
    result._phase_total = Number(yaml.total_phases);
  }

  // --- flow_type ---
  if (yaml.flow_type) {
    result.flow_type = String(yaml.flow_type);
  }

  // --- 里程碑完成标记 ---
  const yamlStatus = String(yaml.status || '');
  // 使用单词边界，防止 "incomplete" 被误判为已完成
  const isComplete = /\bcompleted\b|\bmilestone[\s_]*complete\b/i.test(yamlStatus);
  if (isComplete) result._is_complete = true;

  // --- GSD 状态文字：YAML status > prose Status 行 ---
  if (yamlStatus) {
    result.gsd_status = yamlStatus;
  } else {
    const statusMatch = content.match(/Status[:\s]+([^\n]+)/i) ||
                        content.match(/状态[：:\s]+([^\n]+)/i);
    if (statusMatch) result.gsd_status = statusMatch[1].trim();
  }

  // --- 最后更新时间：YAML last_updated > prose 日期匹配 ---
  if (yaml.last_updated) {
    result.gsd_last_updated = String(yaml.last_updated);
  } else {
    const dateMatch = content.match(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/);
    if (dateMatch) result.gsd_last_updated = dateMatch[0];
  }

  return result;
}

// 主动检查 STATE.md 是否被外部更新（worktree merge 等不触发 Write/Edit 的场景）
// 比较 STATE.md 文件 mtime 与 state.json 记录的 _state_md_mtime
function checkStateMdChanged(projectRoot, state) {
  const stateMdPath = path.join(projectRoot, '.planning', 'STATE.md');
  if (!fs.existsSync(stateMdPath)) return null;

  const mtime           = fs.statSync(stateMdPath).mtimeMs;
  const lastSyncedMtime = state._state_md_mtime || 0;

  if (mtime > lastSyncedMtime) {
    return { path: stateMdPath, mtime, content: fs.readFileSync(stateMdPath, 'utf8') };
  }
  return null;
}

function parseProgressTxt(content) {
  // 从 claude-progress.txt 提取最新 session 条目
  const lines  = content.split('\n');
  const result = { last_session: null };

  // 找最后一个 ## [日期] - Session N
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].match(/^##\s*\[/)) {
      result.last_session = lines[i].replace(/^##\s*/, '').trim();

      // 尝试提取下一步
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        if (lines[j].match(/下一步|next|TODO/i)) {
          result.next_action = lines[j].replace(/^[#*\-\s]+/, '').trim();
          break;
        }
      }
      break;
    }
  }
  return result;
}

// ─── 从解析结果更新 state ──────────────────────────────────────────────────────

function applyParsed(state, parsed) {
  const { _phase_current, _phase_total, _is_complete, ...rest } = parsed;
  // F16 fix：删除 state 中已不再出现在 parsed 里的托管字段，防止旧值残留
  const MANAGED_FIELDS = ['flow_type', 'gsd_status', 'gsd_last_updated', 'last_session', 'next_action'];
  for (const key of MANAGED_FIELDS) {
    if (!(key in rest)) delete state[key];
  }
  Object.assign(state, rest);
  if (_phase_current !== undefined) {
    state.phase = { ...(state.phase || {}), current: _phase_current };
  }
  if (_phase_total !== undefined) {
    state.phase = { ...(state.phase || {}), total: _phase_total };
  }
  if (_is_complete) {
    state.status = 'completed';
  } else if (!state.status || state.status === 'completed') {
    // D7 fix 修正: 只在状态为 completed 或未设置时恢复 active
    // 不覆盖 adopted/paused/blocked 等合法中间状态（原 D7 无条件强制 active 的副作用）
    state.status = 'active';
  }
}

// ─── 主流程 ───────────────────────────────────────────────────────────────────
// H1 fix: 包裹 require.main 守卫，与 context-bridge/quality-pipeline/auto-fix 保持一致
// 被 require() 导入时不启动 stdin 监听，防止 10s timeout 泄漏
if (require.main === module) {

let input = '';
const stdinTimeout = setTimeout(() => process.exit(0), 10000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => (input += chunk));
process.stdin.on('end', async () => {
  clearTimeout(stdinTimeout);
  try {
    const data      = JSON.parse(input);
    const toolInput = data.tool_input || data.input || {};

    // 获取被写入的文件路径
    const filePath = toolInput.file_path || toolInput.path || '';
    if (!filePath) process.exit(0);

    // P3#18：使用 path.relative 做路径判断，替代字符串 includes
    // OPT-9: 用 resolveProjectRoot 归一化 cwd，防止子目录 session 导致 path.relative 返回 ../. 前缀
    // DEAD-3: 内联 findProjectRoot wrapper（仅此一处调用，无需单独函数）
    const rawCwd = data.cwd || shared.resolveProjectRoot(path.dirname(filePath));
    const cwd    = shared.resolveProjectRoot(rawCwd);
    // F22 fix: filePath 同步规范化（macOS /var → /private/var 符号链接），
    // 避免 path.relative(canonical-cwd, symlinked-filePath) 产生 ../ 前缀导致误退出
    // F23 fix: 在 cwd 和 filePath 上都做 realpathSync，确保 path.relative 两端路径一致，
    // 消除分类阶段与实际读取阶段的 TOCTOU 竞态（Codex Finding #1）
    // F24 fix: cwd 也规范化，保护 git-rev-parse fallback 路径（Codex Finding #4）
    // DUP-3: 使用 shared._normReal 统一实现
    const realCwd      = shared._normReal(cwd);
    const realFilePath = shared._normReal(filePath);
    const rel    = path.relative(realCwd, realFilePath);

    // 检查是否是目标文件（path.relative 确保路径语义正确）
    const isStateMd     = rel === path.join('.planning', 'STATE.md');
    const isInPlanning  = (rel.startsWith('.planning' + path.sep) || rel === '.planning') &&
                          !rel.startsWith('..');
    const isProgressTxt = path.basename(realFilePath) === 'claude-progress.txt' ||
                          path.basename(realFilePath) === 'PROGRESS.md';

    // 只处理 .planning/ 文件或 progress.txt
    if (!isInPlanning && !isProgressTxt) process.exit(0);
    // HIGH fix: progress.txt 只在已知 Forge 项目中处理，防止将任意仓库（只要写了 PROGRESS.md）
    // 误注册为 Forge 项目，产生垃圾 state.json
    if (isProgressTxt && !isInPlanning && !shared.isForgeProject(realCwd)) process.exit(0);

    if (!fs.existsSync(realFilePath)) process.exit(0);

    // 碰撞安全 slug
    const slug = shared.resolveSlug(realCwd);

    // 使用 shared.mutateForgeState 带锁读改写（防止并发损坏）
    await shared.mutateForgeState(slug, (state) => {
      state.project_path   = realCwd;
      state.last_activity  = new Date().toISOString();

      if (isStateMd) {
        const content = fs.readFileSync(realFilePath, 'utf8');
        applyParsed(state, parseStateMd(content));
        // 记录 STATE.md mtime，用于主动轮询的基准
        state._state_md_mtime = fs.statSync(realFilePath).mtimeMs;

      } else if (isInPlanning) {
        // 主动轮询：检查 STATE.md 是否被 worktree 合并等外部操作更新
        const changed = checkStateMdChanged(realCwd, state);
        if (changed) {
          applyParsed(state, parseStateMd(changed.content));
          state._state_md_mtime = changed.mtime;
        }
      }

      if (isProgressTxt) {
        const content = fs.readFileSync(realFilePath, 'utf8');
        const parsed  = parseProgressTxt(content);
        if (parsed.last_session) state.last_session = parsed.last_session;
        if (parsed.next_action)  state.next_action  = parsed.next_action;
      }
    });

    // 静默退出，不注入 additionalContext
    process.exit(0);
  } catch (e) {
    shared.logHookError('forge-state-sync', e);
    process.exit(0);
  }
});

} else {
  // H4 fix: 导出解析函数供 Cursor after-file-edit.mjs require() 使用
  // 只在被 require() 导入时生效，不影响 CC 直接执行的行为
  module.exports = { parseStateMd, parseProgressTxt, applyParsed };
} // end if (require.main === module)
