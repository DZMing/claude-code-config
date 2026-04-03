#!/bin/bash

set -euo pipefail

# Paperclip agent bypass — hooks are for human sessions
if [ -n "${PAPERCLIP_RUN_ID:-}" ]; then exit 0; fi

tool_info="$(cat)"

project_root="${CLAUDE_PROJECT_DIR:-}"
if [[ -z "$project_root" ]]; then
  exit 0
fi

if ! command -v python3 >/dev/null 2>&1; then
  exit 0
fi

vals_raw="$(python3 - "$tool_info" <<'PY' 2>/dev/null || true
import json
import sys

def safe_str(x) -> str:
    if x is None:
        return ""
    if isinstance(x, str):
        return x
    try:
        return str(x)
    except Exception:
        return ""

def get(data: dict, path: str, default: str = "") -> str:
    cur = data
    for part in path.split("."):
        if not part:
            continue
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            return default
    return safe_str(cur) if not isinstance(cur, dict) else default

raw = sys.argv[1] if len(sys.argv) > 1 else "{}"
try:
    data = json.loads(raw)
    if not isinstance(data, dict):
        data = {}
except Exception:
    data = {}

print(get(data, "tool_name", ""))
print(get(data, "tool_input.file_path", ""))
print(get(data, "session_id", ""))
PY
)"

tool_name="$(printf '%s\n' "$vals_raw" | sed -n '1p')"
file_path="$(printf '%s\n' "$vals_raw" | sed -n '2p')"
session_id="$(printf '%s\n' "$vals_raw" | sed -n '3p')"

if [[ ! "$tool_name" =~ ^(Edit|MultiEdit|Write)$ ]] || [[ -z "$file_path" ]]; then
  exit 0
fi

if [[ "$file_path" =~ \.(md|markdown)$ ]]; then
  exit 0
fi

cache_dir="$project_root/.claude/tsc-cache/${session_id:-default}"
mkdir -p "$cache_dir"

detect_repo() {
  local file="$1"
  local relative_path="${file#"$project_root"/}"
  local repo
  repo="$(printf '%s' "$relative_path" | cut -d'/' -f1)"

  case "$repo" in
    frontend|client|web|app|ui)
      printf '%s' "$repo"
      ;;
    backend|server|api|src|services)
      printf '%s' "$repo"
      ;;
    database|prisma|migrations)
      printf '%s' "$repo"
      ;;
    packages)
      local package
      package="$(printf '%s' "$relative_path" | cut -d'/' -f2)"
      if [[ -n "$package" ]]; then
        printf '%s' "packages/$package"
      else
        printf '%s' "$repo"
      fi
      ;;
    examples)
      local example
      example="$(printf '%s' "$relative_path" | cut -d'/' -f2)"
      if [[ -n "$example" ]]; then
        printf '%s' "examples/$example"
      else
        printf '%s' "$repo"
      fi
      ;;
    *)
      if [[ "$relative_path" != */* ]]; then
        printf '%s' "root"
      else
        printf '%s' "unknown"
      fi
      ;;
  esac
}

get_build_command() {
  local repo="$1"
  local repo_path="$project_root/$repo"

  if [[ -f "$repo_path/package.json" ]]; then
    if grep -q '"build"' "$repo_path/package.json" 2>/dev/null; then
      if [[ -f "$repo_path/pnpm-lock.yaml" ]]; then
        printf '%s' "cd $repo_path && pnpm build"
      elif [[ -f "$repo_path/package-lock.json" ]]; then
        printf '%s' "cd $repo_path && npm run build"
      elif [[ -f "$repo_path/yarn.lock" ]]; then
        printf '%s' "cd $repo_path && yarn build"
      else
        printf '%s' "cd $repo_path && npm run build"
      fi
      return
    fi
  fi

  if [[ "$repo" == "database" ]] || [[ "$repo" =~ prisma ]]; then
    if [[ -f "$repo_path/schema.prisma" ]] || [[ -f "$repo_path/prisma/schema.prisma" ]]; then
      printf '%s' "cd $repo_path && npx prisma generate"
      return
    fi
  fi

  printf '%s' ""
}

get_tsc_command() {
  local repo="$1"
  local repo_path="$project_root/$repo"

  if [[ -f "$repo_path/tsconfig.json" ]]; then
    if [[ -f "$repo_path/tsconfig.app.json" ]]; then
      printf '%s' "cd $repo_path && npx tsc --project tsconfig.app.json --noEmit"
    else
      printf '%s' "cd $repo_path && npx tsc --noEmit"
    fi
    return
  fi

  printf '%s' ""
}

repo="$(detect_repo "$file_path")"

if [[ "$repo" == "unknown" ]] || [[ -z "$repo" ]]; then
  exit 0
fi

echo "$(date +%s):$file_path:$repo" >> "$cache_dir/edited-files.log"

if ! grep -q "^$repo$" "$cache_dir/affected-repos.txt" 2>/dev/null; then
  echo "$repo" >> "$cache_dir/affected-repos.txt"
fi

build_cmd="$(get_build_command "$repo")"
tsc_cmd="$(get_tsc_command "$repo")"

if [[ -n "$build_cmd" ]]; then
  echo "$repo:build:$build_cmd" >> "$cache_dir/commands.txt.tmp"
fi

if [[ -n "$tsc_cmd" ]]; then
  echo "$repo:tsc:$tsc_cmd" >> "$cache_dir/commands.txt.tmp"
fi

if [[ -f "$cache_dir/commands.txt.tmp" ]]; then
  sort -u "$cache_dir/commands.txt.tmp" > "$cache_dir/commands.txt"
  rm -f "$cache_dir/commands.txt.tmp"
fi

exit 0
