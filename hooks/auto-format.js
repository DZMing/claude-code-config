#!/usr/bin/env node
// Auto-format hook — PostToolUse Write|Edit
// Runs Prettier (JS/TS/JSON/CSS/MD) or Ruff (Python) after file writes.
// Silent failure — never blocks tool execution.

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PRETTIER_EXTS = new Set([
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".json",
  ".css",
  ".scss",
  ".html",
  ".md",
  ".yaml",
  ".yml",
]);

let input = "";
const stdinTimeout = setTimeout(() => process.exit(0), 3000);
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  clearTimeout(stdinTimeout);
  try {
    const data = JSON.parse(input);
    const filePath = data.tool_input?.file_path || "";
    if (!filePath) process.exit(0);

    try {
      fs.accessSync(filePath);
    } catch {
      process.exit(0);
    }

    const ext = path.extname(filePath).toLowerCase();

    if (PRETTIER_EXTS.has(ext)) {
      spawnSync("npx", ["prettier", "--write", "--log-level=error", filePath], {
        timeout: 10000,
        stdio: "ignore",
      });
    } else if (ext === ".py") {
      spawnSync("ruff", ["format", filePath], {
        timeout: 10000,
        stdio: "ignore",
      });
    }
  } catch {
    // Silent fail
  }
  process.exit(0);
});
