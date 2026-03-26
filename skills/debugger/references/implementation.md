# 埋点实现参考

根据项目类型选择对应的埋点代码。

> **注意**：关于埋点的强制规则（独立折叠块、禁止外部依赖等），详见 `SKILL.md` 的"插入埋点代码块"章节。本文件只提供代码示例。

---

## ❌ 错误示范（绝对禁止）

**以下代码模式严禁使用**：

### 错误 1：创建辅助函数

```javascript
// ❌ 禁止：文件顶部创建辅助函数
const DEBUG_SESSION_ID = '...';
const DEBUG_PORT = 9330;

// ❌ 禁止：创建 sendDebugLog 函数供多处调用
function sendDebugLog(label: string, data: any) {
  fetch(`http://localhost:${DEBUG_PORT}/debug/log?session_id=${DEBUG_SESSION_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'useFileTree.ts:0',
      message: `[DEBUG] ${label}`,
      data,
      timestamp: Date.now()
    })
  }).catch(() => {});
}

// ❌ 禁止：多处调用同一个函数
async function fetchTree() {
  sendDebugLog('fetchTree entry', { expandedFolders: ... })  // 违规！
  // ...
}
```

### 错误 2：共享变量

```javascript
// ❌ 禁止：在文件顶部放置共享常量
const DEBUG_SESSION_ID = 'xxx';
const DEBUG_PORT = 9330;

// ❌ 禁止：在函数内部引用外部变量
async function fetchTree() {
  // #region DEBUG
  fetch(`http://localhost:${DEBUG_PORT}/debug/log?session_id=${DEBUG_SESSION_ID}`, ...)  // 违规！依赖外部变量
  // #endregion DEBUG
}
```

**为什么禁止？**
1. 清理时难以完全移除（辅助函数可能被遗漏）
2. 污染代码库（增加了不必要的函数定义）
3. 可能产生副作用（函数执行时机不确定）
4. 破坏代码的纯粹性（调试代码应该完全隔离）

---

## ✅ 正确做法

**每个埋点都必须是完全独立的代码块**：

---

## Session ID 和 Port

**Skill 代码中读取环境变量**：

```javascript
const sessionId = process.env.DEBUG_SESSION_ID;
const port = process.env.DEBUG_PORT;
```

日志文件路径：`.worker/debug/logs/{sessionId}.log`

---

## 项目类型判断

读取 `${pwd}/.worker/debug/config.yaml`：

```yaml
port: 9229
frontend:
  - "**/frontend/**"
backend:
  - "**/backend/**"
```

检查当前文件路径匹配 `frontend` 还是 `backend` 模式。

---

## 前端项目埋点

使用**折叠块注释**包裹埋点代码，方便后续一键清除。

### JavaScript / TypeScript

```javascript
// #region DEBUG [sessionId: {{sessionId}}, port: {{port}}]
fetch('http://localhost:{{port}}/debug/log?session_id={{sessionId}}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location: '文件名.js:10',
    message: '[函数入口:进入handleClick]',
    data: { /* 变量快照 */ }
  })
}).catch(() => {});
// #endregion DEBUG
```

### Vue

```javascript
// #region DEBUG [sessionId: {{sessionId}}, port: {{port}}]
fetch('http://localhost:{{port}}/debug/log?session_id={{sessionId}}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location: '组件名.vue:25',
    message: '[方法调用:执行methodName]',
    data: { data: this.someData }
  })
}).catch(() => {});
// #endregion DEBUG
```

### React

```javascript
// #region DEBUG [sessionId: {{sessionId}}, port: {{port}}]
fetch('http://localhost:{{port}}/debug/log?session_id={{sessionId}}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location: '组件名.jsx:18',
    message: '[渲染:组件渲染]',
    data: { state, props }
  })
}).catch(() => {});
// #endregion DEBUG
```

---

## 后端项目埋点

### Python

```python
# #region DEBUG [sessionId: {{sessionId}}]
import json
import time
with open(f'.worker/debug/logs/{{sessionId}}.log', 'a', encoding='utf-8') as f:
    f.write(json.dumps({
        'location': f'{__file__}:10',
        'message': '[函数入口:进入函数]',
        'data': { /* 变量快照 */ },
        'timestamp': time.time()
    }, ensure_ascii=False) + '\n')
