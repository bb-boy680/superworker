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

# Wiki Generator Skill

代码库自动生成 Wiki 文档的 Skill。基于代码复杂度分析，采用智能文档拆分策略生成层次化文档。

## Description

Wiki Generator 是一个智能文档生成系统，通过分析代码模块的复杂度，自动选择最适合的文档生成策略：

- **单文档模式**: 适用于简单模块（复杂度 < 30）
- **章节拆分模式**: 适用于中等模块（复杂度 30-60）
- **嵌套文档模式**: 适用于复杂模块（复杂度 > 60）

## Execution Flow

完整的执行流程分为 5 个 Phase：

```
Phase 1: 文件收集 (Subagent)
    ↓
Phase 2: 模块识别 (Subagent) → modules.json
    ↓
Phase 3: 复杂度评估 (并行 Subagents) → complexity/*.json
    ↓
Phase 4: 文档生成（根据复杂度决定策略）
    │   ├── 简单模块 → 单文档生成
    │   ├── 中等模块 → 章节文档生成
    │   └── 复杂模块 → 嵌套文档生成
    ↓
Phase 5: 验证 (Subagent)
```

### Phase 1: 文件收集

**Agent**: `file-collector`

**职责**:
- 扫描目标代码库的所有源文件
- 过滤掉测试文件、node_modules、构建产物等
- 生成文件索引，按文件类型和目录组织

**输出**: `.worker/wiki/file-index.json`

```json
{
  "files": [
    {
      "path": "src/agent/core/llm/index.ts",
      "type": "typescript",
      "size": 1250,
      "exports": ["callLLM", "streamLLM"]
    }
  ],
  "totalCount": 150
}
```

### Phase 2: 模块识别

**Agent**: `module-clusterer`

**职责**:
- 分析文件索引，识别代码模块
- 根据目录结构、入口文件、依赖关系聚类
- 确定模块层级关系和边界

**输入**: `file-index.json`
**输出**: `.worker/wiki/meta/modules.json`

```json
{
  "modules": [
    {
      "id": "agent-core-llm",
      "name": "LLM调用",
      "path": "src/agent/core/llm",
      "entryFile": "src/agent/core/llm/index.ts",
      "files": [...],
      "hasSubdirs": true
    }
  ]
}
```

### Phase 3: 复杂度评估

**Agent**: `complexity-evaluator` (并行执行)

**职责**:
- 读取模块入口文件和关键子文件
- 基于多维度指标计算复杂度分数 (0-100)
- 决定文档策略：single / sections / nested

**输入**: 单个模块信息
**输出**: `.worker/wiki/meta/complexity/{moduleId}.json`

**复杂度评分指标**:

| 指标 | 评分规则 | 最高分 |
|------|----------|--------|
| 代码行数 | >1000→30, >500→20, >200→10, else→5 | 30 |
| 导出数量 | exports × 2, 上限15 | 15 |
| 依赖数量 | imports.length, 上限15 | 15 |
| 子模块 | hasSubdirs → 20 | 20 |
| 复杂逻辑 | hasComplexLogic → 10 | 10 |
| 使用场景 | useCases × 3, 上限10 | 10 |

**复杂度等级**:
- **简单 (0-30)**: 工具函数、简单组件、配置
- **中等 (30-60)**: 服务类、中等组件、简单模块
- **复杂 (60-100)**: 核心模块、复杂组件、框架级代码

### Phase 4: 文档生成

**Agent**: `doc-generator` (并行执行)

根据复杂度报告中的 `strategy.type` 选择对应策略：

#### Strategy 1: Single（单文档模式）

**适用**: 简单模块（复杂度 < 30）

**输出**: `wiki/zh/{moduleName}.md`

**文档结构**:
```markdown
# {模块名}

## 概述
## API
## 使用示例
```

#### Strategy 2: Sections（章节拆分模式）

**适用**: 中等模块（复杂度 30-60）

**输出**: `wiki/zh/{moduleName}/README.md`

**文档结构**:
```markdown
# {模块名}

## 概述
## 架构设计
## 核心功能
## API 参考
## 配置选项
## 使用示例
## 最佳实践
## 总结
```

#### Strategy 3: Nested（嵌套文档模式）

**适用**: 复杂模块（复杂度 > 60）

**输出**:
- 主文档: `wiki/zh/{moduleName}/README.md`
- 子文档: `wiki/zh/{moduleName}/{subModuleName}.md`

**执行流程**:
1. 生成主文档作为容器/索引
2. 遍历子模块列表
3. 为每个子模块递归调用文档生成（深度+1）
4. 在主文档中添加子模块导航

### Phase 5: 验证

**Agent**: `validator`

**职责**:
- 检查生成的文档完整性
- 验证链接有效性
- 确认所有模块都有对应文档
- 检查格式规范

**输出**: 验证报告

## Agents

### file-collector

文件收集 Agent，负责扫描代码库并生成文件索引。

**输入**: 项目根目录路径
**输出**: 文件索引 JSON

### module-clusterer

模块识别 Agent，负责分析文件并聚类成模块。

**输入**: 文件索引 JSON
**输出**: 模块定义 JSON

### complexity-evaluator

复杂度评估 Agent，负责分析模块复杂度并决定文档策略。

**输入**: 单个模块信息
**输出**: 复杂度报告 JSON

**详见**: [agents/complexity-evaluator.md](./agents/complexity-evaluator.md)

### doc-generator

文档生成 Agent，负责根据复杂度报告生成对应类型的文档。

**输入**: 模块信息 + 复杂度报告
**输出**: Markdown 文档

**详见**: [agents/doc-generator.md](./agents/doc-generator.md)

### validator

验证 Agent，负责检查生成文档的质量和完整性。

**输入**: 生成的文档目录
**输出**: 验证报告

