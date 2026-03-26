---
name: wiki
description: 自动从代码生成专业级结构化项目 Wiki。当用户请求"生成 wiki"、"创建文档"、"更新 wiki"、"重建 wiki"或需要项目文档时使用。支持代码语义分析、Mermaid 图表、交叉链接文档网络。
---

# Wiki 生成器

生成**专业级**结构化项目 Wiki 到 `.worker/wiki` 目录。

> **核心原则**：生成的文档必须 **详细、结构化、有图表、相互关联**，达到企业级技术文档标准。

---

# 脚本参考

| 脚本 | 用途 |
|------|------|
| `scripts/init-wiki.js <path>` | 初始化 wiki 工程目录 |
| `scripts/collect-source.js` | 收集源代码文件 |
| `scripts/module-manager.js` | 管理模块状态 |
| `scripts/progress-manager.js` | 管理生成进度 |

---

# Agent 档案

| Agent | 文件 | 职责 |
|-------|------|------|
| `coordinator` | `agents/coordinator.md` | 协调整个流程，执行步骤 1 和 4 |
| `module-scanner` | `agents/module-scanner.md` | 分析代码语义，识别模块 |
| `wiki-generator` | `agents/wiki-generator.md` | 生成 Wiki 文档 |

---

# 参考文档

| 文件 | 内容 |
|------|------|
| `references/split-module.md` | 模块拆分策略（Phase 1 细粒度扫描 + Phase 2 智能合并） |
| `references/data-structures/module.md` | modules.json 数据结构说明 |
| `references/data-structures/progress.md` | progress.json 数据结构说明 |

---

# 执行步骤（顺序执行）

## 步骤完成检查清单

```
步骤 1 完成: [ ]
步骤 2 完成: [ ]
步骤 3 完成: [ ]
步骤 4 完成: [ ]
```

---

## 步骤 1: 初始化

**执行指令：**

```bash
# 1.1 检查目录状态
ls -la .worker/wiki/ 2>/dev/null || echo "目录不存在或为空"
```

**1.2 初始化 wiki 目录：**
- 如果 `.worker/wiki/` 不存在或文件不完整：
  ```bash
  node scripts/init-wiki.js .worker
  node scripts/collect-source.js
  ```

**1.3 验证初始化结果：**
- 检查 `.worker/wiki/config.yaml` 是否存在
- 检查 `.worker/wiki/temp/source-files.json` 是否存在

**步骤 1 完成: [✓]** → 进入步骤 2

---

## 步骤 2: 模块扫描（subAgent）

**说明**：召唤 module-scanner Agent 执行模块扫描，完成后自动返回。

**执行指令：**

```bash
# 2.1 检查 modules.json 状态
if [ -f .worker/wiki/meta/modules.json ]; then
  cat .worker/wiki/meta/modules.json | grep '"status"' || echo "未找到 status 字段"
fi
```

**判断：**
- 如果输出 `"status": "completed"` → **步骤 2 完成: [✓]** → 进入步骤 3
- 其他情况 → 继续 2.2

### 2.2 召唤 module-scanner Agent

```
使用 Agent 工具：
- subagent_type: general-purpose
- name: module-scanner
- description: 分析工程代码语义并按功能划分模块
- prompt: |
    读取并分析项目源代码，按功能语义划分模块。

    任务：
    1. 读取 .worker/wiki/temp/source-files.json 获取源代码文件列表
    2. 读取 .worker/wiki/config.yaml 获取扫描配置
    3. 按照 references/split-module.md 的两步扫描策略执行：
       - Phase 1: 细粒度扫描（基于代码语义识别模块）
       - Phase 2: 智能合并（按功能相似性合并模块）
    4. 使用 scripts/module-manager.js 写入模块数据

    要求：
    - 读取关键文件内容（exports/imports/注释）进行语义分析
    - 按功能职责聚类，允许跨目录
    - 每个模块必须包含：id, name, sourceFiles, dependencies
    - 完成后更新 modules.json 的 status 为 "completed"

    完成后报告：
    - 识别的模块数量
    - 每个模块的名称和文件数
    - 最终 modules.json 路径
```

### 2.3 等待完成并验证

```bash
# 等待 Agent 完成后，验证结果
cat .worker/wiki/meta/modules.json | grep '"status"'
```

