---
name: wiki-generator
description: 从项目工程代码库生成专业、企业级的 wiki 文档。当用户需要创建文档、生成项目 wiki、记录代码库、创建新人入职文档或从代码构建知识库时使用。对于需要标准化文档的工程团队至关重要。
metadata:
  compatibility:
    tools:
      - Read
      - Glob
      - Grep
      - Edit
      - Write
    requires:
      - git 仓库或项目目录
---

# Wiki 生成器

从任何项目代码库生成全面、企业级的 wiki 文档，支持嵌套目录结构和按功能模块聚合。

## 功能特性

- **多层级目录**: 支持 wiki/zh/大模块/子模块/文档.md 的嵌套结构
- **智能聚合**: 按目录、路由、依赖关系自动聚合相关文件为模块
- **进度追踪**: 实时显示处理进度，确保不遗漏任何文件
- **多语言支持**: 支持生成多语言版本的文档
- **企业标准**: 符合企业级文档规范

## 工作流程

### Phase 1: Discovery（发现阶段）

扫描项目，识别类型，收集所有源文件。

```
1. 检测项目类型
   - 读取 package.json / pom.xml / go.mod / requirements.txt 等特征文件
   - 根据特征确定项目类型（React/Vue/Node/Python/Java/Go 等）

2. 匹配文件模式
   - 根据项目类型，执行对应的 Glob 模式
   - 收集所有源文件路径
   - 记录每个文件：路径、大小、修改时间

3. 生成分组候选
   - 按目录结构分组
   - 按路由配置分组（前端项目）
   - 按依赖关系分组

4. 输出清单
   - 写入 .wiki-generator/manifest.json
   - 包含：项目信息、文件清单、模块候选、进度状态
```

### Phase 2: Analysis（分析阶段）

读取关键文件，提取文档所需信息，确定最终模块划分。

```
1. 读取并分析文件
   For each module in manifest.modules:
     a. 读取入口文件：提取功能描述、导出内容
     b. 读取组件文件：提取 Props、事件、用法
     c. 读取 API 文件：提取接口定义、参数、返回值
     d. 读取类型文件：提取数据模型、枚举

2. 模块聚合（关键步骤）
   策略 A - 目录聚合:
     - src/cli/ 下的所有文件 → CLI系统模块
     - src/mcp/ 下的所有文件 → MCP系统模块

   策略 B - 路由聚合:
     - 读取路由配置
     - 每个路由 + 其组件 → 一个业务模块

   策略 C - 依赖聚合:
     - 分析 import 关系
     - 经常一起引用的文件 → 同一模块

3. 建立依赖图
   - 记录模块间依赖
   - 记录文件归属关系

4. 实时更新清单
   - 每完成一个模块，更新 manifest.json
   - 输出进度："已完成 3/12 模块分析"
```

### Phase 3: Generation（生成阶段）

生成嵌套目录结构和模块文档。

```
1. 创建目录结构
   wiki/
   ├── config.yaml              # 配置文件
   ├── meta/                    # 元数据目录
   │   ├── manifest.json        # 文件清单
   │   ├── progress.json        # 进度追踪
   │   └── search-index.json    # 搜索索引
   └── {lang}/                  # 语言目录（如 zh/）
       ├── README.md            # 项目首页
       ├── 文档地图.md          # 全局导航
       ├── 快速开始.md          # 快速入门
       ├── 架构设计.md          # 架构概览
       ├── 开发指南.md          # 开发规范
       │
       ├── {大功能模块A}/       # 业务模块目录
       │   ├── README.md        # 模块概述
       │   ├── {子模块1}.md     # 具体文档
       │   ├── {子模块2}.md
       │   └── assets/          # 模块专属资源
       │       └── diagram.png
       │
       ├── {大功能模块B}/
       │   └── ...
       │
       └── shared/              # 跨模块内容
           ├── 术语表.md
           ├── 常见问题.md
           └── 更新日志.md

2. 生成模块文档
   - 每个大模块一个目录
   - 模块内按类型组织（页面/组件/API/类型）
   - 支持多级嵌套（最多 3 层）

3. 生成交叉引用
   - 模块间链接
   - 文件依赖图

4. 实时输出进度
   - "正在生成：用户管理模块文档 (4/12)"
   - 更新 progress.json
```

### Phase 4: Validation（验证阶段）

确保文档完整性，无遗漏。

```
1. 覆盖率检查
   - 对比原始文件清单和生成的文档
   - 计算覆盖率：98% (153/156 文件)

2. 完整性检查
   - 检查空章节
   - 检查缺失的 API/组件文档

3. 输出验证报告
   - 列出警告和问题
   - 提供修复建议
```

## 执行指令

当用户要求生成 wiki 时：

### Step 1: 读取配置

检查 `.worker/wiki/config.yaml` 或 `wiki-config.yaml`：

```yaml
include:
  - "**/src/**"
  - "**/scripts/**"

exclude:
  - ".git"
  - "node_modules"
  - "dist"

structure:
  maxDepth: 3
  moduleIndicators:
    - "src/**/"
    - "app/**/"
```