## Configuration

### 配置文件位置

`.claude/skills/wiki-generator/config.json`

### 配置项

```json
{
  "input": {
    "rootPath": "./",
    "include": ["src/**/*", "lib/**/*"],
    "exclude": ["**/*.test.ts", "**/*.spec.ts", "node_modules/**", "dist/**"]
  },
  "output": {
    "basePath": "wiki/zh",
    "metaPath": ".worker/wiki/meta"
  },
  "complexity": {
    "thresholds": {
      "simple": 30,
      "medium": 60,
      "complex": 100
    },
    "weights": {
      "lines": 30,
      "exports": 15,
      "dependencies": 15,
      "submodules": 20,
      "complexLogic": 10,
      "useCases": 10
    }
  },
  "strategies": {
    "single": {
      "sections": ["概述", "API", "示例"]
    },
    "sections": {
      "sections": ["概述", "架构设计", "核心功能", "API参考", "配置选项", "使用示例", "最佳实践", "总结"]
    },
    "nested": {
      "maxDepth": 3,
      "sections": ["概述", "架构设计", "子模块", "快速开始", "文档结构", "总结"]
    }
  }
}
```

## Usage Examples

### 基本用法

```javascript
// 主控函数 - 执行完整的 Wiki 生成流程
async function executeWikiGeneration() {
  // Phase 1: 文件收集
  const fileIndex = await runFileCollector();

  // Phase 2: 模块识别
  const modules = await runModuleClusterer();

  // Phase 3: 复杂度评估（并行）
  const complexityReports = await Promise.all(
    modules.map(m => runComplexityEvaluator(m))
  );

  // 按复杂度分组
  const simpleModules = complexityReports.filter(r => r.strategy.type === 'single');
  const mediumModules = complexityReports.filter(r => r.strategy.type === 'sections');
  const complexModules = complexityReports.filter(r => r.strategy.type === 'nested');

  // Phase 4: 分别生成（并行）
  await Promise.all([
    Promise.all(simpleModules.map(m => generateSingleDoc(m))),
    Promise.all(mediumModules.map(m => generateSectionedDoc(m))),
    (async () => {
      for (const m of complexModules) {
        await generateNestedDocs(m);
      }
    })()
  ]);

  // Phase 5: 验证
  await runValidator();
}
```

### 单独使用某 Phase

```javascript
// 仅执行复杂度评估
async function analyzeComplexity(modulePath) {
  const result = await complexityEvaluator.analyze(modulePath);
  return result;
}

// 仅生成文档（已有复杂度报告）
async function generateDocsFromReport(module, complexityReport) {
  const { generateDocs } = require('./scripts/doc-strategies');
  return await generateDocs(module, complexityReport);
}
```

### 使用 CLI

```bash
# 执行完整流程
claude skill wiki-generator:generate

# 仅执行特定 Phase
claude skill wiki-generator:collect-files
claude skill wiki-generator:cluster-modules
claude skill wiki-generator:evaluate-complexity
claude skill wiki-generator:generate-docs
claude skill wiki-generator:validate
```

## Scripts

### doc-strategies.js

文档生成策略的核心实现，支持三种策略模式。

**路径**: [scripts/doc-strategies.js](./scripts/doc-strategies.js)

**主要函数**:
- `generateDocs(module, complexityReport, currentDepth)` - 主入口，根据策略类型分发
- `generateSingleDoc(module, complexityReport)` - 单文档模式
- `generateSectionedDoc(module, complexityReport)` - 章节拆分模式
- `generateNestedDocs(module, complexityReport, depth)` - 嵌套文档模式

### complexity-analyzer.js

复杂度分析算法实现。

**路径**: [scripts/complexity-analyzer.js](./scripts/complexity-analyzer.js)

**主要函数**:
- `analyzeFile(filePath)` - 分析单个文件
- `calculateComplexity(metrics)` - 计算复杂度分数
- `determineStrategy(score)` - 根据分数决定策略

## Directory Structure

```
skills/wiki-generator/
├── SKILL.md                      # 本文件 - 主控文档
├── agents/
│   ├── complexity-evaluator.md   # 复杂度评估 Agent 定义
│   └── doc-generator.md          # 文档生成 Agent 定义
├── scripts/
│   ├── doc-strategies.js         # 文档策略实现
│   ├── doc-strategies.test.js    # 策略测试
│   ├── complexity-analyzer.js    # 复杂度分析
│   └── complexity-analyzer.test.js
└── config/
    └── schema.json               # 配置 Schema
```

## Output Directory Structure

```
wiki/
├── zh/                           # 中文文档
│   ├── simple-module.md          # 简单模块 - 单文档
│   ├── medium-module/            # 中等模块 - 章节拆分
│   │   └── README.md
│   └── complex-module/           # 复杂模块 - 嵌套拆分
│       ├── README.md             # 主文档（容器）
│       ├── sub-module-a.md       # 子模块文档
│       └── sub-module-b.md
└── meta/                         # 元数据
    ├── modules.json              # 模块定义
    ├── complexity/               # 复杂度报告
    │   ├── module-a.json
    │   └── module-b.json
    └── validation-report.json    # 验证报告
```

## Dependencies

- Node.js >= 16.0.0
- 支持文件系统操作 (fs/promises)
- 支持路径处理 (path)

## Notes

1. **Token 优化**: 复杂度评估阶段只读取最多 2 个关键子文件，避免 Token 过度消耗
2. **并行执行**: Phase 3 和 Phase 4 中的简单/中等模块可以并行处理
3. **顺序执行**: 复杂模块的嵌套文档生成需要顺序执行（递归深度控制）
4. **缓存机制**: 复杂度报告会缓存，避免重复分析
5. **错误恢复**: 单个模块生成失败不会影响其他模块
