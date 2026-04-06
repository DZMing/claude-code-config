#!/usr/bin/env node
// forge-shared.js - v1.7.0
// 所有 Forge hooks 的共享存储层
//
// 修复：
// - P1#5  safeReadJson：区分"不存在"和"JSON损坏"，损坏不覆写
// - H1:   safeReadJson：ENOENT 视为"不存在"而非"损坏"（atomic rename 竞态保护）
// - P1#7  getTmpDir + sanitizeSessionId：消除 /tmp 路径预测和穿越风险
// - P2#14 logHookError：统一 JSONL 错误日志，不再静默 catch
// - 并发安全：advisory lock（mkdir-based）+ 原子写（PID+ts tmp+rename）
// - F17:  resolveProjectRoot：统一 worktree/子目录 → git repo root，消除身份分裂
// - F18:  resolveSlug：新项目用 hashed slug，保证首次创建无竞态碰撞
// - F20:  logHookEvent：events.jsonl 加 5MB 轮转
// - R3-HIGH-1: mutateBridge/mutateForgeState 数组形状守卫，防止静默数据损坏
// - R3-OPT-3:  导出 STALE_TIMEOUT_MS 常量，消除各 hook 重复的魔法数字

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

// ─── 进程级缓存（PERF-1/2）────────────────────────────────────────────────────

// PERF-1: 进程内目录创建缓存，避免对同一目录重复调用 mkdirSync
// PERF-1 fix: 命中缓存时仍做 existsSync，防止目录被外部进程删除后静默 ENOENT
const _createdDirs = new Set();
function _mkdirOnce(dir) {
  if (_createdDirs.has(dir) && fs.existsSync(dir)) return;
  _createdDirs.delete(dir); // 目录可能已被删除，清除旧缓存
  fs.mkdirSync(dir, { recursive: true });
  _createdDirs.add(dir);
}

// PERF-2: resolveProjectRoot 进程级缓存，避免对同一 cwd 重复 spawn git rev-parse
const _rootCache = new Map();

// ─── 共享常量（R3-OPT-3：消除各 hook 重复的魔法数字）────────────────────────────
// stale lock 判定阈值（20 分钟）：session-start 的 budgetedCleanup 和 context-bridge 的
// spawnDetachedWorker 都用同一阈值，现在统一由 shared 导出
const STALE_TIMEOUT_MS = 20 * 60 * 1000;
// M3 fix: 质量门 lease 时长（10 分钟），消除 after-shell/after-file-edit/quality-pipeline 三处重复定义
const LEASE_TTL_MS = 10 * 60 * 1000;
// 自动修复/质量门 failCount 上限（auto-fix 重试 + quality-pipeline escalation 共 10 处使用）
const MAX_FAIL_COUNT = 3;

// ─── 命令分类正则（DUP-1：auto-fix/context-bridge 共享，消除两处重复定义）─────
// OPT-10: 补充 pnpm/cargo-nextest 模式
// MED-4 fix: 补充 cargo build / bun build / uv 系列（原先分类为 other，errHash 计数丢失）
const TEST_PATTERN =
  /\b(npm test|npm run test|pnpm test|pnpm run test|jest|vitest|pytest|py\.test|go test|cargo test|cargo nextest|yarn test|bun test|uv run pytest|uv run test)\b/;
const BUILD_PATTERN =
  /\b(npm run build|pnpm build|pnpm run build|tsc|tsc --noEmit|yarn build|bun run build|bun build|next build|vite build|cargo build|uv build|uv run build)\b/;
const LINT_PATTERN =
  /\b(npm run lint|pnpm lint|eslint|tslint|pylint|flake8|ruff|uv run ruff)\b/;

// ─── 路径 / slug ───────────────────────────────────────────────────────────────

