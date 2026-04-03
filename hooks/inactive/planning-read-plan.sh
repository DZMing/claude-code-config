#!/bin/bash
# Planning with Files: Read task_plan.md before major actions
# Only outputs if task_plan.md exists

if [ -f "task_plan.md" ]; then
    echo "[Planning] Current task plan (first 30 lines):"
    head -30 task_plan.md
fi
