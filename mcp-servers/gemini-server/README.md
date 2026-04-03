# Gemini MCP Server

MCP Server封装Gemini CLI，专注代码审查场景，让Claude Code可以通过MCP协议调用本地的Gemini工具。

## 核心功能

1. **SESSION_ID多轮对话**：支持`--resume SESSION_ID`机制，多次调用共享历史对话
2. **自动代理配置**：从`mcp-config.json`读取代理设置，解决网络问题
3. **Windows兼容**：自动处理HOME路径、中文编码等问题
4. **错误处理**：完善的错误处理和日志记录

## 配置文件

项目根目录的 `mcp-config.json` 包含所有MCP服务器的配置：

```json
{
  "proxy": {
    "enabled": true,
    "http": "http://127.0.0.1:15236",
    "https": "http://127.0.0.1:15236"
  },
  ...
}
```

> ⚠️ **重要**：`15236` 是示例端口，必须改成你自己的魔法端口！
>
> Gemini网页认证（`gemini auth`）需要通过代理访问Google服务，端口配置错误将无法完成认证。
>
> 常见代理端口：Clash(7890)、V2Ray(10808)、自定义端口等。

### 配置项说明

| 配置项 | 说明 |
|--------|------|
| `proxy.enabled` | 是否启用代理 |
| `proxy.http/https` | 代理服务器地址 |
| `gemini.defaultArgs` | Gemini CLI默认参数 |
| `gemini.environment` | Gemini CLI环境变量 |
| `windows.forceUserprofileAsHome` | Windows下强制使用USERPROFILE作为HOME |

## 安装步骤

### 1. 确保已安装Gemini CLI

```bash
npm install -g @anthropic-ai/gemini-cli
```

### 2. 授权Gemini（网页授权）

```bash
gemini auth login
```

### 3. 测试Gemini CLI

```bash
# 设置代理后测试
HTTPS_PROXY=http://127.0.0.1:15236 gemini "Hello" -o stream-json --yolo
```

### 4. 测试MCP Server

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node index.js
```

## 配置到Claude Desktop

在 `~/.config/claude/claude_desktop_config.json` (macOS/Linux) 或 `C:\Users\你的用户名\AppData\Roaming\Claude\claude_desktop_config.json` (Windows) 中添加：

```json
{
  "mcpServers": {
    "gemini": {
      "command": "node",
      "args": [
        "/绝对路径/mcp-servers/gemini-server/index.js"
      ]
    }
  }
}
```

**重要**：必须使用绝对路径！

## 使用示例

### 基础使用

```javascript
// 通过MCP调用Gemini
const result = await mcp__gemini({
  prompt: "请分析这段代码的优缺点：\n\n```python\ndef hello():\n    print('hello')\n```"
});
```

### 代码审查模式

```javascript
// 启用reviewMode，自动添加审查指引
const result = await mcp__gemini({
  prompt: `请审查以下代码：

\`\`\`python
def login(username, password):
    if username == "admin" and password == "123456":
        return True
    return False
\`\`\`
`,
  reviewMode: true,  // 自动添加代码质量、安全性、性能等审查维度
  conversationId: "review_session_1"
});
```

### 持续审查（多次调用共享上下文）

```javascript
// 第一次审查
const review1 = await mcp__gemini({
  prompt: "审查UserService.py的代码质量",
  conversationId: "refactor_user_module",
  reviewMode: true
});

// 第二次基于之前的审查继续
const review2 = await mcp__gemini({
  prompt: "根据上面的建议，我修改了依赖注入部分，请再审查一次",
  conversationId: "refactor_user_module",  // 复用上下文
  reviewMode: true
});
```

## 代码审查模式详解

启用 `reviewMode: true` 时，Gemini会按照以下维度自动审查：

1. **代码质量**：是否符合最佳实践？
2. **安全性**：是否存在安全漏洞？
3. **性能**：是否有性能问题？
4. **可维护性**：代码是否易于理解和维护？
5. **错误处理**：异常处理是否完善？

审查报告以Markdown格式输出，包含问题描述和改进建议。

## 日志和调试

### 查看日志

```bash
tail -f ~/.mcp-context/gemini/mcp-server.log
```

### 启用调试模式

```bash
export DEBUG_MCP=1
node index.js
```

## 上下文管理

### 查看所有会话

```bash
ls ~/.mcp-context/gemini/
```

### 查看特定会话的历史

```bash
cat ~/.mcp-context/gemini/review_session_1.json | jq
```

### 清理旧会话

```bash
# 删除7天前的会话文件
find ~/.mcp-context/gemini/ -name "*.json" -mtime +7 -delete
```

## 故障排除

### 问题1：认证超时/打开浏览器

**错误**：`Authentication timed out` 或自动打开浏览器

**解决**：
1. 检查代理配置是否正确（`mcp-config.json`中的`proxy`设置）
2. 确保`GEMINI_IDE_INTEGRATION`设为`false`
3. 手动测试：`HTTPS_PROXY=http://127.0.0.1:15236 gemini "test" --yolo`

### 问题2：Gemini CLI未找到

**错误**：`spawn gemini ENOENT`

**解决**：确保Gemini CLI已安装并在PATH中：
```bash
where gemini  # Windows
which gemini  # macOS/Linux
```

### 问题3：HOME路径问题（Windows）

**错误**：找不到oauth_creds.json

**解决**：确保`mcp-config.json`中`windows.forceUserprofileAsHome`设为`true`

## 最佳实践

### 1. 合理使用conversationId

- **同一个重构任务**：复用conversationId，让Gemini看到之前的审查意见
- **不同的代码模块**：使用不同conversationId，避免混淆
- **一次性审查**：不传conversationId，节省上下文存储

### 2. 优化审查效率

```javascript
// 只审查关键代码（>50行或核心逻辑）
if (changedLines > 50 || isCriticalModule) {
  await mcp__gemini({
    prompt: `审查以下${changedLines}行代码`,
    reviewMode: true
  });
}
```

### 3. 批量审查

```javascript
// 审查多个文件时，分批次调用
const files = ['service.py', 'model.py', 'api.py'];
for (const file of files) {
  const code = fs.readFileSync(file, 'utf-8');
  await mcp__gemini({
    prompt: `审查${file}的代码：\n\n${code}`,
    conversationId: "batch_review",  // 共享上下文
    reviewMode: true
  });
}
```

## 技术细节

### MCP协议通信

- **输入**：通过stdin接收JSON格式的请求
- **输出**：通过stdout返回JSON格式的响应
- **日志**：通过stderr输出调试信息（可选）

### 请求格式

```json
{
  "prompt": "审查代码...",
  "conversationId": "可选，用于保持上下文",
  "model": "可选，指定Gemini模型",
  "reviewMode": true
}
```

### 响应格式

```json
{
  "result": "审查报告内容...",
  "conversationId": "会话ID",
  "metadata": {
    "model": "gemini-3-pro",
    "timestamp": "2025-12-04T10:30:00.000Z",
    "historyLength": 4,
    "reviewMode": true
  }
}
```

## 与Codex MCP Server的区别

| 特性 | Codex MCP Server | Gemini MCP Server |
|------|------------------|-------------------|
| 主要用途 | 代码生成 | 代码审查 |
| 命令格式 | `codex exec` | `gemini -p` |
| 特殊模式 | 无 | `reviewMode`审查模式 |
| 免费配额 | 需订阅ChatGPT Plus | 1000次/天（网页授权）|
| 成本 | 按token计费 | 免费（有配额） |

## 许可证

MIT License
