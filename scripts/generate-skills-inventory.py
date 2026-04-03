#!/usr/bin/env python3
"""
生成技能清单脚本
"""
import os
from pathlib import Path

SKILLS_DIR = Path.home() / ".claude" / "skills"
OUTPUT_FILE = Path.home() / ".claude" / "skills-inventory-final.txt"


def main():
    active_count = 0
    symlink_count = 0
    invalid_count = 0

    with open(OUTPUT_FILE, "w") as f:
        for item in SKILLS_DIR.iterdir():
            if not item.is_dir():
                continue

            name = item.name

            # 检查符号链接
            if item.is_symlink():
                target = os.readlink(item)
                f.write(f"{name}:symlink->{target}\n")
                symlink_count += 1
            # 检查 SKILL.md
            elif (item / "SKILL.md").exists():
                f.write(f"{name}:active\n")
                active_count += 1
            # 无效目录
            else:
                f.write(f"{name}:invalid\n")
                invalid_count += 1

    print(f"✅ 技能清单已生成: {OUTPUT_FILE}")
    print(f"\n=== 统计 ===")
    print(f"总条目数: {active_count + symlink_count + invalid_count}")
    print(f"激活技能: {active_count}")
    print(f"符号链接: {symlink_count}")
    print(f"无效目录: {invalid_count}")


if __name__ == "__main__":
    main()
