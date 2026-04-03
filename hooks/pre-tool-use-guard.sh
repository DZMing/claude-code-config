#!/bin/bash

set -euo pipefail

# Paperclip agent 会话自动放行（非交互式，有 adapter 自身安全机制）
if [ -n "${PAPERCLIP_RUN_ID:-}" ]; then
  exit 0
fi

if [ -t 0 ]; then
  exit 0
fi

input="$(cat)"

python3 - "$input" <<'PY'
import json
import sys

raw = sys.argv[1] if len(sys.argv) > 1 else ""
try:
    data = json.loads(raw) if raw else {}
    if not isinstance(data, dict):
        data = {}
except Exception:
    data = {}

tool_name = (data.get("tool_name") or "")
tool_input = data.get("tool_input") or {}


cmd = (tool_input.get("command") or "").lower()
file_path = (
    tool_input.get("file_path")
    or tool_input.get("filePath")
    or tool_input.get("path")
    or ""
)
fp = file_path.lower()

unsafe = [
    "rm -rf",
    "git push --force",
    "git push -f",
    "git reset --hard",
    "mkfs",
]

if tool_name == "Bash":
    if (
        any(p in cmd for p in unsafe)
        or cmd.strip().startswith("sudo ")
        or " dd " in cmd
        or cmd.strip().startswith("dd ")
    ):
        try:
            with open('/dev/tty', 'w') as tty_out:
                tty_out.write(f"\n\033[1;33m⚠️  老金检测到高危命令:\033[0m {cmd}\n")
                tty_out.write("\033[1;36m老板，这步有点险，你准吗? (y/N): \033[0m")
                tty_out.flush()
                with open('/dev/tty', 'r') as tty_in:
                    choice = tty_in.readline().strip().lower()
                    if choice == 'y':
                        sys.exit(0)
        except Exception:
            pass
        print("Blocked: unsafe bash command", file=sys.stderr)
        sys.exit(2)

if file_path:
    sensitive_names = {
        ".env",
        ".zshrc",
        ".zprofile",
        ".bashrc",
        ".bash_profile",
        ".profile",
        ".gitconfig",
        ".npmrc",
        ".netrc",
        ".pypirc",
    }

    is_sensitive = False
    if "/.git/" in fp or "/.ssh/" in fp or fp.endswith(".env") or ".env." in fp:
        is_sensitive = True

    if not is_sensitive:
        base = fp.rsplit("/", 1)[-1]
        if base in sensitive_names:
            is_sensitive = True

    if is_sensitive or "/library/keychains/" in fp:
        try:
            with open('/dev/tty', 'w') as tty_out:
                tty_out.write(f"\n\033[1;33m⚠️  老金检测到敏感路径:\033[0m {file_path}\n")
                tty_out.write("\033[1;36m老板，这地儿能碰吗? (y/N): \033[0m")
                tty_out.flush()
                with open('/dev/tty', 'r') as tty_in:
                    choice = tty_in.readline().strip().lower()
                    if choice == 'y':
                        sys.exit(0)
        except Exception:
            pass
        print("Blocked: sensitive file access", file=sys.stderr)
        sys.exit(2)

raise SystemExit(0)
PY



