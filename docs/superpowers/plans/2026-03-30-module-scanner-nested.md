# 模块扫描多层嵌套重构计划

## Context

**问题**：
1. 当前两步扫描策略只能生成扁平结构，不支持多层嵌套聚合
2. 规则驱动的扫描策略（配置文件检测 + 专项策略）过于复杂，无法覆盖所有项目类型

**用户期望**：
```
Agents 模块扫描结果：
  Agents 核心：
    LLM 调用
    prompts 提示词
    MCP 相关：          ← 嵌套子模块组
      安卓 MCP
      ios MCP
      computer MCP
```

---

## 方案：AI 自主分析

### 核心理念

**不再用规则判断项目类型**，让 AI 自己阅读源代码，自主分析并划分模块。

| 对比 | 规则驱动（旧） | AI 自主分析（新） |
|------|---------------|-----------------|
| 项目类型识别 | 检测配置文件特征 | AI 读目录结构和关键文件自行判断 |
| 入口点分析 | 预定义路由/API路径 | AI 自行发现入口文件 |
| 模块划分 | 按规则聚类 | AI 根据代码语义自主划分 |
| 覆盖范围 | 需针对每种框架写策略 | 自动覆盖所有项目类型 |
| 维护成本 | 高（需持续添加规则） | 低（只需维护分析框架） |

### 为什么可行

1. **AI 已具备项目理解能力**
   - 读代码理解功能语义
   - 读路由/API 识别入口点
   - 读 import/require 理解依赖关系
   - 读目录结构判断项目类型

2. **all_source_files.txt 已提供全貌**
   - collect-source.js 已收集所有源文件（每行一个相对路径）
   - all_source_files-by-dir.txt 提供目录统计
   - AI 可以选择关键文件深度阅读
   - AI 可以快速浏览判断项目结构

3. **无需预定义规则**
   - 不需要判断"这是前端还是后端"
   - 不需要针对每种框架写专项策略
   - 前后端分离/不分离、多语言、git-modules 都能自动处理

---

## 简化后的扫描流程

```
Phase 1: AI 自主分析模块
    ↓
Step 1: 读取配置文件
    ↓ 读取 .worker/wiki/config.yaml
    ↓ 获取 frontend/backend 匹配规则
Step 2: 读取文件列表
    ↓ 读取 all_source_files.txt（所有源文件）
    ↓ 读取 all_source_files-by-dir.txt（目录统计）
Step 3: 规则匹配分类
    ↓
    - 匹配 frontend 规则 → 客户端文件集合
    - 匹配 backend 规则 → 服务端文件集合
    - 都不匹配 → 其他/共享文件集合
Step 4: AI 深度分析
    ↓ 阅读关键文件，理解功能语义
    ↓ 在分类基础上进行模块划分
Step 5: 输出 modules.json
    ↓ 每个模块包含 id、name、paths、description

Phase 2: AI 自主构建树形结构
    ↓
Step 1: 分析模块间关系
    ↓ 根据命名、功能、依赖判断聚合关系
Step 2: 构建树形结构
    ↓ 自主决定嵌套层级
Step 3: 输出 module_tree
    ↓ 支持多层嵌套
```

---

## config.yaml 配置规则

配置文件路径：`.worker/wiki/config.yaml`

```yaml
# 前端项目目录匹配模式（支持 glob）
frontend:
  - "**/frontend/**"
  - "**/web/**"
  - "**/ui/**"
  - "**/src/**/*.tsx"
  - "**/src/**/*.vue"

# 后端项目目录匹配模式（支持 glob）
backend:
  - "**/backend/**"
  - "**/api/**"
  - "**/server/**"
  - "**/*.py"
  - "**/*.java"
  - "**/*.go"
```

### 匹配逻辑

| 文件路径 | 匹配 frontend | 匹配 backend | 分类结果 |
|---------|--------------|-------------|---------|
| `src/pages/user/index.tsx` | ✓ | - | 客户端 |
| `server/api/user.ts` | - | ✓ | 服务端 |
| `shared/utils/format.ts` | - | - | 共享 |
| `api/routes/user.go` | - | ✓ | 服务端 |

### 用户可自定义

用户可根据项目特点修改 config.yaml：

```yaml
# 示例：Next.js 全栈项目
frontend:
  - "**/app/**/page.tsx"
  - "**/components/**"

backend:
  - "**/app/api/**"
  - "**/lib/server/**"
```

---

## module-scanner.md 设计

### 分析框架（引导而非强制）

