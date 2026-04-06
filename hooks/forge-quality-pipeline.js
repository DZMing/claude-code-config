#!/usr/bin/env node
// forge-quality-pipeline.js - v2.5.0
// PostToolUse hook（Skill|Agent|Task）: 质量门 FSM
//
// 修复（相比 v1.x）：
// - P2#9   安全检测改用 git diff（不再看 last_tool.output_tail 字符串）
// - P2#11  lease 超时自动回 required（消除 pending_triggers 永久死锁）
// - P3#16  非 Forge 项目提前退出
// Gate 状态流：idle → required → leased → passed/failed

"use strict";

// R3-OPT-1: 已删除死代码 `const fs = require('fs')`（经 grep 验证 fs. 无直接调用）
const { execFileSync } = require("child_process");

const shared = require("./forge-shared");

// ─── 常量 ─────────────────────────────────────────────────────────────────────

// M3 fix: 从 shared 引用 LEASE_TTL_MS（消除与 after-shell/after-file-edit 的重复定义）
const { LEASE_TTL_MS, MAX_FAIL_COUNT } = shared;

// gstack preamble 跳过说明（所有质量门注入时附带）
const PREAMBLE_SKIP = `（gstack 执行说明：读取 SKILL.md 后从 "## Step 0" 或 "# /{命令名}" 标记开始执行。跳过 Preamble bash block、Lake Intro、Telemetry、Session Tracking。所有 AskUserQuestion 自动选推荐选项。所有 "STOP and wait" 自动继续。）`;

// ─── 安全检测（P2#9：改用 git diff 而非 output_tail）─────────────────────────

// OPT-5: 移除 hash/migration/database（高频前端词，导致安全门误触发）
// 保留真正的加密/认证关键词；hmac/keyring/presign/apikey 为 Codex 新发现的漏报词
const SECURITY_PATTERN =
  /\b(auth|token|password|secret|session|cookie|jwt|sql|encrypt|bcrypt|argon|oauth|permission|rbac|hmac|apikey|api_key|keyring|presign)\b/i;

function evaluateSecurityRisk(cwd, touchedFiles, cachedEpoch, changeEpoch) {
  if (!touchedFiles || touchedFiles.length === 0) {
    return {
      required: false,
      reasons: [],
      files: [],
      evaluatedAtEpoch: changeEpoch,
    };
  }
  // OPT-6: epoch 缓存 — 同一 changeEpoch 不重复 git diff spawn
  if (cachedEpoch != null && cachedEpoch === changeEpoch) {
    return null; // 返回 null 表示使用已有缓存结果
  }
  try {
    const diff = execFileSync(
      "git",
      ["diff", "--unified=0", "--", ...touchedFiles.slice(0, 20)],
      { cwd, encoding: "utf8", timeout: 3000 },
    );
    const pathHit = touchedFiles.some((f) => SECURITY_PATTERN.test(f));
    const diffHit = SECURITY_PATTERN.test(diff);
    return {
      required: pathHit || diffHit,
      reasons: [pathHit && "path", diffHit && "diff"].filter(Boolean),
      files: touchedFiles,
      evaluatedAtEpoch: changeEpoch,
    };
  } catch (_) {
    // F10 fix：git 失败时无法判断风险，保守策略触发安全门而非静默放行
    return {
      required: true,
      reasons: ["git_error"],
      files: touchedFiles.slice(0, 20),
      evaluatedAtEpoch: changeEpoch,
    };
  }
}

// ─── 辅助判断 ─────────────────────────────────────────────────────────────────

function allCoreGatesPassed(bridge) {
  const ce = bridge.change?.changeEpoch ?? 0;
  const g = bridge.gates;
  if (!g) return false;
  // 测试 + 代码审查必须通过，且 epoch 匹配（避免旧结果误判）
  if (g.tests?.status !== "passed" || g.tests?.epoch !== ce) return false;
  if (g.code_review?.status !== "passed" || g.code_review?.epoch !== ce)
    return false;
  // Web 项目额外要求 QA
  if (
    bridge.project?.isWeb &&
    (g.qa?.status !== "passed" || g.qa?.epoch !== ce)
  )
    return false;
  return true;
}

function isLastPhase(bridge) {
  const { current, total } = bridge.phase || {};
  if (!current || !total) return false;
  // D10 fix: 防止 frontmatter 写入 Infinity 导致永远判定为最终阶段
  if (!Number.isFinite(current) || !Number.isFinite(total)) return false;
  return current >= total;
}

// lease 是否已过期（过期的 leased 门应回到 required）
function isLeaseExpired(gate) {
  if (gate.status !== "leased") return false;
  if (!gate.leaseUntil) return true;
  const parsed = Date.parse(gate.leaseUntil);
  // LOW fix: Date.parse 返回 NaN 时（leaseUntil 损坏）视为已过期，保守地重新触发
  return isNaN(parsed) || parsed <= Date.now();
}

// ─── 质量 FSM：选择下一个要注入的门（P2#11 lease 超时机制）─────────────────

