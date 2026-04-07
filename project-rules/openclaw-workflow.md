# 🔧 OpenClaw 开发工作流程 (OpenClaw Development Workflow)

> **作用**: 规范 OpenClaw 配置和服务管理流程，防止误操作和配置漂移

---

## OpenClaw Development

**核心原则**：在使用 OpenClaw 配置时，始终验证正确的配置文件和 profile。

### Profile 验证规则

**在修改任何 OpenClaw 配置前，必须执行：**

1. **验证当前 Profile**：

   ```bash
   # 检查当前激活的 profile
   openclaw config get profile

   # 验证配置文件位置
   ls -la ~/.openclaw/profiles/
   ```

2. **识别 Profile 类型**：
   - **default**: 个人开发环境配置
   - **gateway**: 生产网关配置（更高安全要求）
   - **自定义**: 特定项目的隔离配置

3. **禁止假设**：
   - ❌ 不要假设多个 bot 共享同一个 token
   - ❌ 不要跨 profile 复用配置
   - ✅ 始终显式验证 bot token 配置

### Bot Token 配置检查清单

**在修改 bot token 前：**

- [ ] 确认目标 bot 的名称和用途
- [ ] 检查是否已存在该 bot 的 token 配置
- [ ] 验证 token 的作用域（只读/读写/管理员）
- [ ] 确认是否需要独立 token（不能复用）

**常见错误示例**：

```json
// ❌ 错误：假设所有 bot 共享同一个 telegram token
{
  "bot1": { "telegram_token": "TOKEN_123" },
  "bot2": { "telegram_token": "TOKEN_123" }  // 危险！
}

// ✅ 正确：每个 bot 使用独立的 token
{
  "bot1": { "telegram_token": "TOKEN_BOT1" },
  "bot2": { "telegram_token": "TOKEN_BOT2" }
}
```

---

## Service Management

**核心原则**：服务配置变更前必须备份，变更后增量重启验证。

### 配置变更前的备份流程

**修改服务配置前，必须执行：**

1. **完整备份当前配置**：

   ```bash
   # 备份整个配置目录
   timestamp=$(date +%Y%m%d_%H%M%S)
   cp -r ~/.openclaw ~/.openclaw.backup.$timestamp

   # 备份特定配置文件
   cp openclaw.json openclaw.json.backup.$timestamp
   ```

2. **记录当前状态**：

   ```bash
   # 记录运行中的服务
   openclaw service list > running_services.$timestamp.txt

   # 记录配置文件 hash（用于后续对比）
   sha256sum openclaw.json > config_hash.$timestamp.txt
   ```

3. **验证备份完整性**：
   ```bash
   # 确认备份文件存在且可读
   ls -lh ~/.openclaw.backup.$timestamp/openclaw.json
   ```

### 配置变更后的增量重启流程

**修改配置后，禁止一次性重启所有服务，必须增量重启：**

1. **优先级排序**：

   ```
   P0 核心服务 → gateway, auth
   P1 依赖服务 → database, cache
   P2 辅助服务 → monitor, logger
   ```

2. **增量重启步骤**：

   ```bash
   # 步骤 1: 重启核心服务
   openclaw restart gateway
   sleep 5
   openclaw status gateway  # 验证状态

   # 步骤 2: 验证核心服务稳定后，重启依赖服务
   openclaw restart database
   sleep 3
   openclaw status database

   # 步骤 3: 最后重启辅助服务
   openclaw restart monitor
   ```

3. **每步验证清单**：
   - [ ] 服务进程存在（`ps aux | grep <service>`）
   - [ ] 端口监听正常（`lsof -i :<port>`）
   - [ ] 日志无错误（`tail -f ~/.openclaw/logs/<service>.log`）
   - [ ] 健康检查通过（如果有 `/health` 端点）

### 回滚机制

**如果任何一步失败，立即回滚：**

```bash
# 停止所有服务
openclaw stop all

# 恢复备份
cp ~/.openclaw.backup.$timestamp/openclaw.json ~/.openclaw/openclaw.json

# 重启服务
openclaw start all

# 验证恢复成功
openclaw status all
```

---

## Configuration Management

**核心原则**：环境变量配置必须保留注释符号，保存后重启服务生效。

### .env 文件编辑规则

**编辑 `.env` 文件时，必须遵守：**

1. **保留注释符号**：

   ```bash
   # ✅ 正确：保留注释
   # Telegram Bot Token (required for notifications)
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF

   # ❌ 错误：删除了注释
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF
   ```

2. **验证语法**：
   - 无行内空格：`KEY=value`（而非 `KEY = value`）
   - 引号规则：值中包含空格时需要引号
   - 注释位置：注释必须在行首或单独一行

   ```bash
   # ✅ 正确语法
   API_KEY=abc123
   MESSAGE_TEXT="Hello World"  # 值中有空格需要引号
   # 这是注释行

   # ❌ 错误语法
   API_KEY = abc123           # 不要等号两边加空格
   MESSAGE_TEXT=Hello World   # 值中有空格必须加引号
   ```

