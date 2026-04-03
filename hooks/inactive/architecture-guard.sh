#!/bin/bash
# 架构边界检查 Hook（PreToolUse - Write/Edit）
# 检查依赖方向和禁止的导入模式

FILE="${1:-}"
[ -z "$FILE" ] && exit 0
[ ! -f "$FILE" ] && exit 0

# 跳过非代码文件
EXT="${FILE##*.}"
case "$EXT" in
  ts|tsx|js|jsx|py|go|rs|java) ;;
  *) exit 0 ;;
esac

ISSUES=""

# 检查1: UI层不应直接导入数据库/ORM
if echo "$FILE" | grep -qiE "(component|page|view|screen|ui)" 2>/dev/null; then
  if grep -qiE "(prisma|mongoose|sequelize|typeorm|sqlalchemy|knex)" "$FILE" 2>/dev/null; then
    ISSUES="${ISSUES}\n⚠️ 架构违规：UI层直接导入数据库（应通过 Service 层）"
  fi
fi

# 检查2: 禁止跨模块的相对路径导入（超过3层）
if grep -qE "from ['\"]\\.\\.(/\\.\\.){3,}" "$FILE" 2>/dev/null; then
  ISSUES="${ISSUES}\n⚠️ 架构警告：过深的相对路径导入（建议用别名或绝对路径）"
fi

# 检查3: 测试文件不应导出被生产代码使用的函数
if echo "$FILE" | grep -qiE "(test|spec)" 2>/dev/null; then
  if grep -qE "^export (function|const|class)" "$FILE" 2>/dev/null; then
    ISSUES="${ISSUES}\n💡 提醒：测试文件中有导出，确认不被生产代码引用"
  fi
fi

if [ -n "$ISSUES" ]; then
  echo -e "$ISSUES"
fi

exit 0
