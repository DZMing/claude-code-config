#!/usr/bin/env node
// Command logger hook — PreToolUse Bash
// Logs every bash command with timestamp + session ID to ~/.claude/logs/bash-audit.log
// For debugging and audit. Silent failure — never blocks execution.

const fs = require("fs");
const path = require("path");
const os = require("os");

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
    const cmd = data.tool_input?.command || "";
    if (!cmd) process.exit(0);

    const logDir = path.join(os.homedir(), ".claude", "logs");
    fs.mkdirSync(logDir, { recursive: true });

    const logFile = path.join(logDir, "bash-audit.log");
    const sessionId = (data.session_id || "unknown").slice(0, 8);
    const timestamp = new Date().toISOString();
    const entry = `${timestamp}\t[${sessionId}]\t${cmd}\n`;

    fs.appendFileSync(logFile, entry, "utf8");
  } catch {
    // Silent fail
  }
  process.exit(0);
});