```markdown
## 分析任务

读取配置和源文件，分析项目代码，划分功能模块。

## 输入文件

1. `.worker/wiki/config.yaml` - 配置文件（含 frontend/backend 匹配规则）
2. `.worker/wiki/temp/all_source_files.txt` - 所有源文件列表
3. `.worker/wiki/temp/all_source_files-by-dir.txt` - 目录统计

## 执行步骤

### Step 1: 读取配置

读取 config.yaml，获取：
- `frontend` 匹配规则列表
- `backend` 匹配规则列表

### Step 2: 分类文件

遍历 all_source_files.txt，按规则分类：
- 匹配 frontend 规则 → 客户端文件
- 匹配 backend 规则 → 服务端文件
- 都不匹配 → 共享/其他文件

### Step 3: 深度分析

在分类基础上，阅读关键文件进行模块划分：
- 客户端：按页面/组件聚类
- 服务端：按 API/服务聚类
- 共享：按功能聚类

### Step 4: 输出模块

使用 module-manager.js 录入模块。

## 分析维度（引导）

在划分模块时，可参考以下维度：

1. **入口点**：找到用户进入系统的入口
   - 前端：页面路由、组件入口
   - 后端：API 端点、服务入口
   - CLI：命令入口、main 文件
   - 不分离：模板文件、控制器

2. **业务域**：识别业务概念
   - 用户相关、订单相关、支付相关...
   - 按业务实体聚类

3. **技术层**：识别技术职责
   - 数据层、服务层、展示层
   - 或按技术栈划分（如 MCP 子模块）

4. **依赖链**：分析 import/require 关系
   - 入口 → 依赖的文件 → 归属同一模块
   - 跨模块依赖 → 记录依赖关系

5. **命名/路径相似性**：
   - 相同前缀/路径的文件可能同属一模块
   - 如 `userApi.ts`、`userService.ts` → 用户模块

## 输出要求

### modules.json（Phase 1）

每个模块必须包含：
- `id`：UUID
- `name`：模块名称（中文）
- `paths`：模块涉及的文件路径数组
- `description`：功能描述
- `module_type`：feature/shared/core
- `depend`：依赖的其他模块 ID

### module_tree（Phase 2）

树形结构，支持多层嵌套：
- 每个节点有 `id`、`name`、`description`
- 叶子节点：`leaf_module_ids` 引用 Phase 1 模块
- 分支节点：`children` 包含子节点数组

## 质量检查（自审）

完成划分后，检查：
- 是否遗漏核心功能？
- 是否有单文件模块（过细）？
- 是否有 >20 文件模块（过粗）？
- 是否有未覆盖的源文件？
- 依赖关系是否正确记录？
```

---

## 数据结构

### modules.json（Phase 1）

```json
{
  "modules": [
    {
      "id": "uuid-1",
      "name": "用户管理",
      "paths": [
        "src/pages/user/index.tsx",
        "src/components/user/UserList.tsx",
        "src/services/userApi.ts"
      ],
      "description": "用户列表、详情、编辑功能",
      "module_type": "feature",
      "depend": ["uuid-2"]
    }
  ],
  "status": "phase1_completed"
}
```

### module_tree（Phase 2）

```json
{
  "module_tree": {
    "root_modules": [
      {
        "id": "tree-1",
        "name": "Agents 核心",
        "description": "Agents 核心功能",
        "paths": [
          "src/agents/llm.ts",
          "src/agents/prompts.ts",
          "src/mcp/android.ts",
          "src/mcp/ios.ts",
          "src/mcp/computer.ts"
        ],
        "children": [
          {
            "id": "tree-2",
            "name": "LLM 调用",
            "paths": ["src/agents/llm.ts"],
            "leaf_module_ids": ["uuid-1"],
            "children": []
          },
          {
            "id": "tree-3",
            "name": "MCP 相关",
            "paths": [
              "src/mcp/android.ts",
              "src/mcp/ios.ts",
              "src/mcp/computer.ts"
            ],
            "children": [
              {
                "id": "tree-4",
                "name": "安卓 MCP",
                "paths": ["src/mcp/android.ts"],
                "leaf_module_ids": ["uuid-2"]
              },
              {
                "id": "tree-5",
                "name": "ios MCP",
                "paths": ["src/mcp/ios.ts"],
                "leaf_module_ids": ["uuid-3"]
              }
            ]
          }
        ]
      }
    ],
    "status": "completed"
  }
}
```

---

## paths 字段说明

`paths` 是 Wiki 文档生成的核心依赖：

| 节点类型 | paths 来源 |
|---------|-----------|
| **叶子节点** | 从 `leaf_module_ids` 对应的 Phase 1 模块继承 |
| **分支节点** | 汇总所有 children 的 paths（去重合并） |

**Wiki 生成流程**：

```
遍历 module_tree
    ↓
读取每个节点的 paths
    ↓
读取 paths 中所有文件内容
    ↓
基于代码生成该节点的 Wiki 文档
```

---

## 需修改的文件

| 文件 | 修改内容 |
|------|---------|
| `agents/module-scanner.md` | **重写**：改为分析框架 + 输出要求 + 自审清单 |
| `references/split-module.md` | **删除**：不再需要复杂规则 |
| `references/powers/*.md` | **删除**：不再需要专项策略 |
| `references/data-structures/module.md` | **简化**：只保留数据结构定义 |
| `scripts/module-manager.js` | **简化**：删除 merge_modules，新增树形 API |
| `scripts/progress-manager.js` | **更新**：适配树形结构 |

---

## 实施步骤

1. **删除冗余文档**
   - 删除 `references/split-module.md`
   - 删除 `references/powers/*.md`

2. **简化 module.md**
   - 只保留数据结构定义
   - 删除复杂规则说明

3. **重写 module-scanner.md**
   - 分析框架（分析维度、输出要求）
   - 自审清单
   - 执行流程简化

4. **简化 module-manager.js**
   - 删除 merge_modules 相关代码
   - 新增树形结构 API

5. **更新 progress-manager.js**
   - 适配树形结构的进度管理

---

## 验证方法

1. 在多种类型项目测试：
   - 前后端分离项目（React + Node.js）
   - 前后端不分离项目（Laravel、Django）
   - 多语言项目（Python + Go）
   - git-modules 项目

2. 检查 modules.json：
   - 模块划分是否合理
   - 是否覆盖所有源文件
   - 依赖关系是否正确

3. 检查 module_tree：
   - 嵌套层级是否合理
   - 是否反映功能聚类

4. Wiki 文档生成：
   - 每个节点生成独立文档
   - 子模块章节正确引用