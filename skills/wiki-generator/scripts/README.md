# Wiki Generator 脚本

本目录包含 wiki-generator skill 的辅助脚本。

---

## collect-files.js

从项目代码库收集源文件路径，基于配置文件的 include/exclude 规则。

**特点**：仅使用 Node.js 内置模块（`fs`, `path`），无需第三方依赖。

### 功能

- 读取固定的 `.worker/wiki/config.yaml` 配置文件
- 根据 `include`/`exclude` 模式匹配文件
- 提取文件元数据（路径、深度、扩展名、是否为入口文件）
- 生成目录树结构
- 保存结果到 `.worker/wiki/temp/files-index.json`

### 使用方式

#### 方式 1：直接运行

```bash
cd scripts
node collect-files.js
```

#### 方式 2：通过 Claude 调用

Claude 可以在执行 wiki-generator 时自动检测并运行此脚本：

```javascript
// 检查脚本是否存在
if (fs.existsSync('skills/wiki-generator/scripts/collect-files.js')) {
  // 运行脚本收集文件
  exec('node skills/wiki-generator/scripts/collect-files.js');
  // 读取生成的 files-index.json
  const fileIndex = JSON.parse(
    fs.readFileSync('.worker/wiki/temp/files-index.json')
  );
}
```

### 配置文件格式

**注意**：配置文件路径固定为 `.worker/wiki/config.yaml`

```yaml
include:
  - "src/**/*.{ts,tsx,js,jsx}"
  - "scripts/**/*.ts"
  - "config/**/*.{ts,js}"
  - "lib/**/*.{ts,js}"

exclude:
  - ".git"
  - "node_modules"
  - "dist"
  - "build"
  - "coverage"
  - ".next"
  - ".nuxt"
```

**必须包含**：`include` 数组（不能为空）
**可选**：`exclude` 数组（默认为空）

### 输出格式

`.worker/wiki/temp/files-index.json`:

```json
{
  "files": [
    {
      "path": "D:/project/src/components/Button.tsx",
      "relative": "src/components/Button.tsx",
      "dir": "src/components",
      "name": "Button",
      "ext": ".tsx",
      "depth": 3,
      "isEntry": true
    }
  ],
  "tree": {
    "src": {
      "components": {
        "Button": {
          "__files": [{ "name": "Button.tsx", "isEntry": true, "ext": ".tsx" }]
        }
      }
    }
  },
  "stats": {
    "totalFiles": 156,
    "byExtension": { ".ts": 89, ".tsx": 45, ".js": 12, ".jsx": 10 },
    "byDepth": { "2": 23, "3": 89, "4": 44 }
  },
  "collectedAt": "2024-01-15T10:30:00Z"
}
```

### 入口文件识别

脚本自动识别以下入口文件：

- `index.ts`, `index.tsx`, `index.js`, `index.jsx`
- `main.ts`, `main.tsx`, `main.js`, `main.jsx`
- `app.ts`, `app.tsx`, `app.js`, `app.jsx`
- 与目录同名的文件（如 `Button/Button.tsx`）

### 支持的 Glob 模式

- `*` - 匹配任意字符（不包括 `/`）
- `**` - 匹配任意层级目录
- `?` - 匹配单个字符
- `{ts,tsx}` - 多选（通过多个模式实现）

### 错误处理

如果配置文件不存在或格式错误，脚本会抛出错误并退出：

```
❌ 收集失败: 配置文件不存在: .worker/wiki/config.yaml
请创建 .worker/wiki/config.yaml 并配置 include/exclude 规则
```

```
❌ 收集失败: 配置文件中必须包含非空的 include 数组
```

---

## 导出函数

脚本也支持作为模块导入使用：

```javascript
const {
  loadConfig,
  collectFiles,
  isEntryFile,
  buildDirectoryTree,
  CONFIG_PATH,
  parseYaml
} = require('./collect-files');

// 读取配置
const config = loadConfig('/path/to/project');

// 收集文件
const fileIndex = collectFiles('/path/to/project', config);

// 检查是否为入口文件
const isEntry = isEntryFile('src/components/Button/index.tsx');
```
