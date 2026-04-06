# 浏览器使用原则

优先级：WebSearch > chrome-devtools MCP > playwright-cli

1. **搜索优先用 WebSearch** — 不必开浏览器
2. **需要保留登录态** → chrome-devtools MCP 连真实 Chrome
3. **自动化测试 / 无需登录** → playwright-cli（CLI 版，省 token）
4. **每个页面用完后关掉** — 不留残留标签
