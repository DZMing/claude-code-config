#!/bin/bash
# Planning with Files: Check completion status on Stop

PLUGIN_ROOT="$HOME/.claude/skills/planning-with-files"

if [ -f "task_plan.md" ]; then
    if [ -f "${PLUGIN_ROOT}/scripts/check-complete.sh" ]; then
        bash "${PLUGIN_ROOT}/scripts/check-complete.sh"
    else
        echo "[Planning] Session ending. Please verify all task_plan.md phases are marked complete."
    fi
fi
