---
name: wiki-generator
description: 从项目代码库生成企业级 wiki 文档。当用户提到以下任一内容时必须使用：生成文档、创建 wiki、项目文档、代码文档、技术文档、新人入职文档、知识库、写文档、文档生成、文档整理、模块文档、API 文档。适用于 React/Vue/Node/Python/Go/Java 等任何项目类型。如果用户想从代码生成任何形式的文档，立即使用此 skill。
metadata:
  compatibility:
    tools:
      - Read
      - Glob
      - Grep
      - Edit
      - Write
      - Agent
    requires:
      - git 仓库或项目目录
---

# Wiki 生成器（全 Subagent 版本）

从任何项目代码库生成全面、企业级的 wiki 文档，采用主控-子代理架构。

**核心原则**：
- 主控（你）**只调度，不执行具体任务**
- 每个具体任务派生独立 Subagent 执行
- 主控读取 Subagent 返回的状态，决定下一步

---

## 快速开始

当用户要求生成 wiki 时，按以下步骤执行：

## Phase 1: 文件收集

**你必须使用 Agent 工具派生 Subagent，而不是自己执行。**

### 1.1 派生文件收集器

使用 Agent 工具，读取 `agents/file-collector.md`，然后执行：

```javascript
// 使用 Agent 工具调用
{
  "description": "收集项目文件路径",
  "prompt": "你是一个文件收集器 Agent。\n\n你的任务：\n1. 检查 .worker/wiki/config.yaml 是否存在\n2. 运行 node scripts/collect-files.js\n3. 验证生成的 .worker/wiki/temp/files-index.json\n4. 返回 JSON 格式的结果：{status, totalFiles, error?}",
  "subagent_type": "general-purpose"
}
```

### 1.2 处理结果

**等待 Subagent 返回后**：

- **如果返回 success**：
  - 记录 `totalFiles`
  - 输出：`✓ Phase 1 完成：收集到 {totalFiles} 个文件`
  - 进入 Phase 2

- **如果返回 failed**：
  - 输出错误信息
  - 中止执行，提示用户修复问题

---

## Phase 2: 模块识别

### 2.1 派生模块聚类器

使用 Agent 工具，读取 `agents/module-clusterer.md`：

```javascript
{
  "description": "识别模块边界",
  "prompt": "你是一个模块聚类器 Agent。\n\n你的任务：\n1. 读取 .worker/wiki/temp/files-index.json\n2. AI 语义分析，识别业务模块、共享模块、配置模块\n3. 为每个模块确定入口文件\n4. 输出到 .worker/wiki/meta/modules.json\n5. 返回 JSON: {status, totalModules, modules[], orphanFiles[]}\n\n注意：\n- 基于文件路径进行语义分析\n- 不要读取文件内容，只分析路径\n- 模块名用中文",
  "subagent_type": "general-purpose"
}
```

### 2.2 处理结果

**等待返回后**：

- **如果返回 success**：
  - 读取 `.worker/wiki/meta/modules.json`
  - 记录 `totalModules`
  - 输出：`✓ Phase 2.1 完成：识别到 {totalModules} 个模块`
  - 进入 Phase 2.2

---

## Phase 3: 模块分析（并行）

**关键：为每个模块并行派生分析器**

### 3.1 读取模块列表

使用 Read 工具读取 `.worker/wiki/meta/modules.json`：

```javascript
const modulesData = JSON.parse(
  fs.readFileSync('.worker/wiki/meta/modules.json')
);
const modules = modulesData.modules;
```

### 3.2 并行派生分析器

**一次最多并行 5 个**（避免过度消耗资源）：

```javascript
// 分批并行处理
const batchSize = 5;
for (let i = 0; i < modules.length; i += batchSize) {
  const batch = modules.slice(i, i + batchSize);

  // 使用多个 Agent 工具并行执行
  const results = await Promise.all(
    batch.map(module => Agent({
      description: `分析模块: ${module.name}`,
      prompt: `你是一个模块分析器 Agent。\n\n模块信息:\n- 名称: ${module.name}\n- 类型: ${module.type}\n- 入口文件: ${module.entry}\n- 文件列表: ${module.files.join(', ')}\n\n你的任务：\n1. 读取入口文件和相关文件（最多5个）\n2. 提取导出内容、组件、API、类型\n3. 分析依赖关系\n4. 生成功能描述\n5. 输出到 .worker/wiki/meta/analysis/${module.name}.json\n6. 返回 JSON: {status, exportsCount, componentsCount, error?}`,
      subagent_type: "general-purpose"
    }))
  );

  // 记录结果
  results.forEach((result, idx) => {
    const module = batch[idx];
    console.log(`模块 ${module.name}: ${result.status}`);
  });
}
```

### 3.3 处理结果

- 统计成功/失败的模块数
- 如果有失败 > 10%，可选择重试一次
- 输出：`✓ Phase 3 完成：{successCount}/{totalModules} 个模块已分析`

---

## Phase 4: 文档生成（并行）

### 4.1 并行派生文档生成器

