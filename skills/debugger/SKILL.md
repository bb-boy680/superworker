---
name: debugger
description: |
  代码调试助手，通过"埋点 → 分析修复 → 清理"定位并修复 bug。

  埋点规则：前端用 HTTP fetch，后端用文件写入，禁用 console.log。

  触发场景：用户提到 bug、error、异常、调试、代码不工作、测试失败等。
---

# Debugger Skill

**流程**：埋点 → 分析 & 修复 → 清理

---

## 核心配置

每次回复末尾，用以下配置询问用户下一步：

```
AskUserQuestion({
  questions: [{
    question: "请选择下一步操作",
    header: "下一步",
    options: [
      { label: "清空日志", description: "清空 *.log 文件内容（不删除文件）" },
      { label: "添加更多埋点", description: "继续添加埋点" },
      { label: "分析日志 & 修复", description: "分析日志并修复代码" },
      { label: "完成修复", description: "清理埋点代码，结束调试" }
    ]
  }]
})
```

### 清空日志

用户选择"清空日志"时执行：

```bash
echo "" > "$(pwd)/.worker/debug/logs/${DEBUG_SESSION_ID}.log"
```

**注意**：只清空文件内容，不删除文件。

---

## 步骤 0：初始化

触发时立即执行：

```bash
# 设置环境变量
export DEBUG_SESSION_ID=$(grep DEBUG_SESSION_ID $(pwd)/.worker/.env | cut -d'=' -f2)
export DEBUG_PORT=$(grep port $(pwd)/.worker/debug/config.yaml | cut -d' ' -f2)

# 验证
echo "DEBUG_SESSION_ID=$DEBUG_SESSION_ID"
echo "DEBUG_PORT=$DEBUG_PORT"
```

**日志路径**：`$(pwd)/.worker/debug/logs/${DEBUG_SESSION_ID}.log`

### 搜索文件流程

**每次搜索前**，先读取 exclude 配置：

```bash
cat $(pwd)/.worker/debug/config.yaml
```

根据 `exclude` 字段过滤搜索结果。

**示例**：假设 config.yaml 中 `exclude: [node_modules, dist, .git]`

**Glob 调用**：
```
Glob({ pattern: "**/*.{js,ts}" })
→ 结果过滤：跳过路径包含 node_modules/dist/.git 的文件
```

**Grep 调用**：
```
Grep({ pattern: "handleError", glob: "**/*.{js,ts}" })
→ 结果过滤：跳过路径包含 node_modules/dist/.git 的文件
```

**流程**：读配置 → 搜索 → 过滤结果

---

## 步骤 1：添加埋点

### 每个文件埋点前的流程

```
针对文件 X → 读取 config.yaml 判断环境 → 选择埋点方式 → 添加埋点
```

**判断步骤**：

1. **读取配置**：`cat .worker/debug/config.yaml`
2. **匹配环境**：根据 `frontend` / `backend` 的 glob 模式，判断当前文件属于哪个环境
3. **选择埋点方式**：
   - 匹配 frontend → HTTP fetch
   - 匹配 backend → 文件写入
   - 都不匹配 → 根据文件特征判断（如 `*.server.ts` → 后端）

**下一个文件埋点时，重复上述流程**。

### 埋点代码模板

**前端**（HTTP）：
```javascript
// #region DEBUG [sessionId: {{DEBUG_SESSION_ID}}, port: {{DEBUG_PORT}}]
fetch('http://localhost:${DEBUG_PORT}/debug/log?session_id=${DEBUG_SESSION_ID}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location: '文件名:行号',
    message: '[位置:描述]',
    data: { /* 变量快照 */ }
  })
}).catch(() => {});
// #endregion DEBUG
```

**后端**（文件写入，使用绝对路径）：
```javascript
// #region DEBUG [sessionId: {{DEBUG_SESSION_ID}}, port: {{DEBUG_PORT}}]
import('fs').then(fs => fs.appendFileSync('{{$(pwd)}}/.worker/debug/logs/{{DEBUG_SESSION_ID}}.log',
  JSON.stringify({ location: '文件名:行号', message: '[位置:描述]', data: {}, timestamp: Date.now() }) + '\n'
)).catch(() => {});
// #endregion DEBUG
```

> 更多语言模板见：`references/implementation.md`

**要点**：
- 每个埋点独立，不创建共享函数，便于清理
- HTTP 日志服务持续运行，不需要检查或启动服务
- 不要改用 console.log 或其他方式

---

## 步骤 2：分析 & 修复

**前提**：用户已复现 bug，日志已生成。

```bash
cat "$(pwd)/.worker/debug/logs/${DEBUG_SESSION_ID}.log"
```

分析执行路径和变量值，定位问题后修复代码。

**搜索代码时**：应用 config.yaml 的 exclude 配置过滤结果。

**如果需要添加更多埋点**：使用 HTTP fetch（前端）或文件写入（后端），不要用 console.log。

---

## 步骤 3：清理

用户确认修复成功后执行：

```bash
# 只清理当前会话的埋点（根据 sessionId 匹配）
sed -i '/#region DEBUG \[sessionId: ${DEBUG_SESSION_ID}/,/#endregion DEBUG/d' 文件名
```

---

## 完整示例

```
用户：我的代码有 bug
AI：  [执行初始化，设置环境变量]
      [用 AskUserQuestion 询问下一步]

用户：添加更多埋点
AI：  [添加埋点 - 用 HTTP fetch 或文件写入，不用 console.log]
      [用 AskUserQuestion 询问下一步]

用户：分析日志 & 修复
AI：  [分析日志，修复代码]
      [用 AskUserQuestion 询问下一步]

用户：完成修复
AI：  [清理埋点]
      [调试结束]
```

**埋点方式提醒**：
- 前端：`fetch('http://localhost:${DEBUG_PORT}/debug/log?session_id=${DEBUG_SESSION_ID}', {...})`
- 后端：`await import('fs').then(fs => fs.appendFileSync(...))`

---

> 埋点的详细示例和多语言模板见：`references/implementation.md`