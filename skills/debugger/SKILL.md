---
name: debugger
description: |
  代码调试助手，通过"埋点-分析-修复-清理"三步法定位并修复 bug。

  当用户遇到以下场景时触发：
  - 代码出现 bug 或异常行为
  - 程序逻辑不符合预期
  - 需要追踪代码执行流程
  - 调试测试失败

  只要涉及调试和故障排查，都应该使用此 skill。
hooks:
  - type: start
    command: node hooks/start-server.js
    description: 启动日志收集服务，接收前端埋点日志
---

# Debugger Skill

三步调试法：**埋点 → 分析 → 清理**

---

## Hooks（自动执行）

Skill 激活时自动执行：

| Hook | 触发时机 | 功能 |
|-----|---------|------|
| `hooks/start-server.js` | Skill 激活时 | 启动日志收集服务（前端项目需要） |

服务监听 `.worker/debug/config.yaml` 中配置的 `port`，接收前端埋点日志并写入 `.worker/debug/logs/{sessionId}.log`。

---

## 步骤 1：添加埋点

**目标**：在关键位置插入日志代码。

### 1.1 读取配置

读取 `.worker/debug/config.yaml`：
- `port`：日志服务端口
- `frontend`/`backend`：项目类型匹配规则

**Session ID**：每个会话独立生成

```javascript
const sessionId = process.env.WT_SESSION ||
                  process.env.CLAUDE_CODE_SESSION_ID ||
                  `debug-${Date.now()}`;
```

> Hook 只启动日志服务，不设置环境变量。

### 1.2 判断项目类型

根据文件路径匹配 `frontend` 或 `backend` 模式。

### 1.3 插入埋点代码块

在文件**顶部**插入折叠块（包含所有埋点工具代码）：

**前端**（JS/Vue/React）：
```javascript
// #region DEBUG [sessionId: xxx, port: yyy]
// [DEBUG] 埋点代码 - 折叠块内所有代码都属于埋点
const __debugLog = (line, func, vars) => {
  fetch('http://localhost:{{port}}/debug/log', { ... });
};
// #endregion DEBUG
```

**后端**（Python/Node/Java/Go）：
```python
# #region DEBUG [sessionId: xxx]
# [DEBUG] 埋点代码 - 折叠块内所有代码都属于埋点
import ...

def __debug_log(line, func, vars):
    ...
# #endregion DEBUG
```

然后在关键位置插入调用：
```javascript
__debugLog(10, '函数名', { arg: value });
```

📄 详细实现参考：`references/implementation.md`

---

## 步骤 2：日志分析 & 代码修复

**目标**：运行代码，分析日志，定位并修复问题。

### 2.1 运行代码

执行代码触发问题，埋点自动写入日志文件。

### 2.2 分析日志

读取 `.worker/debug/logs/{sessionId}.log`：

```json
{"file":"user.js","line":42,"func":"getUser","vars":{"id":null},"timestamp":1712345678901}
```

**分析要点**：
- 执行路径是否符合预期
- 变量值是否正确
- 边界条件处理
- 异步操作时序

### 2.3 修复代码

- 最小改动原则
- 先理解原因再修复
- 修复后验证

---

## 步骤 3：移除埋点（需用户确认）

**⚠️ 必须等待用户确认修复成功后再执行！**

### 3.1 清理埋点代码块

删除所有 `#region DEBUG` 到 `#endregion DEBUG` 之间的代码块：

```bash
# 删除多行（包括 #region 和 #endregion 行）
sed -i '/#region DEBUG/,/#endregion DEBUG/d' 文件名
```

### 3.2 清理原则

- 只删除 `[DEBUG]` 埋点
- 保留原有日志代码
- 如有问题，回到步骤 1

---

## 快速检查清单

| 问题类型 | 埋点重点 |
|---------|---------|
| 逻辑错误 | 条件分支走向 |
| 数据异常 | 变量赋值前后 |
| 性能问题 | 耗时操作前后 |
| 异步问题 | 回调/Promise 状态 |
| 空指针 | 对象属性访问前 |
