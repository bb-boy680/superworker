# 埋点实现参考

根据项目类型选择对应的埋点代码。

---

## Session ID 生成

**Skill 代码中生成 sessionId**（每个会话独立）：

```javascript
const sessionId = process.env.WT_SESSION ||
                  process.env.CLAUDE_CODE_SESSION_ID ||
                  `debug-${Date.now()}`;
```

日志文件路径：`.worker/debug/logs/{sessionId}.log`

---

## 项目类型判断

读取 `.worker/debug/config.yaml`：

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
fetch('http://localhost:{{port}}/debug/log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: '{{sessionId}}',
    file: '文件名.js',
    line: 10,
    func: '函数名',
    vars: { /* 变量快照 */ },
    timestamp: Date.now()
  })
}).catch(() => {});
// #endregion DEBUG
```

### Vue

```javascript
// #region DEBUG [sessionId: {{sessionId}}, port: {{port}}]
fetch('http://localhost:{{port}}/debug/log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: '{{sessionId}}',
    file: '组件名.vue',
    line: 25,
    func: 'methodName',
    vars: { data: this.someData },
    timestamp: Date.now()
  })
}).catch(() => {});
// #endregion DEBUG
```

### React

```javascript
// #region DEBUG [sessionId: {{sessionId}}, port: {{port}}]
fetch('http://localhost:{{port}}/debug/log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: '{{sessionId}}',
    file: '组件名.jsx',
    line: 18,
    func: '函数名',
    vars: { state, props },
    timestamp: Date.now()
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
        'sessionId': '{{sessionId}}',
        'file': __file__,
        'line': 10,
        'func': '函数名',
        'vars': { /* 变量快照 */ },
        'timestamp': time.time()
    }, ensure_ascii=False) + '\n')
# #endregion DEBUG
```

### Node.js

```javascript
// #region DEBUG [sessionId: {{sessionId}}]
const fs = require('fs');
const path = require('path');
fs.appendFileSync(
  path.join('.worker/debug/logs', '{{sessionId}}.log'),
  JSON.stringify({
    sessionId: '{{sessionId}}',
    file: __filename,
    line: 10,
    func: '函数名',
    vars: { /* 变量快照 */ },
    timestamp: Date.now()
  }) + '\n'
);
// #endregion DEBUG
```

### Java

```java
// #region DEBUG [sessionId: {{sessionId}}]
try {
    java.nio.file.Files.writeString(
        java.nio.file.Paths.get(".worker/debug/logs/{{sessionId}}.log"),
        String.format(
            "{\"sessionId\":\"%s\",\"file\":\"%s\",\"line\":%d,\"func\":\"%s\",\"timestamp\":%d}%n",
            "{{sessionId}}",
            "文件名.java",
            10,
            "函数名",
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
    "sessionId": "{{sessionId}}",
    "file": "文件名.go",
    "line": 10,
    "func": "函数名",
    "vars": map[string]interface{}{ /* 变量快照 */ },
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
  "sessionId": "会话ID",
  "file": "相对路径/文件名",
  "line": 10,
  "func": "函数名",
  "vars": { "关键变量快照": "值" },
  "timestamp": 1712345678901
}
```

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
  fetch(... line: 2 ...)  // 函数入口
  // #endregion DEBUG

  if (condition) {
    // #region DEBUG [sessionId: xxx, port: yyy]
    fetch(... line: 5 ...)  // 分支
    // #endregion DEBUG
  }

  const result = calc();
  // #region DEBUG [sessionId: xxx, port: yyy]
  fetch(... line: 10, vars: { result } ...)  // 变量赋值后
  // #endregion DEBUG

  return result;
}
```

每个埋点位置都是一个独立的折叠块，包含完整的埋点代码，不依赖外部函数。