function slugify(p) {
  return p
    .replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

// F17: 统一 CWD → Git repo root（解决 worktree/子目录产生不同身份的问题）
// 优先 git rev-parse，其次走 .planning/ 向上查找，最后 fallback 原 cwd
// M6 fix: 内联 realpathSync 归一化，消除 macOS /var→/private/var symlink 导致的身份分裂
// 所有 hook（bridge/pipeline/auto-fix）现在都经此函数，无需各自调用 realpathSync
function _normReal(p) {
  try {
    return fs.realpathSync(p);
  } catch (_) {
    return p;
  }
}

function resolveProjectRoot(cwd) {
  const resolved = path.resolve(cwd);
  // PERF-2: 进程级缓存，同一 cwd 只 spawn 一次 git rev-parse
  if (_rootCache.has(resolved)) return _rootCache.get(resolved);

  let result;
  // 1. git rev-parse --show-toplevel（最可靠：worktrees 也返回主 repo root）
  try {
    const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: resolved,
      encoding: "utf8",
      timeout: 2000,
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    if (root && fs.existsSync(root)) result = _normReal(root);
  } catch (_) {}
  // 2. 走 .planning/ 向上查找（最多 12 层，F19 同步修复）
  if (!result) {
    let dir = resolved;
    for (let i = 0; i < 12; i++) {
      if (fs.existsSync(path.join(dir, ".planning"))) {
        result = _normReal(dir);
        break;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  // 3. fallback
  if (!result) result = _normReal(resolved);

  // PERF-2 fix: 只缓存经 git 验证的结果（result !== resolved 说明找到了 git root 或 .planning 目录）
  // 不缓存 fallback 到 cwd 的结果，允许下次 git 恢复后重试
  if (result !== _normReal(resolved)) {
    _rootCache.set(resolved, result);
  }
  return result;
}

// F18: resolveSlug 保证全局唯一
// - 已有 state.json → 向后兼容（simple or hashed，哪个存在用哪个）
// - 全新项目 → 用 hashed slug 避免首次创建时的竞态碰撞
function resolveSlug(cwd) {
  const root = resolveProjectRoot(cwd); // F17: 统一到 repo root
  const baseName = slugify(path.basename(root));
  const hash = crypto.createHash("md5").update(root).digest("hex").slice(0, 8);
  const hashedSlug = `${baseName}-${hash}`;

  // 1. hashed slug 已有记录 → 该项目已明确使用 hashed slug
  if (
    fs.existsSync(
      path.join(os.homedir(), ".forge", "projects", hashedSlug, "state.json"),
    )
  ) {
    return hashedSlug;
  }

  // 2. simple slug 的 state.json 存在
  const simpleStatePath = path.join(
    os.homedir(),
    ".forge",
    "projects",
    baseName,
    "state.json",
  );
  if (fs.existsSync(simpleStatePath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(simpleStatePath, "utf8"));
      // 属于本项目 → 保留 simple slug（向后兼容）
      // M6 fix: 同时比较 realpathSync 版本，处理 state.json 存的是 /var/... 而 root 是 /private/var/... 的情形
      const resolvedExisting = path.resolve(existing.project_path || "");
      if (
        !existing.project_path ||
        resolvedExisting === root ||
        _normReal(resolvedExisting) === root
      ) {
        return baseName;
      }
      // 属于不同项目 → 使用 hashed slug
      return hashedSlug;
    } catch (_) {
      return hashedSlug; // 读取出错 → 保守使用 hashed slug
    }
  }

  // 3. 新项目：F18 fix — 使用 hashed slug 保证全局唯一，消除初始化竞态碰撞
  return hashedSlug;
}

// OPT-2: Forge 项目检测（从 bridge/pipeline/auto-fix 提取，消除3处重复定义）
function isForgeProject(cwd) {
  const root = resolveProjectRoot(cwd);
  if (fs.existsSync(path.join(root, ".planning", "STATE.md"))) return true;
  const slug = resolveSlug(cwd);
  return fs.existsSync(
    path.join(os.homedir(), ".forge", "projects", slug, "state.json"),
  );
}

// bridge 路径：从 /tmp 迁移到 ~/.forge/runtime/bridges/（P1#7：消除 /tmp 预测风险）
// F17: 使用 resolveProjectRoot 确保 worktree 和主 repo 共享同一 bridge
function getBridgePath(cwd) {
  const root = resolveProjectRoot(cwd); // F17
  const h = crypto.createHash("md5").update(root).digest("hex").slice(0, 12);
  const dir = path.join(os.homedir(), ".forge", "runtime", "bridges", h);
  _mkdirOnce(dir); // PERF-1
  return path.join(dir, "bridge.json");
}

// 安全临时目录：~/.forge/runtime/tmp/（仅所有者可读写，P1#7）
function getTmpDir() {
  const d = path.join(os.homedir(), ".forge", "runtime", "tmp");
  _mkdirOnce(d); // PERF-1
  try {
    fs.chmodSync(d, 0o700);
  } catch (_) {}
  return d;
}

// session ID 白名单校验（防止路径穿越，P1#7）
// 只允许 /^[\w.-]{1,64}$/ ，其他一律返回 null
function sanitizeSessionId(id) {
  if (!id || typeof id !== "string") return null;
  if (/^[\w.-]{1,64}$/.test(id)) return id;
  return null;
}

// ─── 安全 JSON 读写（P1#5）────────────────────────────────────────────────────

// 返回 { exists, data, corrupt }
// - exists:false  → 文件不存在，data = fallback
// - exists:true, corrupt:false → 正常读取，data = parsed
// - exists:true, corrupt:true  → 解析失败，data = null，不覆写文件
function safeReadJson(p, fallback) {
  if (!fs.existsSync(p))
    return { exists: false, data: fallback, corrupt: false };
  try {
    return {
      exists: true,
      data: JSON.parse(fs.readFileSync(p, "utf8")),
      corrupt: false,
    };
  } catch (e) {
    // H1 fix: ENOENT = existsSync 与 readFileSync 之间的 atomic rename 竞态（非损坏）
    // 返回 fallback 而非 corrupt:true，避免冻结 mutateBridge/mutateForgeState
    if (e.code === "ENOENT")
      return { exists: false, data: fallback, corrupt: false };
    logHookError("safeReadJson", e, { path: p });
    return { exists: true, data: null, corrupt: true };
  }
}

// 原子写：PID+ts 唯一 tmp 名，rename 替换（P1#1 并发安全）
function writeJsonAtomic(p, value) {
  const dir = path.dirname(p);
  _mkdirOnce(dir); // PERF-1
  const tmp = `${p}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  try {
    fs.renameSync(tmp, p);
  } catch (e) {
    try {
      fs.unlinkSync(tmp);
    } catch (_) {}
    throw e;
  }
}

// ─── Advisory Lock（mkdir-based，无外部依赖）──────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (_) {
    return false;
  }
}

// lockDir：专用锁目录路径（调用者指定，通常 bridgePath + '.lock'）
// fn：async 函数，持锁期间执行
// opts：{ waitMs=5000, retryMs=50, staleMs=20000 }
async function withAdvisoryLock(lockDir, fn, opts = {}) {
  const { waitMs = 5000, retryMs = 50, staleMs = 20000 } = opts;
  const deadline = Date.now() + waitMs;

  while (true) {
    try {
      fs.mkdirSync(lockDir); // 原子操作：成功 = 拿到锁
      // 写 PID 文件用于 stale 检测
      fs.writeFileSync(path.join(lockDir, "pid"), String(process.pid));
      break;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      // 检查锁是否 stale
      try {
        const lockPid = parseInt(
          fs.readFileSync(path.join(lockDir, "pid"), "utf8"),
        );
        const lockStat = fs.statSync(lockDir);
        const isStale = Date.now() - lockStat.mtimeMs > staleMs;
        const isDead = !isProcessAlive(lockPid);
        if (isStale || isDead) {
          fs.rmSync(lockDir, { recursive: true });
          continue; // 清除后立即重试
        }
      } catch (_) {
        // F04 fix：无法读 pid → 锁可能刚创建还未写完，先检查锁龄再决定是否清除
        let lockAge;
        try {
          lockAge = Date.now() - fs.statSync(lockDir).mtimeMs;
        } catch (_2) {
          lockAge = 99999;
        }
        if (lockAge > 2000) {
          // 超过 2s 仍无 pid → 确为孤儿锁，安全清除
          try {
            fs.rmSync(lockDir, { recursive: true });
          } catch (_2) {}
        }
        if (Date.now() >= deadline)
          throw new Error(`Advisory lock timeout: ${lockDir}`);
        await sleep(retryMs);
        continue;
      }
      if (Date.now() >= deadline)
        throw new Error(`Advisory lock timeout: ${lockDir}`);
      await sleep(retryMs);
    }
  }

  // F12：持锁心跳，定期 touch mtime 防止长操作被误判 stale 导致锁被偷
  const heartbeat = setInterval(
    () => {
      try {
        fs.utimesSync(lockDir, new Date(), new Date());
      } catch (_) {}
    },
    Math.floor(staleMs / 4),
  );

  try {
    return await fn();
  } finally {
    clearInterval(heartbeat);
    try {
      fs.rmSync(lockDir, { recursive: true });
    } catch (_) {}
  }
}

// ─── Bridge 读写（带锁）────────────────────────────────────────────────────────

// 只读快照（不加锁，用于非修改性读取）
function readBridgeSnapshot(cwd) {
  const bp = getBridgePath(cwd);
  return safeReadJson(bp, null);
}

// 带锁的读改写：lock → read → mutate(draft) → write
// mutator 可以是同步或 async 函数，接收 draft bridge 对象
// 返回 { bridge }（写入后的值）
async function mutateBridge(cwd, mutator) {
  const bp = getBridgePath(cwd);
  const lockDir = bp + ".lock";

  return withAdvisoryLock(lockDir, async () => {
    const { data, corrupt } = safeReadJson(bp, null);
    if (corrupt) {
      logHookError(
        "mutateBridge",
        new Error("Bridge file corrupt, skipping mutation"),
        { path: bp },
      );
      return { bridge: null };
    }
    // R3-HIGH-1: 防止 bridge.json 被外部损坏为 [] 后 mutator 对数组设属性导致静默丢失
    const draft = !data || Array.isArray(data) ? {} : data;
    const beforeJson = JSON.stringify(draft);
    await Promise.resolve(mutator(draft));
    // C1 fix: 脏检查 — 无变更时跳过 writeJsonAtomic，消除无意义 disk 写入
    if (JSON.stringify(draft) !== beforeJson) {
      writeJsonAtomic(bp, draft);
    }
    return { bridge: draft };
  });
}

// ─── Forge State 读写（带锁）──────────────────────────────────────────────────

// 带锁的 forge state 读改写
async function mutateForgeState(slug, mutator) {
  const sp = path.join(os.homedir(), ".forge", "projects", slug, "state.json");
  const lockDir = sp + ".lock";

  // F21 fix: 确保父目录存在，防止 withAdvisoryLock 的 mkdirSync(lockDir) 因父目录缺失而 ENOENT
  _mkdirOnce(path.dirname(sp)); // PERF-1

  return withAdvisoryLock(lockDir, async () => {
    const { data, corrupt } = safeReadJson(sp, {});
    if (corrupt) {
      logHookError(
        "mutateForgeState",
        new Error("State file corrupt, skipping mutation"),
        { path: sp },
      );
      return { state: null };
    }
    // R3-HIGH-1: 同 mutateBridge，防止 state.json 损坏为数组时静默损坏
    const draft = !data || Array.isArray(data) ? {} : data;
    await Promise.resolve(mutator(draft));
    writeJsonAtomic(sp, draft);
    return { state: draft };
  });
}

// ─── 错误日志（P2#14：替代静默 catch exit(0)）────────────────────────────────

const LOG_DIR = path.join(os.homedir(), ".forge", "logs", "hooks");
const LOG_FILE = path.join(LOG_DIR, "errors.jsonl");
const EVENTS_FILE = path.join(LOG_DIR, "events.jsonl");
const MAX_LOG_BYTES = 2 * 1024 * 1024; // 2MB 后轮转
const MAX_EVENTS_BYTES = 5 * 1024 * 1024; // 5MB 后轮转（F20）

// DUP-6: 公共追加日志逻辑（logHookError/logHookEvent 共享）
function _appendLog(file, maxBytes, entry) {
  _mkdirOnce(LOG_DIR); // PERF-1
  if (fs.existsSync(file) && fs.statSync(file).size > maxBytes) {
    try {
      fs.renameSync(file, file + ".1");
    } catch (_) {}
  }
  fs.appendFileSync(file, entry + "\n");
}

function logHookError(hook, error, context) {
  try {
    _appendLog(
      LOG_FILE,
      MAX_LOG_BYTES,
      JSON.stringify({
        ts: new Date().toISOString(),
        hook,
        error: error?.message || String(error),
        // Issue 12 fix: 在换行处截断，避免在行中间切断堆栈信息
        stack: (() => {
          const s = error?.stack || "";
          if (s.length <= 500) return s;
          const cut = s.indexOf("\n", 500);
          return cut === -1 ? s.slice(0, 500) : s.slice(0, cut);
        })(),
        context: context || {},
      }),
    );
  } catch (_) {
    // 日志写入失败时静默降级：不能因日志挂起 hook
  }
}

function logHookEvent(hook, event, data) {
  try {
    _appendLog(
      EVENTS_FILE,
      MAX_EVENTS_BYTES,
      JSON.stringify({
        ts: new Date().toISOString(),
        hook,
        event,
        data: data || {},
      }),
    );
  } catch (_) {}
}

// ─── Git 队列（P2#15 异步 git 的基础）────────────────────────────────────────

function getGitQueuePath() {
  const dir = path.join(os.homedir(), ".forge", "runtime", "git");
  _mkdirOnce(dir); // PERF-1
  return path.join(dir, "queue.jsonl");
}

// 原子追加一个 job 到 JSONL 队列
// 使用 advisory lock 保证并发安全
async function appendJsonlQueue(queuePath, job) {
  const lockDir = queuePath + ".lock";
  await withAdvisoryLock(
    lockDir,
    () => {
      const line = JSON.stringify({
        ...job,
        queued_at: new Date().toISOString(),
      });
      fs.appendFileSync(queuePath, line + "\n");
    },
    { waitMs: 3000 },
  );
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

// DUP-4: 退出码解析，统一处理各平台/框架的字段名差异
// auto-fix.js 和 context-bridge.js 曾各自内联此逻辑
// MED-5 fix: 补充 {status: N} / {code: N} 字段（部分工具/版本用这些字段）
function parseExitCode(resp) {
  const raw =
    resp?.exit_code ??
    resp?.exitCode ??
    resp?.returncode ??
    resp?.status ??
    resp?.code ??
    (resp?.isError ? 1 : 0);
  // 处理字符串退出码（部分框架/Cursor 返回 "1" 而非 1）
  return typeof raw === "string" ? parseInt(raw, 10) || 0 : (raw ?? 0);
}

// ─── OpenCode 工具名规范化（OC-FIX-1）────────────────────────────────────────────
// oh-my-opencode 的 transformToolName 只特殊处理 WebFetch/WebSearch/TodoRead/TodoWrite，
// 对 multiedit 仅做首字母大写 → 'Multiedit'，但 CC hooks 内部检查 === 'MultiEdit'。
// P2-B fix: write_file/edit_file 含下划线，首字母大写后变 'Write_file'/'Edit_file'，
//           需显式映射到 CC 的 PascalCase 名称，否则 context-bridge 写操作识别失效。
// 本函数在接收端修正大小写，确保 CC hooks 正确路由 OpenCode 工具事件。
const TOOL_NAME_CANONICAL = {
  multiedit: "MultiEdit",
  webfetch: "WebFetch",
  websearch: "WebSearch",
  todoread: "TodoRead",
  todowrite: "TodoWrite",
  use_skill: "Skill", // OpenCode 使用 use_skill，CC 使用 Skill，统一规范化
  write_file: "Write", // OC snake_case → CC PascalCase（P2-B）
  edit_file: "Edit", // OC snake_case → CC PascalCase（P2-B）
};
function normalizeToolName(name) {
  if (!name) return name;
  const lower = name.toLowerCase();
  return (
    TOOL_NAME_CANONICAL[lower] || lower.charAt(0).toUpperCase() + lower.slice(1)
  );
}

// ─── 导出 ──────────────────────────────────────────────────────────────────────

exports.slugify = slugify;
exports.resolveProjectRoot = resolveProjectRoot; // F17: 新增导出
exports.resolveSlug = resolveSlug;
exports.isForgeProject = isForgeProject; // OPT-2: 从3个hook提取
exports.getBridgePath = getBridgePath;
exports.getTmpDir = getTmpDir;
exports.sanitizeSessionId = sanitizeSessionId;

exports.safeReadJson = safeReadJson;
exports.writeJsonAtomic = writeJsonAtomic;

exports.withAdvisoryLock = withAdvisoryLock;
exports.mutateBridge = mutateBridge;
exports.readBridgeSnapshot = readBridgeSnapshot;
exports.mutateForgeState = mutateForgeState;

exports.logHookError = logHookError;
exports.logHookEvent = logHookEvent;

exports.getGitQueuePath = getGitQueuePath;
exports.appendJsonlQueue = appendJsonlQueue;

// M2 fix: 提取 signalPath/ensureSignalsDir（after-shell/after-file-edit 重复定义，统一到 shared）
function signalPath(cwd, name) {
  const projectRoot = resolveProjectRoot(cwd);
  return path.join(projectRoot, ".planning", ".cursor-signals", name);
}
function ensureSignalsDir(cwd) {
  const dir = path.join(
    resolveProjectRoot(cwd),
    ".planning",
    ".cursor-signals",
  );
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

exports._normReal = _normReal; // DUP-3: git-worker/state-sync 共享
exports.TEST_PATTERN = TEST_PATTERN; // DUP-1: auto-fix/context-bridge 共享
exports.BUILD_PATTERN = BUILD_PATTERN; // DUP-1
exports.LINT_PATTERN = LINT_PATTERN; // DUP-1
exports.parseExitCode = parseExitCode; // DUP-4: auto-fix/context-bridge 共享
exports.STALE_TIMEOUT_MS = STALE_TIMEOUT_MS; // R3-OPT-3: session-start/context-bridge 共享
exports.LEASE_TTL_MS = LEASE_TTL_MS; // M3: after-shell/after-file-edit/quality-pipeline 共享
exports.MAX_FAIL_COUNT = MAX_FAIL_COUNT; // auto-fix/quality-pipeline 共享
exports.signalPath = signalPath; // M2: after-shell/after-file-edit 共享
exports.ensureSignalsDir = ensureSignalsDir; // M2
exports.normalizeToolName = normalizeToolName; // OC-FIX-1: OpenCode Multiedit→MultiEdit