**判断：**
- 输出 `"status": "completed"` → **步骤 2 完成: [✓]** → 进入步骤 3
- 其他状态 → 记录错误，可选择重新执行步骤 2（最多重试 3 次）

---

## 步骤 3: 子模块拆分

**执行指令：**

```bash
# 3.1 检查 progress.json 状态
if [ -f .worker/wiki/meta/progress.json ]; then
  cat .worker/wiki/meta/progress.json | grep '"status"'
fi
```

**判断：**
- 如果 progress.json 不存在或 status 不是 "completed"：
  ```bash
  node scripts/progress-manager.js split-module
  node scripts/progress-manager.js status "completed"
  ```
- 如果 status 已经是 "completed" 且没有待处理模块 → **步骤 3 完成: [✓]** → 进入步骤 4

---

## 步骤 4: Wiki 文档生成（subAgent 循环）

**说明**：逐个召唤 wiki-generator Agent 生成每个模块的文档。

### 4.1 获取待生成模块

```bash
node scripts/progress-manager.js next
```

**返回格式：**
```json
{
  "hasMore": true,
  "module": {
    "id": "user-management",
    "title": "用户管理",
    "sourceFiles": [...],
    "dependencies": [...]
  }
}
```

### 4.2 判断流程

**如果 hasMore 为 false**：
- 所有模块已生成完成
- 生成首页索引（见 4.4）
- **步骤 4 完成: [✓]** → 结束

**如果 hasMore 为 true**：
- 继续 4.3 召唤 wiki-generator Agent

### 4.3 召唤 wiki-generator Agent

```
使用 Agent 工具：
- subagent_type: general-purpose
- name: wiki-generator
- description: 生成模块 Wiki 文档
- prompt: |
    生成模块的专业级 Wiki 文档。

    模块信息：
    - moduleId: {{module.id}}
    - title: {{module.title}}
    - sourceFiles: {{module.sourceFiles}}
    - dependencies: {{module.dependencies}}

    任务：
    1. 读取所有 sourceFiles，理解模块功能
    2. 分析依赖关系，生成交叉引用
    3. 生成包含以下内容的 Markdown 文档：
       - 模块概述和功能描述
       - 架构图（Mermaid）
       - 核心类/函数说明
       - 使用示例
       - 依赖文件表格
       - 相关文档链接
    4. 保存到 .worker/wiki/zh/{{module.id}}.md

    质量要求：
    - 文档必须详细、准确、有深度
    - 必须包含 Mermaid 图表（架构图、时序图或数据流图）
    - 代码示例必须可运行
    - 避免编造信息，基于实际代码生成

    完成后：
    - 报告生成的文档路径
    - 报告文档包含的章节数量
```

### 4.4 更新进度并循环

```bash
node scripts/progress-manager.js complete {{module.id}}
```

**回到 4.1 继续下一个模块**

### 4.5 生成首页索引（所有模块完成后）

当所有模块生成完成后，生成首页文档：

```bash
# 生成 README.md 首页
cat > .worker/wiki/zh/README.md << 'EOF'
# {{项目名}} Wiki

> 最后更新: $(date)

## 文档地图

| 模块 | 描述 |
|------|------|
EOF

# 添加模块列表
node scripts/module-manager.js list >> .worker/wiki/zh/README.md
```

---

# 错误处理

## 通用重试策略

每个 subAgent 调用失败时：

1. **记录错误**：保存错误信息到 `.worker/wiki/logs/error-{timestamp}.log`
2. **重试**：最多重试 3 次
3. **跳过**：如果重试失败，记录跳过的模块，继续后续流程

## 常见错误

| 错误 | 处理 |
|------|------|
| modules.json 格式错误 | 删除并重新执行步骤 2 |
| sourceFiles 不存在 | 跳过该模块，记录警告 |
| 生成文档为空 | 重试 wiki-generator Agent |

---

# 输出结构

```
.worker/wiki/
├── config.yaml                 # 配置文件
├── meta/
│   ├── modules.json           # 模块定义
│   └── progress.json          # 进度追踪
├── temp/
│   └── source-files.json      # 源代码文件列表
└── zh/                        # 中文文档
    ├── README.md              # 首页
    ├── {module-1}.md          # 模块文档
    ├── {module-2}.md
    └── ...
```
