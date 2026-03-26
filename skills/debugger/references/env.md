# 环境变量配置

本文档定义 debugger skill 所需的环境变量。

---

## ⚠️ 重要：工作目录检查

**在使用相对路径前，必须确认当前工作目录是正确的项目根目录。**

AI 有时会读取到错误的工作目录（如 plugin 目录），导致：
- 读取/写入文件到错误位置
- 日志文件找不到
- 配置文件读取失败

**解决方案**：
1. 操作前先执行 `pwd` 确认当前目录
2. 使用绝对路径代替相对路径
3. 在代码中动态获取项目根目录

---

## 必需的环境变量

### DEBUG_SESSION_ID

**用途**：标识本次调试会话的唯一 ID

**设置方式**：

```bash
# 方法1：从 .worker/.env 文件读取
export DEBUG_SESSION_ID=$(grep DEBUG_SESSION_ID ${pwd}/.worker/.env | cut -d'=' -f2)
```

**使用场景**：
- 埋点代码中标识会话
- 日志文件命名：`.worker/debug/logs/${DEBUG_SESSION_ID}.log`

---

### DEBUG_PORT

**用途**：日志服务端口（前端项目使用 HTTP 方式发送日志）

**设置方式**：

```bash
# 从 config.yaml 读取
export DEBUG_PORT=$(grep port ${pwd}/.worker/debug/config.yaml | cut -d' ' -f2)
```

**使用场景**：
- 前端埋点代码中发送日志的端口
- 后端项目可忽略此变量

---

## 路径处理最佳实践

### 读取文件前先检查目录

```bash
# 确认当前目录
pwd

# 检查目录结构
ls -la .worker/debug/

# 使用绝对路径读取
cat "$(pwd)/.worker/debug/logs/${DEBUG_SESSION_ID}.log"
```

### 常见问题

**问题1**：日志文件找不到
```bash
# 错误：可能读取到错误目录
cat .worker/debug/logs/xxx.log

# 正确：使用绝对路径
cat "$(pwd)/.worker/debug/logs/xxx.log"
```

**问题2**：写入到错误位置
```javascript
// 错误：相对路径可能指向错误目录
fs.writeFileSync('.worker/debug/logs/xxx.log', data);

// 正确：构建绝对路径
const logPath = path.join(process.cwd(), '.worker/debug/logs', `${sessionId}.log`);
fs.writeFileSync(logPath, data);
```