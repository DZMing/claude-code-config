#!/bin/bash
# Planning with Files: Reminder to update task_plan.md after file changes

if [ -f "task_plan.md" ]; then
    echo "[Planning] File updated. If this completes a phase, update task_plan.md status."
fi