// 返回门名（string）或 null
function nextGateToInject(bridge) {
  const ce = bridge.change?.changeEpoch ?? 0;
  const g = bridge.gates || {};

  // Issue 9 fix: 终态门（不参与 failCount 封锁判断）用显式名称集合，避免 slice 位置依赖
  // 定义在 gateDefs 之前，使 ship.requires/escalation 闭包可直接引用（前向引用 gateDefs 但只在调用时求值）
  const TERMINAL_GATE_NAMES = new Set(["ship", "escalation"]);

  // OPT-1: 客户端自适应指令
  // CC 用户（PascalCase 工具名）需要 "Skill 工具"；OC 用户需要 "use_skill 工具"
  // HIGH-2 fix: 默认 'cc'（本 hooks 目录的主要运行环境），OC 用户需显式设置 project.client='oc'
  const CLIENT = bridge.project?.client || "cc";
  const SKILL_INSTR = CLIENT === "cc" ? "Skill 工具" : "use_skill 工具";

  // 按优先级排序的门定义
  const gateDefs = [
    {
      name: "plan_review",
      requires: () => bridge.change?.planWrittenAt != null,
      // C3 fix: OpenCode 使用 use_skill 工具（不是 CC 的 Skill()）
      // OPT-1: SKILL_INSTR 根据 bridge.project.client 自动选择（cc→Skill/oc→use_skill）
      msg: () =>
        `⚡ FORGE 质量门：阶段规划完成（PLAN.md 已创建）。\n质量门要求：立即执行计划审查。\n请使用 ${SKILL_INSTR} 调用 autoplan，执行 gstack /autoplan（CEO + 设计 + 工程三重审查）。\n${PREAMBLE_SKIP}`,
    },
    {
      name: "code_review",
      requires: () => g.tests?.status === "passed",
      msg: () =>
        `⚡ FORGE 质量门：阶段代码执行完成（测试通过）。\n质量门要求：立即执行代码审查。\n请使用 ${SKILL_INSTR} 调用 review，执行 gstack /review（diff-aware 模式，只看本次变更）。\n${PREAMBLE_SKIP}`,
    },
    {
      name: "qa",
      requires: () =>
        g.code_review?.status === "passed" && bridge.project?.isWeb,
      msg: () =>
        `⚡ FORGE 质量门：代码审查完成，Web 项目需执行浏览器 QA。\n请使用 ${SKILL_INSTR} 调用 qa，执行 gstack /qa（diff-aware 模式，只测本次变更页面）。\n${PREAMBLE_SKIP}`,
    },
    {
      name: "security",
      requires: () =>
        g.code_review?.status === "passed" &&
        bridge.change?.securityRisk?.required,
      msg: () =>
        `⚡ FORGE 质量门：检测到安全敏感代码变更（auth/token/password/sql 等）。\n请使用 ${SKILL_INSTR} 调用 cso，执行 gstack /cso --diff（仅审计本次变更）。\n${PREAMBLE_SKIP}`,
    },
    {
      name: "benchmark",
      requires: () =>
        g.code_review?.status === "passed" &&
        bridge.project?.isWeb &&
        (bridge.phase?.current || 0) >= 2,
      msg: (b) =>
        `⚡ FORGE 质量门：阶段 ${b.phase?.current} Web 项目代码审查完成，需执行性能基准测试。\n请使用 ${SKILL_INSTR} 调用 benchmark，执行 gstack /benchmark。\n${PREAMBLE_SKIP}`,
    },
    {
      name: "ship",
      requires: () => {
        if (!allCoreGatesPassed(bridge) || !isLastPhase(bridge)) return false;
        // N2 fix: 任意前置门永久失败（failCount>=3）时禁止 ship，由 escalation 优先接管
        // 原代码 allCoreGatesPassed 不检查 security/benchmark，导致 ship 可在安全门卡死时触发
        return !nonTerminalDefs.some(
          (def) => (g[def.name]?.failCount || 0) >= MAX_FAIL_COUNT,
        );
      },
      msg: () =>
        `⚡ FORGE 质量门：所有阶段完成，全部质量门通过！\n最后步骤：创建 PR 并准备部署。\n请使用 ${SKILL_INSTR} 调用 ship，执行 gstack /ship（全量测试 + 版本 + PR）。\n${PREAMBLE_SKIP}`,
    },
    // P2 fix: 升级告警门 — 有任何质量门被 failCount>=3 封锁时注入人工介入提示
    // 防止流水线卡死后无声停止，用 10min lease 避免每次 PostToolUse 都重复注入
    {
      name: "escalation",
      requires: () =>
        nonTerminalDefs.some(
          (def) =>
            def.requires() && (g[def.name]?.failCount || 0) >= MAX_FAIL_COUNT,
        ),
      msg: () => {
        const blocked = nonTerminalDefs
          .filter(
            (def) =>
              def.requires() && (g[def.name]?.failCount || 0) >= MAX_FAIL_COUNT,
          )
          .map((d) => d.name);
        return `⚠️ FORGE 质量门卡死：以下质量门连续失败 ${MAX_FAIL_COUNT} 次，自动重试已停止：\n${blocked.map((n) => `• ${n}`).join("\n")}\n请手动运行对应质量检查命令后重试，或运行 /forge:status 查看详情。\n${PREAMBLE_SKIP}`;
      },
    },
  ];

  const nonTerminalDefs = gateDefs.filter(
    (d) => !TERMINAL_GATE_NAMES.has(d.name),
  );

  for (const def of gateDefs) {
    if (!def.requires()) continue;
    const gate = g[def.name] || {
      status: "idle",
      epoch: null,
      leaseUntil: null,
    };

    // 已通过且 epoch 匹配 → 跳过
    if (gate.status === "passed" && gate.epoch === ce) continue;

    // leased 且未过期 → 跳过（等待完成）
    if (gate.status === "leased" && !isLeaseExpired(gate)) continue;

    // M2 fix: 失败次数 >= 3 → 跳过，防止无限重试卡住整个流水线
    if (gate.status === "failed" && (gate.failCount || 0) >= MAX_FAIL_COUNT)
      continue;

    // 其他情况（idle/required/failed/expired lease/epoch 不匹配）→ 需要注入
    return { name: def.name, message: def.msg(bridge) };
  }
  return null;
}