### Step 2: 执行 Discovery

```bash
# 1. 检测项目类型
Read("package.json") → React 项目

# 2. 获取源文件
Glob("**/src/**/*.{ts,tsx}") → [文件列表]
Glob("**/src/**/*.{js,jsx}") → [文件列表]

# 3. 识别路由
Grep("/pages/", "src/**/*") → 页面文件
Read("src/router.tsx") → 路由配置

# 4. 生成清单
Write(".wiki-generator/manifest.json", 清单内容)
```

### Step 3: 执行 Analysis

```
For each module in manifest.modules:
  1. Read(module.entry)
  2. Extract: 功能描述、导出、Props、API
  3. Update manifest.modules[module].status = "analyzed"
  4. Save manifest.json
  5. Output: "分析完成: {module.name} ({index}/{total})"
```

### Step 4: 执行 Generation

```
# 1. 创建目录
Bash: mkdir -p wiki/zh/{module.name}

# 2. 生成模块文档
For each module:
  content = ApplyTemplate(module.analysis)
  Write("wiki/zh/{module.name}/README.md", content)

  For each file in module.files:
    doc = GenerateDoc(file)
    Write("wiki/zh/{module.name}/{file.name}.md", doc)

# 3. 生成索引文档
Write("wiki/zh/README.md", 项目概览)
Write("wiki/zh/文档地图.md", 目录索引)

# 4. 更新进度
UpdateProgress("generation", completed, total)
```

### Step 5: 执行 Validation

```
# 1. 对比清单
originalFiles = manifest.fileInventory.total
documentedFiles = CountGeneratedDocs()
coverage = documentedFiles / originalFiles

# 2. 检查遗漏
missing = FindMissingFiles()

# 3. 输出报告
Write("wiki/zh/验证报告.md", 报告内容)
Output: "文档覆盖率: {coverage}%"
```

## 防偷懒机制

### 1. 清单强制执行

```
生成文档前：
  - 必须读取 manifest.json
  - 必须知道 totalModules

生成文档时：
  - 每完成一个，更新 status = "documented"
  - 不能跳过任何一个

生成文档后：
  - 对比清单，验证 complete 数量 == totalModules
  - 检查 pending 列表是否为空
```

### 2. 显式检查点

每个 Phase 必须：
- 保存 manifest.json
- 输出该 Phase 摘要
- 确认任务完成

### 3. 可恢复执行

```
中断后重新启动：
  1. Read(".wiki-generator/manifest.json")
  2. 找到第一个 status == "pending" 的任务
  3. 从该任务继续
```

## 项目类型检测

| 特征文件 | 检测内容 | 项目类型 |
|---------|---------|---------|
| package.json | dependencies.react | React 前端 |
| package.json | dependencies.vue | Vue 前端 |
| package.json | dependencies.next | Next.js |
| package.json | dependencies.express/fastify | Node 后端 |
| pom.xml | spring-boot | Spring Boot |
| requirements.txt | django | Django |
| requirements.txt | flask/fastapi | Python API |
| go.mod | - | Go 项目 |
| Cargo.toml | - | Rust 项目 |

## 文档模板

### 模块 README 模板

```markdown
# {模块名称}

## 概述
{功能描述}

## 包含文件
- {文件1} - {用途}
- {文件2} - {用途}

## API 列表
| 接口 | 方法 | 路径 | 描述 |
|-----|------|------|------|
| {name} | {method} | {path} | {desc} |

## 组件列表
| 组件 | Props | 描述 |
|-----|-------|------|
| {name} | {props} | {desc} |

## 依赖关系
- 内部: {依赖模块}
- 外部: {第三方库}

## 使用示例
\`\`\`typescript
{代码示例}
\`\`\`
```

## 输出示例

### 前端项目输出

```
wiki/
├── config.yaml
├── meta/
│   ├── manifest.json
│   └── progress.json
└── zh/
    ├── README.md
    ├── 文档地图.md
    ├── 全局组件/
    │   ├── README.md
    │   ├── 按钮.md
    │   ├── 模态框.md
    │   └── 表格.md
    ├── 用户管理/
    │   ├── README.md
    │   ├── 用户列表.md
    │   ├── 用户详情.md
    │   ├── 用户表单.md
    │   ├── API接口.md
    │   └── 状态管理.md
    └── 订单管理/
        ├── README.md
        ├── 订单列表.md
        └── ...
```

### 后端项目输出

```
wiki/
├── meta/
└── zh/
    ├── README.md
    ├── 用户模块/
    │   ├── README.md
    │   ├── 控制器.md
    │   ├── 服务层.md
    │   ├── 数据模型.md
    │   └── 路由定义.md
    └── 订单模块/
        └── ...
```

## 参考文档

- `references/file-discovery.md` - 文件发现策略
- `references/execution-flow.md` - 执行流程详解
- `references/directory-strategy.md` - 目录生成策略
- `assets/manifest-example.json` - 清单文件示例
