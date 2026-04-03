#!/usr/bin/env node
// forge-git-worker.js - v1.3.0
// 独立异步进程：处理 git checkpoint 队列
//
// 修复（P1#6, P2#15）：
// - P1#6：不再 git add -A，只 add 白名单文件（排除 .env/*secret*/*.pem/*.key）
// - P2#15：独立进程，不阻塞 hook 响应
//
// 运行机制：
// 1. 获取单例锁（~/.forge/runtime/git/worker.lock）
// 2. 读取 queue.jsonl，处理每个 job
// 3. 对每个 job：安全 git add → commit → 写 snapshot
// 4. 清空队列（已处理的 job）
// 5. 释放锁

'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const shared = require('./forge-shared');

// ─── 常量 ─────────────────────────────────────────────────────────────────────

const RUNTIME_DIR  = path.join(os.homedir(), '.forge', 'runtime', 'git');
const QUEUE_PATH   = path.join(RUNTIME_DIR, 'queue.jsonl');
const LOCK_DIR     = path.join(RUNTIME_DIR, 'worker.lock');
// OPT-4: commit message 包含 reason，方便 git log 区分触发原因（warn/critical/etc.）
function buildCommitMsg(reason) {
  return `chore(forge): auto checkpoint [${reason || 'forge-hook'}]`;
}

// 禁止 add 的文件模式（P1#6：安全 add）
// 使用 basename 匹配 + 扩展名匹配，无需 minimatch 依赖
const DENY_BASENAMES = ['.env'];
const DENY_PREFIXES  = ['.env.'];
const DENY_SUFFIXES  = ['.pem', '.key', '.p12', '.pfx'];
const DENY_PATTERNS  = [/secret/i, /credential/i, /password/i, /private[_-]?key/i];

function isDenied(filePath) {
  const base = path.basename(filePath);
  if (DENY_BASENAMES.includes(base))           return true;
  if (DENY_PREFIXES.some(p => base.startsWith(p))) return true;
  if (DENY_SUFFIXES.some(s => base.endsWith(s)))   return true;
  if (DENY_PATTERNS.some(r => r.test(base)))        return true;
  // 禁止 node_modules / dist / .git 内部文件（匹配路径开头或中间）
  if (/(^|[/\\])(node_modules|dist|\.git)([/\\]|$)/.test(filePath)) return true;
  return false;
}

// ─── 安全 git add（P1#6）──────────────────────────────────────────────────────

function safeGitAdd(cwd, touchedFiles) {
  // 过滤掉危险文件
  const safeFiles = (touchedFiles || [])
    .filter(f => f && !isDenied(f))
    .map(f => path.isAbsolute(f) ? path.relative(cwd, f) : path.normalize(f))
    .filter(f => {
      if (!f) return false;
      // F07：标准化后验证不逃逸项目根（防止 sub/../../.github/ 绕过 startsWith 检查）
      const resolved = path.resolve(cwd, f);
      return resolved === cwd || resolved.startsWith(cwd + path.sep);
    });

  if (safeFiles.length === 0) {
    // 没有安全文件可 add → 检查是否有任何已跟踪文件修改
    try {
      const status = execFileSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf8', timeout: 3000 });
      if (!status.trim()) return false;  // 工作区干净
      // 只 add 已跟踪的修改（--update 不会添加未跟踪文件，但可能包含危险文件）
      // 这里选择不 add，安全优先
      return false;
    } catch (_) { return false; }
  }

  try {
    execFileSync('git', [
      '-c', 'core.hooksPath=/dev/null',
      'add', '--',
      ...safeFiles,
    ], { cwd, timeout: 5000 });
    return true;
  } catch (e) {
    shared.logHookError('forge-git-worker/gitAdd', e, { cwd });
    return false;
  }
}

function tryGitCommit(cwd, reason) {
  try {
    // 检查是否有已暂存的变更
    const staged = execFileSync('git', ['diff', '--cached', '--name-only'], { cwd, encoding: 'utf8', timeout: 3000 });
    if (!staged.trim()) return false;

    execFileSync('git', [
      '-c', 'core.hooksPath=/dev/null',
      'commit', '--no-verify', '-m', buildCommitMsg(reason),
    ], { cwd, timeout: 10000 });
    return true;
  } catch (e) {
    shared.logHookError('forge-git-worker/gitCommit', e, { cwd });
    return false;
  }
}

// ─── 快照写入 ─────────────────────────────────────────────────────────────────