// ─── 主流程 / 可复用导出 ──────────────────────────────────────────────────────
// require.main === module: 作为 CC hook 直接执行，启动 stdin 监听
// require.main !== module: 被 Cursor hooks require()，只导出函数，不执行副作用

if (require.main === module) {
  let input = "";
  const timeout = setTimeout(() => process.exit(0), 15000);
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => (input += c));
  process.stdin.on("end", async () => {
    clearTimeout(timeout);
    try {
      const data = JSON.parse(input);
      const cwd = data.cwd || process.cwd();

      // P3#16：只在 Forge 项目中运行（OPT-2：改用 shared.isForgeProject）
      if (!shared.isForgeProject(cwd)) process.exit(0);

      // 读 bridge 快照（只读，用于获取 touchedFiles 进行锁外安全风险预评估）
      const { data: bridge, corrupt } = shared.readBridgeSnapshot(cwd);
      if (!bridge || corrupt) process.exit(0);

      // 跳过旧 v1 schema
      if (bridge._schema_version !== 2) process.exit(0);

      // 在锁外预评估安全风险（execFileSync 无法在同步 mutator 内运行）
      // OPT-6: 传入已缓存 epoch，相同 changeEpoch 则跳过 git diff
      const touchedFiles = bridge.change?.touchedFiles || [];
      const cachedEpoch = bridge.change?.securityRisk?.evaluatedAtEpoch ?? null;
      const changeEpoch = bridge.change?.changeEpoch ?? 0;
      let externalRisk = null;
      if (touchedFiles.length > 0) {
        const risk = evaluateSecurityRisk(
          cwd,
          touchedFiles,
          cachedEpoch,
          changeEpoch,
        );
        // L1 fix: 无论 required=true/false，都存回缓存，确保 evaluatedAtEpoch 被写入
        // 原代码只在 required=true 时赋值，导致安全结果每次重跑 git diff
        if (risk !== null) externalRisk = risk;
      }

      // F13 fix：安全风险更新 + 门决策 + lease 写入合并到一次 mutateBridge（消除 TOCTOU 竞态）
      let nextToInject = null;
      let leased = false;
      try {
        await shared.mutateBridge(cwd, (draft) => {
          if (draft._schema_version !== 2) return;
          // 注入最新安全风险（H4 fix：epoch 守卫，并发写入更新了 changeEpoch 时跳过过期 risk）
          if (
            externalRisk &&
            draft.change &&
            draft.change.changeEpoch === changeEpoch
          ) {
            draft.change.securityRisk = externalRisk;
          }
          // 用最新 bridge 数据重新决策（持锁状态，无 TOCTOU 竞态窗口）
          const candidate = nextGateToInject(draft);
          if (!candidate) return;
          // P2 fix: 门不存在时（如 escalation 首次出现于旧 bridge）自动初始化，不再直接 return
          if (!draft.gates[candidate.name]) {
            draft.gates[candidate.name] = {
              status: "idle",
              epoch: null,
              leaseUntil: null,
              failCount: 0,
            };
          }
          draft.gates[candidate.name].status = "leased";
          draft.gates[candidate.name].leaseUntil = new Date(
            Date.now() + LEASE_TTL_MS,
          ).toISOString();
          nextToInject = candidate;
        });
        leased = nextToInject !== null;
      } catch (e) {
        shared.logHookError("forge-quality-pipeline/toctou", e);
      }

      if (!leased) process.exit(0);

      // 注入质量命令到对话上下文
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "PostToolUse",
            additionalContext: nextToInject.message,
          },
        }),
      );
    } catch (e) {
      shared.logHookError("forge-quality-pipeline", e);
      process.exit(0);
    }
  });
} else {
  // ─── 可复用导出（供 Cursor hooks 调用）────────────────────────────────────
  module.exports = { nextGateToInject, evaluateSecurityRisk };
}
