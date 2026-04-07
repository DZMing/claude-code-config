#!/bin/bash
# MemOS Integration for AWS Code
# Search and save memories via MemOS API

MEMOS_API="http://localhost:8000/product"
USER_ID="openclaw-main"

case "$1" in
  search)
    # Search memories
    QUERY="${2:-}"
    if [ -z "$QUERY" ]; then
      echo "Usage: memos search <query>"
      exit 1
    fi

    curl -s -X POST "$MEMOS_API/search" \
      -H "Content-Type: application/json" \
      -d "{\"user_id\":\"$USER_ID\",\"query\":\"$QUERY\"}" \
      | jq -r '.data.text_mem[] | "📝 " + .memory' | head -5
    ;;

  save)
    # Save current context
    CONTEXT="${2:-}"
    if [ -z "$CONTEXT" ]; then
      echo "Usage: memos save <context>"
      exit 1
    fi

    curl -s -X POST "$MEMOS_API/add" \
      -H "Content-Type: application/json" \
      -d "{\"user_id\":\"$USER_ID\",\"messages\":[{\"role\":\"user\",\"content\":\"$CONTEXT\"}]}" \
      | jq -r '.message // "✅ Saved"'
    ;;

  *)
    echo "MemOS Integration"
    echo "Usage:"
    echo "  memos search <query>  - Search memories"
    echo "  memos save <context>  - Save context"
    ;;
esac
