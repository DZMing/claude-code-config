# 技术栈自动检测规则

## 检测优先级

1. **PRD 明确指定**：PRD 中出现框架名 → 直接使用
2. **package.json 检测**：
   - `next` → nextjs
   - `nuxt` → nuxtjs（兜底 generic-web）
   - `react` + `vite` → react-vite（兜底 generic-web）
   - `express` / `fastify` / `hono` → nodejs-api（兜底 generic-web）
3. **pyproject.toml / requirements.txt 检测**：
   - `fastapi` → fastapi
   - `django` → django（兜底 generic-web）
   - `flask` → flask（兜底 generic-web）
4. **无任何标志** → 默认 Next.js（最适合非程序员的全栈方案，不调用 WebSearch）

## 检测脚本（Forge Step 3 中执行）

```bash
# 检测顺序
STACK="nextjs"  # 默认

if [ -f "package.json" ]; then
  if grep -q '"next"' package.json; then STACK="nextjs"
  elif grep -q '"nuxt"' package.json; then STACK="generic-web"
  elif grep -q '"vite"' package.json; then STACK="generic-web"
  elif grep -q '"express"\|"fastify"\|"hono"' package.json; then STACK="generic-web"
  fi
elif [ -f "pyproject.toml" ] || [ -f "requirements.txt" ]; then
  if grep -q 'fastapi' pyproject.toml 2>/dev/null || grep -q 'fastapi' requirements.txt 2>/dev/null; then
    STACK="fastapi"
  else
    STACK="generic-web"
  fi
fi

echo $STACK
```

## 约束模板映射

| 检测结果 | 读取模板 |
|---------|---------|
| nextjs | `~/.forge/templates/constraints/nextjs.md` |
| fastapi | `~/.forge/templates/constraints/fastapi.md` |
| 其他 | `~/.forge/templates/constraints/generic-web.md` |