类似 Phase 3，为每个已分析的模块派生文档生成器：

```javascript
const analyzedModules = modules.filter(m => {
  // 检查分析文件是否存在
  return fs.existsSync(`.worker/wiki/meta/analysis/${m.name}.json`);
});

for (let i = 0; i < analyzedModules.length; i += batchSize) {
  const batch = analyzedModules.slice(i, i + batchSize);

  await Promise.all(
    batch.map(module => Agent({
      description: `生成文档: ${module.name}`,
      prompt: `你是一个文档生成器 Agent。\n\n模块信息:\n- 名称: ${module.name}\n- 分析结果: .worker/wiki/meta/analysis/${module.name}.json\n- 输出目录: .worker/.worker/wiki/zh/${module.name}/\n\n你的任务：\n1. 读取分析结果\n2. 应用文档模板\n3. 生成 README.md 和子文档\n4. 返回 JSON: {status, generatedFiles[], error?}\n\n注意：\n- 不要读取源代码，只读取分析结果\n- 使用相对路径建立链接`,
      subagent_type: "general-purpose"
    }))
  );
}
```

### 4.2 生成索引

派生索引生成器：

```javascript
Agent({
  description: "生成项目索引",
  prompt: `你是一个索引生成器 Agent。\n\n你的任务：\n1. 读取 .worker/wiki/meta/modules.json\n2. 读取所有模块的分析结果\n3. 生成 .worker/wiki/zh/README.md（项目首页）\n4. 生成 .worker/wiki/zh/文档地图.md\n5. 返回 JSON: {status, generatedFiles[]}`,
  subagent_type: "general-purpose"
})
```

---

## Phase 5: 验证

派生验证器：

```javascript
Agent({
  description: "验证文档完整性",
  prompt: `你是一个验证器 Agent。\n\n你的任务：\n1. 读取 files-index.json 和 modules.json\n2. 扫描 .worker/wiki/zh/ 目录\n3. 计算覆盖率 = 已文档化文件 / 总文件\n4. 检查模块完整性\n5. 生成 .worker/wiki/zh/验证报告.md\n6. 返回 JSON: {status, coverage, totalFiles, documentedFiles, warnings[]}`,
  subagent_type: "general-purpose"
})
```

---

## 进度输出示例

执行过程中实时输出：

```
[Phase 1/5] 文件收集
  ⏳ 派生文件收集器 Subagent...
  ✓ 收集完成：156 个文件

[Phase 2/5] 模块识别
  ⏳ 派生模块聚类器 Subagent...
  ✓ 识别到 12 个模块

[Phase 3/5] 模块分析
  ⏳ 并行分析模块 (批次 1/3)
    ⏳ 用户管理... ⏳ 订单管理... ⏳ 商品管理... ⏳ 系统设置... ⏳ 权限管理...
  ✓ 批次 1 完成
  ⏳ 并行分析模块 (批次 2/3)
    ...
  ✓ 分析完成：12/12 个模块

[Phase 4/5] 文档生成
  ⏳ 并行生成文档...
  ✓ 生成完成：12 个模块文档
  ⏳ 生成项目索引...
  ✓ 索引生成完成

[Phase 5/5] 验证
  ⏳ 派生验证器...
  ✓ 覆盖率：98.1%
  ⚠ 未覆盖文件：3 个
    - src/utils/date.ts
    - src/utils/format.ts
    - src/hooks/useDebounce.ts

=== Wiki 生成完成 ===
输出目录: .worker/wiki/zh/
模块数: 12
覆盖率: 98.1%
验证报告: .worker/wiki/zh/验证报告.md
```

---

## 关键原则

### 1. 不要自己读取源文件

**错误**：
```javascript
// 不要这样做
const content = fs.readFileSync('src/components/Button.tsx');
```

**正确**：
```javascript
// 让 Subagent 去做
Agent({
  prompt: "读取 src/components/Button.tsx 并分析..."
})
```

### 2. 等待 Subagent 返回再继续

每个 Phase 必须等待所有 Subagent 完成后才能进入下一阶段。

### 3. 通过文件传递数据

Subagent 之间通过文件交换数据：
- Phase 1 → Phase 2: `files-index.json`
- Phase 2 → Phase 3: `modules.json`
- Phase 3 → Phase 4: `analysis/*.json`

### 4. 失败处理

| 失败场景 | 处理 |
|---------|------|
| 文件收集失败 | 中止，提示用户检查配置 |
| 单个模块分析失败 | 标记为 failed，继续其他模块 |
| 覆盖率 < 95% | 生成警告报告，询问是否继续 |

---

## Agent 定义文件

每个 Subagent 的详细定义在：

- `skills/wiki-generator/agents/file-collector.md`
- `skills/wiki-generator/agents/module-clusterer.md`
- `skills/wiki-generator/agents/module-analyzer.md`
- `skills/wiki-generator/agents/doc-generator.md`
- `skills/wiki-generator/agents/index-generator.md`
- `skills/wiki-generator/agents/validator.md`

---

## 脚本文件

- `scripts/collect-files.js` - 文件收集脚本
