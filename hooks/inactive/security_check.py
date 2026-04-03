#!/usr/bin/env python3
"""安全检查 - 检测硬编码凭证和安全风险"""

import json
import sys
import re


def main():
    raw = sys.argv[1] if len(sys.argv) > 1 else ""
    try:
        data = json.loads(raw) if raw else {}
    except Exception:
        data = {}

    tool_name = data.get("tool_name", "")
    tool_input = data.get("tool_input", {}) or {}

    content = tool_input.get("content") or tool_input.get("newString") or ""
    file_path = tool_input.get("file_path") or tool_input.get("filePath") or ""

    if not content or tool_name not in ["Edit", "Write", "MultiEdit"]:
        sys.exit(0)

    issues = []

    # 检测硬编码凭证
    secret_patterns = [
        (r'(API_KEY|APIKEY|api_key)\s*[=:]\s*["'][a-zA-Z0-9_\-]{16,}["']', "API Key"),
        (r'(SECRET|secret|Secret)\s*[=:]\s*["'][a-zA-Z0-9_\-]{16,}["']', "Secret"),
        (r'(TOKEN|token|Token)\s*[=:]\s*["'][a-zA-Z0-9_\-]{16,}["']', "Token"),
        (r'(PASSWORD|password|Password)\s*[=:]\s*["'][^"']{8,}["']', "Password"),
        (r'(PRIVATE_KEY|private_key)\s*[=:]\s*["']', "Private Key"),
    ]

    for pattern, name in secret_patterns:
        if re.search(pattern, content):
            issues.append(f"检测到硬编码 {name}")

    # 检测安全风险代码
    security_risks = [
        (r'\.innerHTML\s*=', "XSS 风险: innerHTML 直接赋值"),
        (r'eval\s*\(', "代码注入风险: eval()"),
        (r'exec\s*\(', "代码注入风险: exec()"),
        (r'SELECT\s+\*.*WHERE.*\+', "SQL 注入风险: 字符串拼接"),
        (r'__proto__', "原型污染风险: __proto__"),
        (r'document\.write\s*\(', "XSS 风险: document.write"),
    ]

    for pattern, desc in security_risks:
        if re.search(pattern, content, re.IGNORECASE):
            issues.append(desc)

    if issues:
        msg = "安全检查发现问题\n\n" + "\n".join(f"- {i}" for i in issues)
        msg += "\n\n建议：\n"
        msg += "1. 硬编码凭证 -> 移动到 .env 文件\n"
        msg += "2. 安全风险 -> 使用安全的替代方案"

        print(json.dumps({
            "decision": "block",
            "reason": msg
        }))

    sys.exit(0)


if __name__ == "__main__":
    main()
