# 浏览器使用原则

优先级：WebSearch > chrome-devtools MCP > playwright/puppeteer

1. **搜索优先用 WebSearch** — 不必开浏览器
2. **需要保留登录态 / 操作真实账号** → 用 chrome-devtools MCP 连真实 Chrome
3. **自动化测试 / 无需登录 / 批量抓取** → playwright/puppeteer 可用
4. **每个页面用完后关掉** — 不留残留标签
5. **同时最多 1 个标签页** — 开新页前先关旧页
