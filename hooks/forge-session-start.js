#!/usr/bin/env node
// forge-session-start.js - v2.3.0
// SessionStart hook: 检测进行中的 Forge 项目 + 孤儿候选标记 + 限时清理
//
// 修复（相比 v1.x）：
// - P2#13 + P3#20：orphan candidate 模式 — 路径不存在时不再自动移动，
//   仅标记为候选并显示警告，由用户手动决定（/forge orphan archive <slug>）
// - P3#17：budgetedCleanup — 限时清理 stale lock/tmp（最多 1.5s，不阻塞会话启动）

'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const shared = require('./forge-shared');  // OPT-7: 用 safeReadJson 替代裸 JSON.parse

// R3-OPT-3: STALE_TIMEOUT_MS 移至 forge-shared.js 统一维护，此处直接引用
const STALE_TIMEOUT_MS = shared.STALE_TIMEOUT_MS;

// 消耗 stdin（SessionStart hook 要求）
// R3-OPT-5: 添加超时守卫，防止调用方不关闭 stdin 时进程永久挂起
const _stdinTimeout = setTimeout(() => process.exit(0), 10000);
process.stdin.resume();
process.stdin.on('data', () => {});
process.stdin.on('end', () => { clearTimeout(_stdinTimeout); main(); });

function main() {
  const forgeDir = path.join(os.homedir(), '.forge', 'projects');

  if (!fs.existsSync(forgeDir)) {
    output(null);
    return;
  }

  const now = Date.now();
  const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;  // 24 小时

  const activeProjects      = [];
  const orphanCandidates    = [];

  let entries;
  try {
    entries = fs.readdirSync(forgeDir);
  } catch (_) {
    output(null);
    return;
  }

  for (const slug of entries) {
    // 跳过隐藏目录（.orphaned）和非目录
    if (slug.startsWith('.')) continue;

    const stateFile = path.join(forgeDir, slug, 'state.json');
    if (!fs.existsSync(stateFile)) continue;

    // OPT-7: 改用 safeReadJson，损坏 state.json 记录到 errors.jsonl 并跳过
    const { data: state, corrupt } = shared.safeReadJson(stateFile, null);
    if (!state || corrupt) continue;

    const status = state.status || 'active';

    // 跳过已完成的项目（兼容 "complete" 和 "completed"）
    if (status === 'complete' || status === 'completed') continue;

    // 孤儿检测：project_path 不存在 且 last_activity 超过 24 小时
    const projectPath  = state.project_path;
    const lastActivity = state.last_activity ? new Date(state.last_activity).getTime() : 0;
    const isStale      = now - lastActivity > ORPHAN_AGE_MS;

    if (projectPath && !fs.existsSync(projectPath) && isStale) {
      // P2#13 + P3#20：不再 renameSync 自动移动
      // 仅标记为候选，附带警告，让用户手动决定
      orphanCandidates.push({
        slug,
        name:     state.project_name || slug,
        lastDate: state.last_activity ? String(state.last_activity).slice(0, 10) : '',
        path:     projectPath,
      });
      continue;
    }

    // 提取阶段信息
    let phase = '?';
    if (state.phase && typeof state.phase === 'object') {
      phase = state.phase.current ?? '?';
    } else if (state.phase_num !== undefined) {
      phase = state.phase_num;
    }

    const lastDate  = state.last_activity ? String(state.last_activity).slice(0, 10) : '';
    const name      = state.project_name || slug;
    const flowType  = state.flow_type || 'new';

    activeProjects.push({ slug, name, phase, lastDate, flowType, status });
  }

  // 限时清理 stale 文件（P3#17，最多 1.5s）
  budgetedCleanup();

  if (activeProjects.length === 0 && orphanCandidates.length === 0) {
    output(null);
    return;
  }

  const lines = [];

  // 活跃项目
  if (activeProjects.length > 0) {
    lines.push(`🔨 Forge 检测到 ${activeProjects.length} 个进行中的项目：`, '');

    const FLOW_LABELS = {
      new: '', evolve: '加功能', fix: '修bug', pivot: '需求变更',
      maintain: '维护', adopt: '接管中', adopted: '已接管',
    };

    for (const p of activeProjects) {
      const flowLabel   = FLOW_LABELS[p.flowType] || '';
      const statusLabel = p.status === 'adopted' ? '已接管' : '';
      const tag         = flowLabel || statusLabel;
      let line = `  • ${p.name}（第 ${p.phase} 阶段${tag ? ' · ' + tag : ''}）`;
      if (p.lastDate) line += ` — 最后活动：${p.lastDate}`;
      lines.push(line);
      lines.push(`    恢复命令：/forge resume ${p.slug}`);
      lines.push('');
    }

    lines.push('如需继续，输入对应的 /forge resume 命令。');
    lines.push('如需查看所有项目状态，输入 /forge:status');
  }

  // 孤儿候选（P2#13）
  if (orphanCandidates.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push(`⚠️ 以下项目的路径不存在，可能已失效（${orphanCandidates.length} 个）：`, '');
    for (const c of orphanCandidates) {
      let line = `  • ${c.name}`;
      if (c.lastDate) line += ` — 最后活动：${c.lastDate}`;
      lines.push(line);
      lines.push(`    路径：${c.path}（不存在）`);
      // R3-HIGH-4: 白名单过滤 slug，防止恶意目录名含 shell 元字符注入命令
      const _safeSlug = /^[a-zA-Z0-9_\-.]+$/.test(c.slug) ? c.slug : null;
      if (_safeSlug) {
        lines.push(`    如确认不需要，运行：rm -rf ~/.forge/projects/${_safeSlug}`);
      } else {
        lines.push(`    如确认不需要，手动删除 ~/.forge/projects/ 目录下对应文件夹`);
      }
      lines.push('');
    }
  }

  output(lines.join('\n'));
}

