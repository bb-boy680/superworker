# Progress 数据结构

## progress.json 格式

```json
{
  // 文件列表（按状态分组）
  "files": {
    // 待生成的文件
    "pending_files": [
      {
        "id": "uuid-string",
        "path": ".worker/wiki/zh/{模块名称}/{文档名称}.md",
        "name": "文档名称",
        "description": "文档描述",
        "depend_files": ["src/path/to/file.ts"]
      }
    ],
    // 生成中的文件
    "progress_files": [],
    // 已完成的文件
    "completed_files": []
  },

  // 统计信息
  "total_files": 0,
  "pending_files": 0,
  "progress_files": 0,
  "completed_files": 0,

  // 全局状态
  "status": "pending"
}
```

## 文件对象字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string (UUID) | 文件唯一标识符 |
| `path` | string | 文件路径（相对于项目根目录），格式: `.worker/wiki/zh/{模块名}/{文档名}.md` |
| `name` | string | 文件显示名称（不包含扩展名） |
| `description` | string | 文件内容描述 |
| `depend_files` | string[] | **源文件路径列表**（在 Step4 中根据这些依赖生成专业文档） |

## 路径命名规范

Wiki 文档路径格式：
```
.worker/wiki/zh/{模块名称}/{文档名称}.md
```

示例：
- `.worker/wiki/zh/AI模型服务/概述.md`
- `.worker/wiki/zh/AI模型服务/架构设计.md`
- `.worker/wiki/zh/Agent核心/执行引擎.md`

## depend_files 说明

`depend_files` 存储的是**源文件路径**，用于 Step4 深度分析：

```json
{
  "depend_files": [
    "packages/core/src/ai-model/index.ts",
    "packages/core/src/ai-model/service-caller/index.ts"
  ]
}
```

这些路径对应 modules.json 中该模块的 `depend_paths` 或 `source_module_ids` 关联的源文件。

## 全局状态说明

| 字段 | 说明 |
|------|------|
| `status` | 文件生成状态：`pending` / `progress` / `completed` |
| `total_files` | 总文件数 |
| `pending_files` | 待生成文件数 |
| `progress_files` | 生成中文件数 |
| `completed_files` | 已完成文件数 |