function writeSnapshot(cwd, slug, reason) {
  try {
    const snapsDir = path.join(os.homedir(), '.forge', 'projects', slug, 'snapshots');
    fs.mkdirSync(snapsDir, { recursive: true });
    const ts = Date.now();
    shared.writeJsonAtomic(path.join(snapsDir, `${ts}.json`), {
      timestamp:      new Date().toISOString(),
      project_path:   cwd,
      reason,
      resume_command: `/forge resume ${slug}`,
      committed_by:   'forge-git-worker',
    });
  } catch (e) {
    shared.logHookError('forge-git-worker/snapshot', e, { cwd, slug });
  }
}

// ─── 处理单个 job ─────────────────────────────────────────────────────────────

function processJob(job) {
  const { cwd, slug, touchedFiles, reason } = job;
  if (!cwd || !fs.existsSync(cwd)) return;

  try {
    // 确认是 git 仓库
    execFileSync('git', ['rev-parse', '--git-dir'], { cwd, timeout: 2000 });
  } catch (_) { return; }  // 非 git 目录，跳过

  // F03（HIGH fix）：只清除不属于 touchedFiles 的预暂存文件，保留用户自己的暂存
  // 原 git reset HEAD 会清除全部暂存区，包括用户有意暂存的合法文件（甚至含 secrets）
  let preStagedToRestore = [];
  let preStagedPatch     = '';  // HIGH fix: 保留精确 patch，防止 git add 破坏 partial staging
  // Codex Finding 1 fix: 提升到 try 块外，避免 try 内 const 声明在 try 外引用时 ReferenceError
  let partialStagingConflicts = [];
  try {
    const staged = execFileSync('git', ['diff', '--name-only', '--cached'],
      { cwd, encoding: 'utf8', timeout: 3000 });
    const allStaged = staged.trim().split('\n').filter(Boolean);
    // HIGH fix (symlink): 用 realpathSync(cwd) 作为基准，防止 touchedFiles 已 canonicalize 但 cwd 含符号链接
    // DUP-3: 使用 shared._normReal 统一实现
    const realCwd = shared._normReal(cwd);
    const touchedRel = (touchedFiles || []).map(f => {
      try { return path.relative(realCwd, f); } catch (_) { return null; }
    }).filter(Boolean);
    preStagedToRestore = allStaged.filter(f => !touchedRel.includes(f));
    // PARTIAL-STAGING FIX: 同时在 allStaged（用户部分暂存）和 touchedRel（forge 触碰）的文件
    // 不能直接 git add（会把整个文件暂存，覆盖用户刻意留出的 hunk）
    // 策略：从 git add 目标中排除这些文件，保留用户暂存意图，forge 更改留给下次 checkpoint
    partialStagingConflicts = allStaged.filter(f => touchedRel.includes(f));
    if (partialStagingConflicts.length > 0) {
      shared.logHookEvent('forge-git-worker', 'partial_staging_skipped', {
        cwd, files: partialStagingConflicts,
        reason: 'user has partial staging on forge-touched files; skipping git add to preserve intent',
      });
    }
    if (preStagedToRestore.length > 0) {
      // 先保存精确 patch（防止 partial hunk 在恢复时被整文件 add 覆盖）
      try {
        preStagedPatch = execFileSync(
          'git', ['diff', '--cached', '--', ...preStagedToRestore],
          { cwd, encoding: 'utf8', timeout: 3000 }
        );
      } catch (_) { preStagedPatch = ''; }
      execFileSync('git', ['restore', '--staged', '--', ...preStagedToRestore],
        { cwd, timeout: 3000 });
    }
  } catch (_) {}
  // PARTIAL-STAGING FIX: 从 git add 目标中排除 partialStagingConflicts（用户部分暂存的文件）
  const touchedFilesForAdd = (touchedFiles || []).filter(f => {
    try {
      const rel = path.relative(shared._normReal(cwd), path.isAbsolute(f) ? f : path.resolve(cwd, f));
      return !partialStagingConflicts.includes(rel);
    } catch (_) { return true; }
  });
  const added    = safeGitAdd(cwd, touchedFilesForAdd);
  const committed = added && tryGitCommit(cwd, reason);
  // 恢复用户原有的暂存文件：优先用 patch apply（保留 partial hunk），否则 fallback 整文件 add
  if (preStagedToRestore.length > 0) {
    let restored = false;
    if (preStagedPatch.trim()) {
      try {
        execFileSync('git', ['apply', '--cached', '--whitespace=nowarn'],
          { cwd, input: preStagedPatch, encoding: 'utf8', timeout: 5000 });
        restored = true;
      } catch (e) {
        // R3-MED-5: patch apply 失败需记录，用户预暂存内容可能丢失
        shared.logHookError('forge-git-worker/restore-patch', e, { cwd, files: preStagedToRestore });
        /* fallback 到整文件 add */
      }
    }
    if (!restored) {
      try {
        execFileSync('git', ['add', '--', ...preStagedToRestore], { cwd, timeout: 3000 });
      } catch (e) {
        // R3-MED-5: 整文件 add 也失败 → 用户预暂存内容已丢失，必须记录
        shared.logHookError('forge-git-worker/restore-add', e, { cwd, files: preStagedToRestore });
      }
    }
  }
  if (committed) {
    writeSnapshot(cwd, slug, reason || 'checkpoint');
    shared.logHookEvent('forge-git-worker', 'checkpoint_committed', { cwd, slug, reason });
  } else {
    shared.logHookEvent('forge-git-worker', 'checkpoint_skipped', { cwd, slug, reason, added });
  }
}