// ─── 限时清理（P3#17）────────────────────────────────────────────────────────

function budgetedCleanup() {
  const start  = Date.now();
  const MAX_MS = 1500;

  // C3 fix: 清理 stale worker.lock（>20min），防止 worker 崩溃后永久堵塞 git 队列
  try {
    const workerLock = path.join(os.homedir(), '.forge', 'runtime', 'git', 'worker.lock');
    if (fs.existsSync(workerLock)) {
      const lockAge = Date.now() - fs.statSync(workerLock).mtimeMs;
      if (lockAge > STALE_TIMEOUT_MS) fs.rmSync(workerLock, { recursive: true });
    }
  } catch (_) {}

  if (Date.now() - start > MAX_MS) return;

  // P2 fix: 恢复崩溃遗留的 .processing 文件（worker 崩溃后 jobs 永远不会被处理）
  // 超过 20 分钟的 .processing → worker 已挂，追加回 queue.jsonl 重新入队
  // R3-HIGH-3: 追加前先检查 worker 锁是否活跃，避免与运行中 worker 竞争导致重复入队
  try {
    const gitDir        = path.join(os.homedir(), '.forge', 'runtime', 'git');
    const processingPath = path.join(gitDir, 'queue.jsonl.processing');
    if (fs.existsSync(processingPath)) {
      const age = Date.now() - fs.statSync(processingPath).mtimeMs;
      if (age > STALE_TIMEOUT_MS) {
        // 检查 worker 锁：锁存在且未超时 → worker 仍活跃 → 跳过恢复，避免重复入队
        const workerLock = path.join(gitDir, 'worker.lock');
        const workerActive = fs.existsSync(workerLock) &&
          (Date.now() - fs.statSync(workerLock).mtimeMs) < STALE_TIMEOUT_MS;
        if (!workerActive) {
          const content   = fs.readFileSync(processingPath, 'utf8');
          const queuePath = path.join(gitDir, 'queue.jsonl');
          // M5 fix: 改用 shared.appendJsonlQueue 逐条追加（自带锁保护）
          // 原 fs.appendFileSync 无锁，与其他进程的 appendJsonlQueue 并发时可能行粘连
          const lines = content.trim().split('\n').filter(Boolean);
          for (const line of lines) {
            try {
              const job = JSON.parse(line);
              shared.appendJsonlQueue(queuePath, job).catch(() => {});
            } catch (_) {}
          }
          fs.unlinkSync(processingPath);
        }
      }
    }
  } catch (_) {}

  if (Date.now() - start > MAX_MS) return;

  // 清理 ~/.forge/runtime/bridges/ 下的 stale lock 目录（>20min）
  try {
    const bridgesDir = path.join(os.homedir(), '.forge', 'runtime', 'bridges');
    if (!fs.existsSync(bridgesDir)) return;
    const dirs = fs.readdirSync(bridgesDir);
    for (const d of dirs) {
      if (Date.now() - start > MAX_MS) return;
      const lockDir = path.join(bridgesDir, d, 'bridge.json.lock');
      if (!fs.existsSync(lockDir)) continue;
      try {
        const stat = fs.statSync(lockDir);
        if (Date.now() - stat.mtimeMs > STALE_TIMEOUT_MS) {
          fs.rmSync(lockDir, { recursive: true });
        }
      } catch (_) {}
    }
  } catch (_) {}

  if (Date.now() - start > MAX_MS) return;

  // 清理 ~/.forge/runtime/tmp/ 下 >48h 的 .tmp 文件
  try {
    const tmpDir = path.join(os.homedir(), '.forge', 'runtime', 'tmp');
    if (!fs.existsSync(tmpDir)) return;
    const files = fs.readdirSync(tmpDir);
    for (const f of files) {
      if (Date.now() - start > MAX_MS) return;
      if (!f.endsWith('.tmp')) continue;
      try {
        const stat = fs.statSync(path.join(tmpDir, f));
        if (Date.now() - stat.mtimeMs > 48 * 60 * 60 * 1000) {
          fs.unlinkSync(path.join(tmpDir, f));
        }
      } catch (_) {}
    }
  } catch (_) {}

  if (Date.now() - start > MAX_MS) return;

  // OPT-8: 清理孤儿 bridge 目录（无 bridge.json 的空目录）
  try {
    const bridgesDir = path.join(os.homedir(), '.forge', 'runtime', 'bridges');
    if (fs.existsSync(bridgesDir)) {
      const dirs = fs.readdirSync(bridgesDir);
      for (const d of dirs) {
        if (Date.now() - start > MAX_MS) return;
        const bridgeFile = path.join(bridgesDir, d, 'bridge.json');
        if (!fs.existsSync(bridgeFile)) {
          const dirPath = path.join(bridgesDir, d);
          try {
            // M5 fix: 只删超过 5 分钟的空目录，防止与 mutateBridge 的 mkdirSync→writeJsonAtomic 窗口竞争
            const dirAge = Date.now() - fs.statSync(dirPath).mtimeMs;
            if (dirAge > 5 * 60 * 1000) {
              fs.rmSync(dirPath, { recursive: true });
            }
          } catch (_) {}
        }
      }
    }
  } catch (_) {}

  if (Date.now() - start > MAX_MS) return;

  // 清理 snapshots（每个项目保留最近 20 个）
  try {
    const projectsDir = path.join(os.homedir(), '.forge', 'projects');
    if (!fs.existsSync(projectsDir)) return;
    const slugs = fs.readdirSync(projectsDir);
    for (const slug of slugs) {
      if (Date.now() - start > MAX_MS) return;
      const snapsDir = path.join(projectsDir, slug, 'snapshots');
      if (!fs.existsSync(snapsDir)) continue;
      try {
        const snaps = fs.readdirSync(snapsDir)
          .filter(f => f.endsWith('.json'))
          .sort()
          .reverse();  // 最新在前
        for (const old of snaps.slice(20)) {
          fs.unlinkSync(path.join(snapsDir, old));
        }
      } catch (_) {}
    }
  } catch (_) {}
}

// ─── 输出 ─────────────────────────────────────────────────────────────────────

function output(msg) {
  if (!msg) {
    process.exit(0);
  }
  const result = {
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: msg,
    },
  };
  process.stdout.write(JSON.stringify(result) + '\n');
}