3. **敏感信息处理**：

   ```bash
   # ✅ 使用环境变量引用，而非硬编码
   DATABASE_URL=${DATABASE_URL}
   SECRET_KEY=${SECRET_KEY}

   # ❌ 禁止硬编码敏感信息
   DATABASE_URL=postgresql://user:password123@localhost/db
   SECRET_KEY=sk_live_abc123def456
   ```

### 配置生效验证

**保存 `.env` 文件后，必须执行：**

1. **重启相关服务**：

   ```bash
   # 方法 1: 重启特定服务（推荐）
   openclaw restart <service-name>

   # 方法 2: 重新加载配置（如果支持）
   openclaw reload <service-name>
   ```

2. **验证环境变量加载**：

   ```bash
   # 检查服务是否读取了新的环境变量
   openclaw exec <service-name> -- env | grep <VARIABLE_NAME>
   ```

3. **功能验证**：
   ```bash
   # 测试配置是否生效（例如 API 连接）
   openclaw test <service-name>
   ```

### 配置变更检查清单

**每次修改 `.env` 文件后：**

- [ ] 备份原始文件（`cp .env .env.backup.<timestamp>`）
- [ ] 验证语法正确（无行内空格、引号正确）
- [ ] 保留注释符号（特别是敏感信息的说明）
- [ ] 保存文件后重启服务
- [ ] 验证环境变量加载成功
- [ ] 运行功能测试确保配置生效

---

## ⚠️ 常见错误案例

### 案例 1: 跨 Profile 复用 Token

**错误场景**：

```json
// profile: default (个人开发)
{
  "telegram_bot": { "token": "BOT_DEV_123" }
}

// profile: gateway (生产环境)
{
  "telegram_bot": { "token": "BOT_DEV_123" }  // ❌ 复用了开发 token
}
```

**后果**：

- 生产环境通知发送到开发群组
- 开发环境操作影响生产服务
- 安全审计无法追溯操作来源

**正确做法**：

```json
// profile: gateway (生产环境)
{
  "telegram_bot": { "token": "BOT_PROD_456" } // ✅ 独立生产 token
}
```

### 案例 2: 修改配置未重启服务

**错误场景**：

```bash
# 修改了 .env 文件
vim ~/.openclaw/.env
# 添加了新变量: NEW_FEATURE_ENABLED=true

# ❌ 未重启服务，直接测试
openclaw test my-service  # 测试失败，新功能未启用
```

**后果**：

- 配置不生效，误以为功能有问题
- 浪费时间调试"不存在的 bug"

**正确做法**：

```bash
# 修改配置后立即重启
vim ~/.openclaw/.env
openclaw restart my-service  # ✅ 重启服务
openclaw test my-service     # 验证新功能
```

### 案例 3: 一次性重启所有服务

**错误场景**：

```bash
# ❌ 同时重启所有服务
openclaw restart all

# 所有服务同时启动，资源竞争导致部分失败
openclaw status all
# gateway: ❌ failed (port conflict)
# database: ❌ failed (connection timeout)
# monitor: ❌ failed (dependency not ready)
```

**后果**：

- 无法确定哪个服务真正有问题
- 排查困难（是启动顺序问题还是配置问题）

**正确做法**：

```bash
# ✅ 增量重启，逐步验证
openclaw restart gateway && sleep 5 && openclaw status gateway
openclaw restart database && sleep 3 && openclaw status database
openclaw restart monitor  && sleep 2 && openclaw status monitor
```

---

## 📋 快速参考

### Profile 切换命令

```bash
# 列出所有 profiles
openclaw profile list

# 切换到指定 profile
openclaw profile use gateway

# 查看当前 profile
openclaw profile current
```

### 配置备份命令

```bash
# 快速备份当前配置
alias openclaw-backup='cp -r ~/.openclaw ~/.openclaw.backup.$(date +%Y%m%d_%H%M%S)'

# 快速恢复最新备份
alias openclaw-restore='cp -r ~/.openclaw.backup.$(ls -t ~/.openclaw.backup.* | head -1)/* ~/.openclaw/'
```

### 增量重启脚本

```bash
#!/bin/bash
# openclaw-incremental-restart.sh
services=("gateway" "database" "monitor")
for service in "${services[@]}"; do
  echo "Restarting $service..."
  openclaw restart $service
  sleep 3
  openclaw status $service || { echo "Failed at $service"; exit 1; }
done
echo "All services restarted successfully"
```

---

**生效规则**：所有 OpenClaw 相关任务必须遵守此工作流程
**生效范围**：配置修改、服务重启、环境变量变更、profile 切换
**违规后果**：可能导致服务不稳定、配置冲突、数据泄露
