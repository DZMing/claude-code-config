---
name: error-handling
description: |
  错误处理 SOP：7步闭环（诊断→定位→调研→方案→修复→验证→沉淀）。
  触发词：报错, 错误处理, debug, 排查
---
# 错误处理 SOP

## 7 步闭环

1. **诊断**：从最后一行往上读，翻译成人话
2. **定位**：代码逻辑错？环境配置错？数据问题？
3. **调研**：GitHub Issues → Stack Overflow → 官方文档（严禁凭感觉瞎改）
4. **方案**：改哪里？怎么改？影响什么？先 `git commit` 备份
5. **修复**：一次只改一处，改完立测，最多3次
6. **验证**：原操作不报错 + 相关功能正常 + 全套测试通过
7. **沉淀**：记录到 claude-progress.txt

## 常见报错速查

| 报错 | 人话 | 解决 |
|------|------|------|
| Cannot read property of undefined | 空杯子里找水喝 | `obj?.prop` 或 `if (obj)` |
| Module not found | 食材没买 | `npm install` |
| EADDRINUSE: port in use | 门牌号被占了 | `lsof -i :端口` 杀进程 |
| CORS policy blocked | 安全门禁拦截 | 后端配 CORS 或用代理 |
| 401 Unauthorized | 没带身份证 | 检查 Token 是否过期/正确 |
| 404 Not Found | 地址写错了 | 检查 URL 路径 |
| 500 Internal Server Error | 后厨着火了 | 看服务器日志 |
| SyntaxError | 写了错别字 | 检查括号/引号/逗号 |
| TypeError | 类型不对（用筷子喝汤）| 检查数据类型 |
| ReferenceError: X is not defined | 用了不存在的东西 | 检查变量定义/拼写 |
| npm ERR! peer dependency | 食材版本冲突 | `--legacy-peer-deps` 或升级 |
| ENOENT: no such file | 找不到文件 | 检查路径 |
| Timeout exceeded | 等太久了 | 检查网络/增加超时 |
| Out of memory | 东西太多装不下 | 减少数据量/优化内存 |

## 调研记录格式

```
搜索关键词：[你搜的内容]
参考链接：[找到的链接]
解决思路：[总结方法]
```

## 修复前备份

```bash
git add . && git commit -m "chore: 修复前备份"
```

## 沉淀格式

```markdown
> **遇到的坑**：
> **[报错名称]**
> - 现象：[描述]
> - 原因：[根因]
> - 解决：[方案]
> - 教训：[经验]
```

## 红线

- 没看懂报错就开始改代码
- 一次改好几个地方
- 改完不测试就说"修好了"
- 同一错误反复尝试超过3次（应换思路或求助）
- 把报错堆栈直接甩给老板
