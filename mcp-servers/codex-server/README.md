# Codex MCP Server

MCP Server封装Codex CLI，让Claude Code可以通过MCP协议调用本地的Codex工具。

## 核心功能

1. **上下文传递**：支持conversationId机制，多次调用共享历史对话
2. **自动存储**：对话历史自动保存到 `~/.mcp-context/codex/`
3. **错误处理**：完善的错误处理和日志记录
4. **模型选择**：支持指定不同的Codex模型

## 安装步骤

### 1. 确保已安装Codex CLI

```bash
npm i -g @openai/codex
```

### 2. 配置Codex API Key

```bash
# 官方API
export OPENAI_API_KEY="sk-..."

# 或使用中转站
export OPENAI_API_KEY="your_key"
export OPENAI_BASE_URL="https://your-proxy.com/v1"
```

### 3. 安装MCP Server依赖

```bash
cd mcp-servers/codex-server
npm install  # 当前无外部依赖，使用Node.js内置模块
```

### 4. 测试运行

```bash
chmod +x index.js
echo '{"prompt":"用Python写个Hello World"}' | node index.js
```

## 配置到Claude Desktop

在 `~/.config/claude/claude_desktop_config.json` (macOS/Linux) 或 `C:\Users\你的用户名\AppData\Roaming\Claude\claude_desktop_config.json` (Windows) 中添加：

```json
{
  "mcpServers": {
    "codex": {
      "command": "node",
      "args": [
        "/绝对路径/mcp-servers/codex-server/index.js"
      ]
    }
  }
}
```

**重要**：必须使用绝对路径！

## 使用示例

在Claude Code中使用：

```javascript
// 通过MCP调用Codex
const result = await mcp__codex({
  prompt: "用FastAPI实现JWT登录功能",
  conversationId: "session_123",  // 可选，用于保持上下文
  model: "gpt-5.1-codex-max"      // 可选，默认使用gpt-5.1-codex-max
});

// 后续调用可以继续使用相同的conversationId
const result2 = await mcp__codex({
  prompt: "在上面的代码基础上添加refresh token功能",
  conversationId: "session_123"  // 复用上下文
});
```

## 日志和调试

### 查看日志

```bash
tail -f ~/.mcp-context/codex/mcp-server.log
```

### 启用调试模式

```bash
export DEBUG_MCP=1
node index.js
```

## 上下文管理

### 查看所有会话

```bash
ls ~/.mcp-context/codex/
```

### 清理旧会话

```bash
# 删除7天前的会话文件
find ~/.mcp-context/codex/ -name "*.json" -mtime +7 -delete
```

## 故障排除

### 问题1：Codex CLI未找到

**错误**：`无法启动Codex CLI: spawn codex ENOENT`

**解决**：确保Codex CLI已安装并在PATH中：
```bash
which codex  # macOS/Linux
where codex  # Windows
```

### 问题2：API认证失败

**错误**：`ERROR: unexpected status 401 Unauthorized`

**解决**：检查API Key配置：
```bash
echo $OPENAI_API_KEY  # 检查是否配置
codex config list     # 查看Codex配置
```

### 问题3：MCP Server无响应

**解决**：
1. 检查日志：`cat ~/.mcp-context/codex/mcp-server.log`
2. 手动测试：`echo '{"prompt":"test"}' | node index.js`
3. 重启Claude Desktop

## 技术细节

### MCP协议通信

- **输入**：通过stdin接收JSON格式的请求
- **输出**：通过stdout返回JSON格式的响应
- **日志**：通过stderr输出调试信息（可选）

### 上下文存储格式

```json
[
  {
    "role": "user",
    "content": "用户的提示词"
  },
  {
    "role": "assistant",
    "content": "Codex的响应"
  }
]
```

### 性能优化

- 上下文文件使用JSON格式，便于读写
- 历史消息自动压缩到提示词中
- 支持异步处理，不阻塞其他请求

## 许可证

MIT License
