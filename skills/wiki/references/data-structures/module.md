# 模块数据结构

## modules.json 格式

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
  "module_tree": {
    "root_modules": [],
    "status": "pending"
  },
  "status": "pending"
}
```

---

## Phase 1: 模块对象

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string (UUID) | ✓ | 模块唯一标识符 |
| `name` | string | ✓ | 模块名称（中文） |
| `paths` | string[] | ✓ | 模块涉及的文件路径数组 |
| `description` | string | ✓ | 模块功能描述 |
| `module_type` | string | | 模块类型：feature / shared / core |
| `depend` | string[] | | 依赖的模块 ID 数组 |

### module_type 定义

| 类型 | 说明 | 示例 |
|------|------|------|
| `feature` | 业务功能模块 | 用户管理、订单系统 |
| `shared` | 共享基础设施 | 工具函数、通用组件 |
| `core` | 核心引擎/框架 | 路由核心、状态管理 |

---

## Phase 2: 树形结构 (module_tree)

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
          "src/mcp/android.ts"
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
            "paths": ["src/mcp/android.ts"],
            "children": [
              {
                "id": "tree-4",
                "name": "安卓 MCP",
                "paths": ["src/mcp/android.ts"],
                "leaf_module_ids": ["uuid-2"]
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

### 树节点字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string (UUID) | ✓ | 树节点唯一标识符 |
| `name` | string | ✓ | 模块名称 |
| `description` | string | | 模块描述 |
| `paths` | string[] | ✓ | 该节点的文件路径（Wiki 生成时读取） |
| `leaf_module_ids` | string[] | | 叶子节点：引用 Phase 1 模块 ID |
| `children` | TreeNode[] | | 分支节点：子模块数组（支持多层嵌套） |

### 节点类型

| 类型 | 判断条件 | paths 来源 |
|------|---------|-----------|
| **叶子节点** | `leaf_module_ids` 有值，`children` 为空 | 继承自 Phase 1 模块的 paths |
| **分支节点** | `children` 有值 | 汇总所有 children 的 paths（去重） |

---

## paths 字段用途

`paths` 是 Wiki 文档生成的核心依赖：

```
遍历 module_tree
    ↓
读取每个节点的 paths
    ↓
读取 paths 中所有文件内容
    ↓
基于代码生成该节点的 Wiki 文档
```

### paths 支持的格式

| 格式 | 示例 | 说明 |
|------|------|------|
| 文件路径 | `src/services/userApi.ts` | 单个文件 |
| 目录路径 | `src/pages/user` | 该目录下所有文件 |

---

## 状态流转

| 状态 | 说明 |
|------|------|
| `pending` | 初始状态 |
| `phase1_completed` | Phase 1 模块识别完成 |
| `phase2_completed` | Phase 2 树形结构构建完成 |
| `completed` | 全部完成 |