# #endregion DEBUG
```

### Node.js

**CommonJS (require):**
```javascript
// #region DEBUG [sessionId: {{sessionId}}]
const fs = require('fs');
const path = require('path');
fs.appendFileSync(
  path.join('.worker/debug/logs', '{{sessionId}}.log'),
  JSON.stringify({
    location: `${__filename}:10`,
    message: '[函数入口:进入函数]',
    data: { /* 变量快照 */ },
    timestamp: Date.now()
  }) + '\n'
);
// #endregion DEBUG
```

**ES Modules / TypeScript (动态 import):**
```typescript
// #region DEBUG [sessionId: {{sessionId}}]
import('fs').then((fs) => {
  const log = {
    location: `${__filename}:10`,
    message: '[函数入口:进入函数]',
    data: { /* 变量快照 */ },
    timestamp: Date.now()
  };
  fs.appendFileSync('.worker/debug/logs/{{sessionId}}.log', JSON.stringify(log) + '\n');
}).catch(() => {});
// #endregion DEBUG
```

### Java

```java
// #region DEBUG [sessionId: {{sessionId}}]
try {
    java.nio.file.Files.writeString(
        java.nio.file.Paths.get(".worker/debug/logs/{{sessionId}}.log"),
        String.format(
            "{\"location\":\"%s:%d\",\"message\":\"%s\",\"data\":{},\"timestamp\":%d}%n",
            "文件名.java",
            10,
            "[函数入口:进入函数]",
            System.currentTimeMillis()
        ),
        java.nio.file.StandardOpenOption.CREATE,
        java.nio.file.StandardOpenOption.APPEND
    );
} catch (Exception e) {}
// #endregion DEBUG
```

### Go

```go
// #region DEBUG [sessionId: {{sessionId}}]
import (
    "encoding/json"
    "os"
    "time"
)
f, _ := os.OpenFile(".worker/debug/logs/{{sessionId}}.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
json.NewEncoder(f).Encode(map[string]interface{}{
    "location": "文件名.go:10",
    "message": "[函数入口:进入函数]",
    "data": map[string]interface{}{ /* 变量快照 */ },
    "timestamp": time.Now().UnixMilli(),
})
f.Close()
// #endregion DEBUG
```

---

## 清除埋点代码

删除所有 `#region DEBUG` 到 `#endregion DEBUG` 之间的代码块：

```bash
# 删除多行（包括 #region 和 #endregion 行）
sed -i '/#region DEBUG/,/#endregion DEBUG/d' 文件名

# VS Code: 正则替换
# 查找: //#region DEBUG.*?// #endregion DEBUG[\s\S]*?
# 替换为空
```

---

## 日志格式

统一 JSON 格式：

```json
{
  "location": "相对路径/文件名:行号",
  "message": "[范围:描述]",
  "data": { "关键变量快照": "值" },
  "timestamp": 1712345678901
}
```

**字段说明：**
- `location`: 代码位置，格式为 `文件名:行号`
- `message`: 描述信息，格式为 `[范围:描述]`，例如 `[函数入口:进入handleClick]`、`[变量检查:user对象]`、`[分支判断:if条件为真]`
- `data`: 关键变量数据快照，任意键值对
- `timestamp`: 时间戳（可选，毫秒）

---

## Skill 生成埋点代码流程

1. **读取 config.yaml** 获取 `port`
2. **生成 sessionId**
3. **在关键位置插入折叠块**（每个埋点位置一个块）
4. **替换占位符** `{{sessionId}}` 和 `{{port}}`
5. **填入实际的行号、函数名、变量**

---

## 埋点位置建议

```javascript
function yourFunction(arg) {
  // #region DEBUG [sessionId: xxx, port: yyy]
  fetch('http://localhost:yyy/debug/log?session_id=xxx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: '文件名.js:2',
      message: '[函数入口:进入yourFunction]',
      data: { arg }
    })
  }).catch(() => {});
  // #endregion DEBUG

  if (condition) {
    // #region DEBUG [sessionId: xxx, port: yyy]
    fetch('http://localhost:yyy/debug/log?session_id=xxx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: '文件名.js:5',
        message: '[分支判断:if条件为真]',
        data: { condition }
      })
    }).catch(() => {});
    // #endregion DEBUG
  }

  const result = calc();
  // #region DEBUG [sessionId: xxx, port: yyy]
  fetch('http://localhost:yyy/debug/log?session_id=xxx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: '文件名.js:10',
      message: '[变量赋值:calc结果]',
      data: { result }
    })
  }).catch(() => {});
  // #endregion DEBUG

  return result;
}
```

**关键要点**：
- 每个 `#region DEBUG` 都包含完整的 fetch 调用
- 不依赖文件顶部的任何变量或函数
- 即使同一个文件有 10 个埋点，也要写 10 次完整的代码
- 清理时可以用 sed 一键删除 `#region DEBUG` 到 `#endregion DEBUG` 之间的所有内容

---

## 多埋点示例（同一文件）

即使需要在同一函数的多个位置埋点，每个埋点也必须完全独立：

```typescript
// ✅ 正确：每个埋点独立
async function fetchTree() {
  // #region DEBUG [sessionId: abc-123, port: 9330]
  fetch('http://localhost:9330/debug/log?session_id=abc-123', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'useFileTree.ts:10',
      message: '[函数入口:进入fetchTree]',
      data: { state: 'starting' }
    })
  }).catch(() => {});
  // #endregion DEBUG

  const data = await api.getTree();

  // #region DEBUG [sessionId: abc-123, port: 9330]
  fetch('http://localhost:9330/debug/log?session_id=abc-123', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'useFileTree.ts:15',
      message: '[数据获取:API返回结果]',
      data: { dataLength: data?.length }
    })
  }).catch(() => {});
  // #endregion DEBUG

  return processData(data);
}
```

**注意**：虽然代码重复了 fetch 调用，但这是设计意图——便于清理和隔离。