// ─── 主流程 ───────────────────────────────────────────────────────────────────

async function main() {
  // 确保 runtime/git 目录存在
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });

  // 获取单例锁（确保同时只有一个 worker 在跑）
  try {
    await shared.withAdvisoryLock(LOCK_DIR, async () => {
      if (!fs.existsSync(QUEUE_PATH)) {
        // Issue 7 fix：检查 stale .processing 文件（worker 上次崩溃遗留）
        // 超过 60s 未被清理的 .processing 视为崩溃残留，回收为新队列重新处理
        const processingPath = QUEUE_PATH + '.processing';
        if (fs.existsSync(processingPath)) {
          try {
            const stat = fs.statSync(processingPath);
            const age = Date.now() - stat.mtimeMs;
            if (age > 60 * 1000) {
              // Codex Finding 4 fix: stale rename 必须持 QUEUE_PATH + '.lock'（与 appendJsonlQueue 同一域）
              // 否则 appendJsonlQueue 在 rename 前写入 QUEUE_PATH，rename 后被覆盖丢失 job
              await shared.withAdvisoryLock(QUEUE_PATH + '.lock', async () => {
                // 二次检查：lock 内 QUEUE_PATH 是否已存在（appendJsonlQueue 刚写入）
                if (!fs.existsSync(QUEUE_PATH)) {
                  fs.renameSync(processingPath, QUEUE_PATH);
                  shared.logHookEvent('forge-git-worker', 'stale_processing_recovered', { age_ms: age });
                }
              }, { waitMs: 500, staleMs: 5000 });
            }
          } catch (_) {}
        }
        if (!fs.existsSync(QUEUE_PATH)) return;
      }

      // F11 fix：rename 后再处理，防止处理期间新追加的 job 被清空覆盖而丢失
      // Issue 3 fix：rename 必须持 QUEUE_PATH + '.lock'（与 appendJsonlQueue 同一域），
      // 消除 append 和 rename 之间的竞态窗口（否则 append 写入后 rename 清空，job 丢失）
      const processingPath = QUEUE_PATH + '.processing';
      let renamed = false;
      try {
        await shared.withAdvisoryLock(QUEUE_PATH + '.lock', async () => {
          if (!fs.existsSync(QUEUE_PATH)) return;  // append 与本次 rename 之间队列被清空
          fs.renameSync(QUEUE_PATH, processingPath);
          renamed = true;
        }, { waitMs: 1000, staleMs: 5000 });
      } catch (_) { return; }  // lock 超时 → 另一线程正在追加，跳过本轮
      if (!renamed) return;

      const content = fs.readFileSync(processingPath, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);

      // 处理每个 job
      for (const line of lines) {
        try {
          const job = JSON.parse(line);
          processJob(job);
          // R3-HIGH-2: processJob 全程 execFileSync 阻塞事件循环，setInterval 心跳无法触发
          // 每个 job 完成后手动 touch worker.lock mtime，防止锁被误判 stale 后第二个 worker 启动
          try { fs.utimesSync(LOCK_DIR, new Date(), new Date()); } catch (_) {}
        } catch (e) {
          shared.logHookError('forge-git-worker/parseJob', e, { line: line.slice(0, 100) });
        }
      }
      // HIGH fix：处理完后再删除 .processing 文件，防止崩溃丢失所有 job
      // 原代码在读取内容后立即删除，崩溃时未处理的 job 会全部丢失
      try { fs.unlinkSync(processingPath); } catch (_) {}
    }, { waitMs: 3000, staleMs: 30000 });
  } catch (e) {
    // lock 超时 → 另一个 worker 正在运行，直接退出
    shared.logHookError('forge-git-worker/lock', e);
  }
}

main().catch(e => {
  shared.logHookError('forge-git-worker/main', e);
  process.exit(1);
});
