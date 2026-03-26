# 模块数据结构

## modules.json 格式（两步扫描）

```json
{
  // Phase 1: 初步模块解析 - 存储所有识别出的细粒度模块
  "modules": [
    {
      "id": "uuid-string",
      "name": "用户管理",
      "paths": ["src/pages/user", "src/components/user", "src/services/userApi.ts"],
      "description": "用户CRUD功能，包含用户列表、详情、编辑",
      "tech_stack": ["React", "TypeScript"],
      "depend": ["uuid-1", "uuid-2"],
      "module_type": "feature"
    }
  ],

  // Phase 2: 智能模块合并 - 管理合并过程中的状态
  "merge_modules": {
    // 待处理的合并候选模块
    "pending_modules": [
      {
        "id": "uuid-string",
        "name": "AI核心引擎",
        "description": "包含AI Agent执行引擎、AI模型交互层等核心模块",
        "depend_paths": ["packages/core/src/ai", "packages/shared/src/llm"]
      }
    ],
    // 正在处理中的合并模块
    "progress_modules": [],
    // 已完成合并的模块
    "completed_modules": []
  },

  // 统计信息
  "total_modules": 12,
  "pending_modules": 1,
  "progress_modules": 0,
  "completed_modules": 0,

  // 当前执行状态：pending / phase1_completed / phase2_progress / completed
  "status": "pending"
}
```

---

## 模块对象字段说明（Phase 1）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string (UUID) | 模块唯一标识符 |
| `name` | string | 模块名称（功能名称） |
| `paths` | string[] | 模块涉及的文件/目录路径数组（支持跨目录聚合） |
| `description` | string | 模块功能描述 |
| `tech_stack` | string[] | 技术栈数组 |
| `depend` | string[] | 依赖的模块 ID 数组（UUID） |
| `module_type` | string | 模块类型：feature（功能）/ shared（共享）/ core（核心） |

---

## 合并模块对象字段说明（Phase 2）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string (UUID) | 合并后模块的唯一标识符 |
| `name` | string | 合并后的模块名称（功能域描述） |
| `description` | string | 合并后模块的功能描述 |
| `depend_paths` | string[] | 该合并模块包含的原模块路径 |
| `source_module_ids` | string[] | 合并来源的 Phase 1 模块 ID 列表 |

---

## 模块类型定义

| 类型 | 说明 | 示例 |
|------|------|------|
| `feature` | 业务功能模块 | 用户管理、订单系统、AI引擎 |
| `shared` | 共享基础设施 | 工具函数、通用组件、类型定义 |
| `core` | 核心引擎/框架 | 路由核心、状态管理核心 |

---

## 全局状态字段说明

| 字段 | 说明 |
|------|------|
| `status` | 扫描状态：`pending` / `phase1_completed` / `phase2_progress` / `completed` |
| `total_modules` | Phase 1 识别出的模块总数 |
| `pending_modules` | Phase 2 待处理的合并模块数 |
| `progress_modules` | Phase 2 进行中的合并模块数 |
| `completed_modules` | Phase 2 已完成的合并模块数 |

---

## 语言支持

根据 `config.yaml` 中的 `generation.language` 设置：

| 值 | 效果 |
|----|------|
| `zh` | 生成中文模块名称和描述 |
| `en` | 生成英文模块名称和描述 |
| `both` | 同时生成中英文（字段带 _zh/_en 后缀） |

---

## 路径数组说明

`paths` 字段支持一个功能模块跨多个目录：

```json
{
  "name": "AI引擎",
  "paths": [
    "packages/core/src/ai",
    "packages/shared/src/llm",
    "packages/web-integration/src/ai-bridge"
  ]
}
```

### 路径类型支持

| 路径形式 | 示例 | 说明 |
|---------|------|------|
| 目录路径 | `src/pages/user` | 包含该目录下所有文件 |
| 文件路径 | `src/services/userApi.ts` | 单个文件 |
| Glob 模式 | `src/components/user/*` | 匹配的文件集合 |
