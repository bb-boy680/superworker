# Wiki Generator 增强计划：智能文档拆分策略

> 创建时间: 2024-03-25
> 目标: 基于代码复杂度智能决定文档拆分策略，复杂模块才需要嵌套文档

---

## 核心原则

- **不是**所有目录都生成嵌套 wiki
- **只有**代码复杂度高的模块才需要拆分
- **AI 深度分析**决定拆分策略
- **简单模块**一个文档描述清楚
- **复杂模块**才生成子目录和嵌套文档

---

## 智能拆分决策流程

### 什么时候需要拆分？

```
模块分析器读取代码
       ↓
   评估复杂度
       ↓
   ┌─────────────────────────────────────┐
   │  复杂度指标：                        │
   │  1. 代码行数 > 500 行？              │
   │  2. 导出函数/组件 > 5 个？           │
   │  3. 依赖关系 > 10 个？               │
   │  4. 有子目录且包含独立功能？         │
   │  5. 包含复杂算法或状态管理？         │
   │  6. 有多个独立的使用场景？           │
   └─────────────────────────────────────┘
       ↓
   复杂度评分 (0-100)
       ↓
   ┌──────────────┬──────────────┬──────────────┐
   │  简单 < 30   │  中等 30-60  │  复杂 > 60   │
   │              │              │              │
   │  单文档      │  单文档+     │  嵌套文档    │
   │  README.md   │  子章节      │  多文件拆分  │
   └──────────────┴──────────────┴──────────────┘
```

### 拆分策略示例

**场景 1：简单模块（不拆分）**

```typescript
// src/utils/date.ts - 简单工具函数
export function formatDate() { ... }
export function parseDate() { ... }
```

输出：
```
wiki/zh/
└── 工具函数/
    └── README.md  (包含所有工具函数描述)
```

**场景 2：中等复杂度（章节拆分）**

```typescript
// src/services/userApi.ts - 用户 API 服务
export function getUserList() { ... }
export function createUser() { ... }
export function updateUser() { ... }
export function deleteUser() { ... }
export function batchUpdateUsers() { ... }
// 共 15 个 API 函数
```

输出：
```
wiki/zh/
└── 用户服务/
    └── README.md  (单文档，章节拆分)
        # - 概述
        # - 用户查询 (章节)
        # - 用户创建 (章节)
        # - 用户更新 (章节)
        # - 批量操作 (章节)
```

**场景 3：复杂模块（嵌套文档）**

```
src/agent/core/llm/
├── index.ts           (入口，导出所有功能)
├── call.ts            (调用逻辑，200行)
├── stream.ts          (流式处理，300行)
├── retry.ts           (重试机制，150行)
├── cache.ts           (缓存管理，200行)
├── adapters/
│   ├── openai.ts      (OpenAI适配器，250行)
│   ├── anthropic.ts   (Anthropic适配器，250行)
│   └── azure.ts       (Azure适配器，200行)
└── types.ts           (类型定义，100行)

总代码量：~1650行
导出内容：20+ 函数/类型
子目录：adapters/
复杂度：高
```

输出：
```
wiki/zh/
└── Agent核心/
    ├── README.md              (容器概述)
    └── LLM调用/               (复杂子模块 - 拆分)
        ├── README.md          (模块概述)
        ├── 基础调用.md        (call.ts)
        ├── 流式处理.md        (stream.ts)
        ├── 重试机制.md        (retry.ts)
        ├── 缓存管理.md        (cache.ts)
        └── 模型适配器/         (adapters/ - 再嵌套)
            ├── README.md
            ├── OpenAI适配器.md
            ├── Anthropic适配器.md
            └── Azure适配器.md
```

**场景 4：混合模式（部分拆分）**

```
src/components/
├── Button/
│   ├── index.tsx        (简单组件，50行)
│   └── style.css        (样式)
├── Modal/
│   ├── index.tsx        (中等复杂度，200行)
│   ├── hooks/
│   │   └── useModal.ts  (逻辑hook)
│   └── style.css
└── Form/
    ├── index.tsx        (复杂组件，800行)
    ├── FormItem/
    │   ├── index.tsx    (子组件)
    │   └── validation.ts
    ├── FormList/
    │   └── index.tsx    (子组件)
    └── hooks/
        ├── useForm.ts
        └── useField.ts
```

输出：
```
wiki/zh/
└── 组件库/
    ├── README.md              (容器)
    ├── Button.md              (简单 - 单文档)
    ├── Modal/
    │   └── README.md          (中等 - 章节拆分)
    └── Form/                  (复杂 - 嵌套拆分)
        ├── README.md
        ├── 快速开始.md
        ├── API文档.md
        ├── FormItem/
        │   └── README.md
        ├── FormList/
        │   └── README.md
        └── Hooks/
            ├── useForm.md
            └── useField.md
```

---

## Phase 1: 智能复杂度评估器（核心新增）

### 1.1 复杂度评估算法

```javascript
/**
 * 代码复杂度评估器
 * 基于多维度指标计算复杂度分数
 */
class ComplexityAnalyzer {
  /**
   * 主评估函数
   * @param {string} entryFile - 入口文件路径
   * @param {string[]} relatedFiles - 相关文件列表
   * @returns {ComplexityReport}
   */
  async analyze(entryFile, relatedFiles) {
    const metrics = {
      lines: 0,              // 代码行数
      exports: 0,            // 导出数量
      functions: 0,          // 函数数量
      classes: 0,            // 类数量
      components: 0,         // 组件数量
      dependencies: 0,       // 依赖数量
      hasSubModules: false,  // 是否有子模块
      hasComplexLogic: false, // 是否有复杂逻辑
      useCases: 0,           // 使用场景数
    };

    // 1. 读取入口文件
    const entryContent = await fs.readFile(entryFile, 'utf-8');
    const entryMetrics = this.analyzeFile(entryContent);
    metrics.lines += entryMetrics.lines;
    metrics.exports += entryMetrics.exports.length;
    metrics.functions += entryMetrics.functions.length;
    metrics.classes += entryMetrics.classes.length;
    metrics.components += entryMetrics.components.length;

    // 2. 读取关键相关文件（最多3个）
    const keyFiles = relatedFiles.slice(0, 3);
    for (const file of keyFiles) {
      const content = await fs.readFile(file, 'utf-8');
      const fileMetrics = this.analyzeFile(content);
      metrics.lines += fileMetrics.lines;
      metrics.exports += fileMetrics.exports.length;
    }

    // 3. 提取依赖
    const imports = this.extractImports(entryContent);
    metrics.dependencies = imports.length;

    // 4. 检测是否有子模块（子目录）
    const dir = path.dirname(entryFile);
    const subdirs = await this.getSubdirectories(dir);
    metrics.hasSubModules = subdirs.length > 0;

    // 5. 检测复杂逻辑
    metrics.hasComplexLogic = this.detectComplexLogic(entryContent);

    // 6. 识别使用场景
    metrics.useCases = this.identifyUseCases(entryContent, entryMetrics);

    // 7. 计算复杂度分数
    const score = this.calculateScore(metrics);

    // 8. 决定拆分策略
    const strategy = this.decideStrategy(score, metrics);

    return {
      score,
      metrics,
      strategy,
      reasoning: this.generateReasoning(metrics, score, strategy),
    };
  }

  /**
   * 分析单个文件
   */
  analyzeFile(content) {
    const lines = content.split('\n').length;

    // 使用正则提取代码元素
    const exports = content.match(/export\s+(?:const|let|var|function|class|interface|type)\s+\w+/g) || [];
    const functions = content.match(/(?:async\s+)?function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g) || [];
    const classes = content.match(/class\s+\w+/g) || [];
    const components = content.match(/React\.FC|React\.Component|Vue\.Component|const\s+\w+:\s*React\.FC/g) || [];

    return {
      lines,
      exports,
      functions,
      classes,
      components,
    };
  }

  /**
   * 计算复杂度分数 (0-100)
   */
  calculateScore(metrics) {
    let score = 0;

    // 代码行数权重 (max 30)
    if (metrics.lines > 1000) score += 30;
    else if (metrics.lines > 500) score += 20;
    else if (metrics.lines > 200) score += 10;
    else if (metrics.lines > 100) score += 5;

    // 导出数量权重 (max 15)
    score += Math.min(metrics.exports * 2, 15);

    // 依赖复杂度权重 (max 15)
    score += Math.min(metrics.dependencies, 15);

    // 子模块权重 (max 20)
    if (metrics.hasSubModules) score += 20;

    // 复杂逻辑权重 (max 10)
    if (metrics.hasComplexLogic) score += 10;

    // 使用场景权重 (max 10)
    score += Math.min(metrics.useCases * 3, 10);

    return Math.min(score, 100);
  }

  /**
   * 决定文档拆分策略
   */
  decideStrategy(score, metrics) {
    if (score < 30) {
      return {
        type: 'single',
        description: '单文档模式 - 功能简单，一个文档描述清楚',
        sections: ['概述', 'API', '示例'],
        maxDepth: 1,
      };
    } else if (score < 60) {
      return {
        type: 'sections',
        description: '章节拆分模式 - 功能中等，单文档内章节拆分',
        sections: this.generateSections(metrics),
        maxDepth: 1,
      };
    } else {
      return {
        type: 'nested',
        description: '嵌套文档模式 - 功能复杂，需要多文档拆分',
        sections: ['概述'],
        subModules: this.identifySubModules(metrics),
        maxDepth: metrics.hasSubModules ? 3 : 2,
      };
    }
  }

  /**
   * 检测复杂逻辑
   */
  detectComplexLogic(content) {
    const patterns = [
      /(?:if|switch|while|for)\s*\([^)]*\)\s*\{[^}]*(?:if|switch|while|for)/, // 嵌套控制流
      /class\s+\w+.*extends.*implements/, // 复杂类继承
      /(?:useEffect|useMemo|useCallback)\s*\([^)]*\)/, // React hooks
      /(?:state|store|reducer|slice)\s*[=:]/i, // 状态管理
      /(?:async|await|Promise|Observable).{0,100}(?:async|await|Promise)/, // 异步嵌套
    ];
    return patterns.some(p => p.test(content));
  }

  /**
   * 识别使用场景
   */
  identifyUseCases(content, metrics) {
    const useCases = [];

    // 基于导出内容识别
    for (const exp of metrics.exports) {
      if (exp.includes('create') || exp.includes('add')) useCases.push('创建');
      if (exp.includes('update') || exp.includes('edit')) useCases.push('更新');
      if (exp.includes('delete') || exp.includes('remove')) useCases.push('删除');
      if (exp.includes('get') || exp.includes('fetch')) useCases.push('查询');
      if (exp.includes('list') || exp.includes('search')) useCases.push('列表');
    }

    // 去重
    return [...new Set(useCases)].length;
  }

  /**
   * 识别子模块
   */
  identifySubModules(metrics) {
    const subModules = [];

    if (metrics.classes > 0) {
      subModules.push({ type: 'class', count: metrics.classes });
    }
    if (metrics.components > 0) {
      subModules.push({ type: 'component', count: metrics.components });
    }

    return subModules;
  }

  /**
   * 生成章节列表
   */
  generateSections(metrics) {
    const sections = ['概述'];

    if (metrics.components > 0) sections.push('组件');
    if (metrics.functions > 0) sections.push('函数');
    if (metrics.classes > 0) sections.push('类');
    if (metrics.hasComplexLogic) sections.push('核心逻辑');
    sections.push('使用示例');

    return sections;
  }

  /**
   * 生成决策理由
   */
  generateReasoning(metrics, score, strategy) {
    const reasons = [];

    if (metrics.lines > 500) reasons.push(`代码量大(${metrics.lines}行)`);
    if (metrics.exports > 5) reasons.push(`导出内容多(${metrics.exports}个)`);
    if (metrics.hasSubModules) reasons.push('包含子模块');
    if (metrics.hasComplexLogic) reasons.push('包含复杂逻辑');
    if (metrics.useCases > 2) reasons.push(`使用场景多(${metrics.useCases}个)`);

    return {
      score,
      strategy: strategy.type,
      reasons: reasons.length > 0 ? reasons : ['功能简单'],
      recommendation: strategy.description,
    };
  }
}
```

### 1.2 复杂度报告格式

```json
{
  "moduleId": "agent-core-llm",
  "moduleName": "LLM调用",
  "complexity": {
    "score": 78,
    "level": "high",
    "metrics": {
      "lines": 1650,
      "exports": 12,
      "functions": 25,
      "classes": 3,
      "components": 0,
      "dependencies": 15,
      "hasSubModules": true,
      "hasComplexLogic": true,
      "useCases": 4
    }
  },
  "strategy": {
    "type": "nested",
    "description": "嵌套文档模式 - 功能复杂，需要多文档拆分",
    "maxDepth": 3,
    "sections": ["概述"],
    "subModules": [
      { "name": "基础调用", "files": ["call.ts"], "complexity": 25 },
      { "name": "流式处理", "files": ["stream.ts"], "complexity": 45 },
      { "name": "模型适配器", "files": ["adapters/"], "complexity": 60 }
    ]
  },
  "reasoning": {
    "score": 78,
    "strategy": "nested",
    "reasons": [
      "代码量大(1650行)",
      "包含子模块",
      "包含复杂逻辑",
      "使用场景多(4个)"
    ],
    "recommendation": "建议拆分为嵌套文档结构，按功能子模块分别生成文档"
  }
}
```

---

## Phase 2: 创建复杂度评估器 Agent

### 2.1 Agent 定义

```markdown
# Complexity Evaluator Agent

你是一个代码复杂度评估器，负责分析模块的复杂程度，决定文档拆分策略。

## 你的职责

1. 读取模块的入口文件和相关文件
2. 基于多维度指标评估复杂度
3. 计算复杂度分数 (0-100)
4. 决定文档策略：单文档 / 章节拆分 / 嵌套拆分
5. 生成复杂度报告

## 输入

```json
{
  "moduleId": "agent-core-llm",
  "moduleName": "LLM调用",
  "entryFile": "src/agent/core/llm/index.ts",
  "files": [
    "src/agent/core/llm/call.ts",
    "src/agent/core/llm/stream.ts",
    "src/agent/core/llm/adapters/openai.ts"
  ],
  "hasSubdirs": true
}
```

## 执行步骤

### Step 1: 读取入口文件

使用 Read 工具读取 `entryFile`。

统计：
- 代码行数
- export 数量
- 函数数量
- 类/组件数量
- import 数量

### Step 2: 检测复杂特征

基于入口文件内容，检测：
- [ ] 是否有嵌套控制流（if/while/for 嵌套）
- [ ] 是否有状态管理（useState, reducer, store）
- [ ] 是否有异步嵌套（Promise 链、async/await 嵌套）
- [ ] 是否有复杂类继承
- [ ] 是否有复杂类型定义

### Step 3: 读取关键子文件（最多2个）

从 `files` 中选择最重要的2个文件读取：
- 文件大小最大的
- 或者文件名包含核心功能词的

累加统计数据。

### Step 4: 评估复杂度

计算复杂度分数：

```javascript
let score = 0;

// 代码行数 (max 30)
if (lines > 1000) score += 30;
else if (lines > 500) score += 20;
else if (lines > 200) score += 10;
else score += 5;

// 导出数量 (max 15)
score += Math.min(exports * 2, 15);

// 依赖数量 (max 15)
score += Math.min(imports.length, 15);

// 子模块 (max 20)
if (hasSubdirs) score += 20;

// 复杂逻辑 (max 10)
if (hasComplexLogic) score += 10;

// 使用场景 (max 10)
score += Math.min(useCases * 3, 10);

score = Math.min(score, 100);
```

### Step 5: 决定文档策略

| 分数 | 策略 | 说明 |
|------|------|------|
| < 30 | `single` | 单文档，一个文件描述清楚 |
| 30-60 | `sections` | 章节拆分，单文档内分章节 |
| > 60 | `nested` | 嵌套拆分，多文档结构 |

### Step 6: 识别子模块（如果是 nested 策略）

如果策略是 `nested`：

1. 检查每个子目录的功能独立性
2. 为每个子目录计算子复杂度
3. 决定是否进一步嵌套（子复杂度 > 60 才继续嵌套）

### Step 7: 生成报告

输出到 `.worker/wiki/meta/complexity/{moduleId}.json`：

```json
{
  "moduleId": "...",
  "complexity": {
    "score": 78,
    "level": "high",
    "metrics": { ... }
  },
  "strategy": {
    "type": "nested",
    "maxDepth": 3,
    "subModules": [ ... ]
  },
  "reasoning": { ... }
}
```

## 复杂度等级定义

- **简单 (0-30)**: 工具函数、简单组件、配置
- **中等 (30-60)**: 服务类、中等组件、简单模块
- **复杂 (60-100)**: 核心模块、复杂组件、框架级代码

## 注意事项

- 只读取必要的文件，控制 Token 消耗
- 子文件最多读2个
- 不要读取 node_modules 或测试文件
- 基于代码特征客观评估，不要主观判断
```

### 2.2 文件位置

`skills/wiki-generator/agents/complexity-evaluator.md`

---

## Phase 3: 重构文档生成策略

### 3.1 基于复杂度的生成流程

```javascript
async function generateDocs(module, complexityReport) {
  const { strategy } = complexityReport;

  switch (strategy.type) {
    case 'single':
      await generateSingleDoc(module, complexityReport);
      break;
    case 'sections':
      await generateSectionedDoc(module, complexityReport);
      break;
    case 'nested':
      await generateNestedDocs(module, complexityReport);
      break;
  }
}
```

### 3.2 单文档模式（简单模块）

```javascript
async function generateSingleDoc(module, report) {
  const outputPath = `wiki/zh/${module.name}.md`;

  // 模板：简单直接
  const content = `
# ${module.name}

## 概述
${report.reasoning.reasons.join('，')}

## API
${generateAPITable(module)}

## 使用示例
${generateExamples(module)}
`;

  await fs.writeFile(outputPath, content);
}
```

### 3.3 章节拆分模式（中等模块）

```javascript
async function generateSectionedDoc(module, report) {
  const outputPath = `wiki/zh/${module.name}/README.md`;

  // 创建目录
  await mkdir(`wiki/zh/${module.name}`);

  // 模板：带章节
  const content = `
# ${module.name}

## 概述
...

${report.strategy.sections.map(section => `
## ${section}

${generateSectionContent(section, module)}
`).join('\n')}

## 总结
...
`;

  await fs.writeFile(outputPath, content);
}
```

### 3.4 嵌套拆分模式（复杂模块）

```javascript
async function generateNestedDocs(module, report, depth = 0) {
  const outputPath = `wiki/zh/${module.name}/README.md`;

  // 创建目录
  await mkdir(`wiki/zh/${module.name}`, { recursive: true });

  // 生成当前模块的概述文档
  const content = generateContainerREADME(module, report);
  await fs.writeFile(outputPath, content);

  // 递归生成子模块
  if (report.strategy.subModules && depth < report.strategy.maxDepth) {
    for (const subModule of report.strategy.subModules) {
      // 获取子模块的复杂度报告
      const subReport = await loadComplexityReport(subModule.id);

      // 如果子模块仍然复杂，继续嵌套
      if (subReport.strategy.type === 'nested') {
        await generateNestedDocs(subModule, subReport, depth + 1);
      } else {
        // 子模块简单，生成单文档
        await generateSingleDoc(subModule, subReport);
      }
    }
  }
}
```

---

## Phase 4: 新的执行流程

### 4.1 更新后的主控流程

```
Phase 1: 文件收集 (Subagent)
    ↓
Phase 2: 模块识别 (Subagent) → modules.json
    ↓
Phase 3: 复杂度评估 (并行 Subagents) → complexity/*.json
    ↓ 根据复杂度决定下一步
    ├── 简单模块 → Phase 4.1: 单文档生成
    ├── 中等模块 → Phase 4.2: 章节文档生成
    └── 复杂模块 → Phase 4.3: 嵌套文档生成
    ↓
Phase 5: 验证 (Subagent)
```

### 4.2 复杂度驱动的并行策略

```javascript
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
    // 简单模块：批量并行
    Promise.all(simpleModules.map(m => generateSingleDoc(m))),

    // 中等模块：批量并行
    Promise.all(mediumModules.map(m => generateSectionedDoc(m))),

    // 复杂模块：逐个顺序（避免目录冲突）
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

### 4.3 输出示例

**输入项目结构**:
```
src/
├── utils/
│   ├── date.ts          (简单: 100行, 3个函数)
│   └── format.ts        (简单: 80行, 2个函数)
├── components/
│   ├── Button.tsx       (简单: 50行)
│   └── Modal/
│       ├── index.tsx    (中等: 200行, 有hooks)
│       └── useModal.ts
└── agent/
    └── core/
        └── llm/
            ├── index.ts (复杂: 1600行, 12个导出)
            ├── call.ts
            ├── stream.ts
            └── adapters/
                ├── openai.ts
                └── azure.ts
```

**输出 Wiki 结构**:
```
wiki/zh/
├── README.md                    # 项目首页
├── 文档地图.md                   # 索引
├── 工具函数.md                   # 简单模块: utils/date + format
├── 组件库/
│   ├── Button.md                # 简单
│   └── Modal/                   # 中等
│       └── README.md            # 章节拆分
└── Agent核心/
    ├── README.md                # 容器
    └── LLM调用/                 # 复杂
        ├── README.md            # 容器
        ├── 基础调用.md          # 中等: 章节
        ├── 流式处理.md          # 中等: 章节
        └── 模型适配器/           # 中等复杂
            ├── README.md
            ├── OpenAI适配器.md
            └── Azure适配器.md
```

---

## Phase 5: 验证增强

### 5.1 复杂度一致性验证

```javascript
function validateComplexityConsistency(complexityReports) {
  const issues = [];

  for (const report of complexityReports) {
    const { score, strategy } = report.complexity;

    // 检查分数和策略是否匹配
    if (score < 30 && strategy.type !== 'single') {
      issues.push({
        module: report.moduleId,
        type: 'warning',
        message: '复杂度低但使用了复杂策略',
        suggestion: '建议改为单文档模式'
      });
    }

    if (score > 60 && strategy.type === 'single') {
      issues.push({
        module: report.moduleId,
        type: 'error',
        message: '复杂度高但使用了单文档策略',
        suggestion: '建议改为嵌套文档模式'
      });
    }

    // 检查嵌套深度是否合理
    if (strategy.maxDepth > 4) {
      issues.push({
        module: report.moduleId,
        type: 'warning',
        message: '嵌套深度过大',
        suggestion: '建议扁平化到3-4层'
      });
    }
  }

  return issues;
}
```

### 5.2 文档完整性验证

```javascript
function validateDocCompleteness(modules, complexityReports, wikiDir) {
  const missing = [];

  for (let i = 0; i < modules.length; i++) {
    const module = modules[i];
    const report = complexityReports[i];
    const strategy = report.strategy;

    switch (strategy.type) {
      case 'single':
        // 检查单文档是否存在
        if (!fs.existsSync(`${wikiDir}/${module.name}.md`)) {
          missing.push({ module: module.name, expected: `${module.name}.md` });
        }
        break;

      case 'sections':
        // 检查章节文档是否存在
        if (!fs.existsSync(`${wikiDir}/${module.name}/README.md`)) {
          missing.push({ module: module.name, expected: `${module.name}/README.md` });
        }
        break;

      case 'nested':
        // 递归检查嵌套文档
        checkNestedDocs(module, report, wikiDir, missing);
        break;
    }
  }

  return missing;
}
```

### 5.3 生成验证报告

```markdown
# 验证报告

## 复杂度评估统计

| 等级 | 数量 | 百分比 | 策略 |
|------|------|--------|------|
| 简单 (0-30) | 15 | 45% | 单文档 |
| 中等 (30-60) | 12 | 36% | 章节拆分 |
| 复杂 (>60) | 6 | 19% | 嵌套拆分 |

## 文档覆盖率

- 总模块数: 33
- 已生成文档: 33
- 覆盖率: 100%

## 问题与建议

### 高复杂度模块（需要特别关注）

| 模块 | 复杂度 | 分数 | 建议 |
|------|--------|------|------|
| LLM调用 | 高 | 78 | 已正确拆分为嵌套文档 |
| Agent编排 | 高 | 82 | 已正确拆分为嵌套文档 |

### 潜在问题

| 模块 | 问题 | 建议 |
|------|------|------|
| 日期工具 | 复杂度低(25)但拆分了章节 | 建议合并为单文档 |
```

---

## Phase 6: 配置增强

### 6.1 新的配置选项

```yaml
# .worker/wiki/config.yaml

# 复杂度评估配置
complexity:
  # 评估指标权重（可自定义）
  weights:
    lines: 30          # 代码行数权重
    exports: 15        # 导出数量权重
    dependencies: 15   # 依赖数量权重
    subModules: 20     # 子模块权重
    complexLogic: 10   # 复杂逻辑权重
    useCases: 10       # 使用场景权重

  # 复杂度阈值（可自定义）
  thresholds:
    simple: 30         # 简单模块阈值
    medium: 60         # 中等模块阈值
    # >60 为复杂

  # 评估规则
  rules:
    # 强制单文档规则（即使复杂也强制单文档）
    forceSingle:
      - pattern: "**/utils/**"
        reason: "工具函数保持简单"
      - pattern: "**/types/**"
        reason: "类型定义保持简单"

    # 强制嵌套规则（即使简单也强制嵌套）
    forceNested:
      - pattern: "**/core/**"
        name: "核心模块"
        reason: "核心模块必须详细文档"
      - pattern: "**/framework/**"
        name: "框架模块"
        reason: "框架模块必须详细文档"

    # 忽略评估的目录
    ignore:
      - "**/*.test.ts"
      - "**/*.spec.ts"
      - "**/mocks/**"

# 文档生成配置
generation:
  # 单文档配置
  single:
    template: "simple"     # 简单模板
    maxLines: 200          # 最大行数限制

  # 章节拆分配置
  sections:
    template: "sectioned"  # 章节模板
    autoGenerate: true     # 自动根据内容生成章节
    sections:
      - "概述"
      - "API"
      - "示例"

  # 嵌套拆分配置
  nested:
    template: "hierarchical"
    maxDepth: 4            # 最大嵌套深度
    minSubModuleScore: 40  # 子模块最小复杂度才独立文档
    generateMermaid: true  # 生成架构图
    generateNav: true      # 生成导航

# 验证配置
validation:
  complexity:
    checkConsistency: true   # 检查复杂度与策略一致性
    checkDepth: true         # 检查嵌套深度
  coverage:
    minCoverage: 95          # 最小覆盖率
```

### 6.2 配置验证

```javascript
function validateConfig(config) {
  const errors = [];

  // 检查权重总和
  const totalWeight = Object.values(config.complexity.weights)
    .reduce((a, b) => a + b, 0);
  if (totalWeight !== 100) {
    errors.push(`权重总和应为100，当前为${totalWeight}`);
  }

  // 检查阈值合理性
  if (config.complexity.thresholds.simple >= config.complexity.thresholds.medium) {
    errors.push('简单阈值必须小于中等阈值');
  }

  // 检查最大深度
  if (config.generation.nested.maxDepth > 6) {
    errors.push('最大嵌套深度不应超过6');
  }

  return errors;
}
```

---

## 测试用例

### 测试用例 1: Agent 项目（混合复杂度）

**项目结构**:
```
src/
├── utils/
│   ├── date.ts          (100行, 3个函数) → 简单(25分)
│   └── format.ts        (80行, 2个函数) → 简单(20分)
├── components/
│   ├── Button.tsx       (50行) → 简单(15分)
│   └── Modal/
│       ├── index.tsx    (200行, 有hooks) → 中等(45分)
│       └── useModal.ts  (100行) → 简单(20分)
└── agent/
    └── core/
        └── llm/
            ├── index.ts (1600行, 12导出) → 复杂(78分)
            ├── call.ts  (200行) → 中等(40分)
            ├── stream.ts (300行) → 中等(50分)
            └── adapters/
                ├── openai.ts (250行) → 中等(55分)
                └── azure.ts (200行) → 中等(48分)
```

**期望输出**:
```
wiki/zh/
├── 工具函数.md                  # 简单: 合并utils所有内容
├── 组件库/
│   ├── Button.md                # 简单
│   └── Modal/                   # 中等
│       └── README.md            # 章节拆分
└── Agent核心/
    ├── README.md                # 容器
    └── LLM调用/                 # 复杂
        ├── README.md            # 容器
        ├── 基础调用.md          # 中等: 章节
        ├── 流式处理.md          # 中等: 章节
        └── 模型适配器/           # 中等复杂
            ├── README.md
            ├── OpenAI适配器.md
            └── Azure适配器.md
```

**预期复杂度评估**:

| 模块 | 预估分数 | 策略 | 原因 |
|------|---------|------|------|
| utils/date | 25 | single | 简单工具函数 |
| utils/format | 20 | single | 简单工具函数 |
| Button | 15 | single | 简单组件 |
| Modal | 45 | sections | 中等组件，有hooks |
| LLM调用整体 | 78 | nested | 复杂核心模块 |
| LLM/call | 40 | sections | 中等功能 |
| LLM/stream | 50 | sections | 中等功能 |
| LLM/adapters | 55 | sections | 中等功能集合 |

### 测试用例 2: 电商项目（中等复杂度）

**项目结构**:
```
src/
├── modules/
│   ├── user/
│   │   ├── controller.ts  (150行)
│   │   ├── service.ts     (300行, 8个方法)
│   │   ├── model.ts       (100行)
│   │   └── dto.ts         (80行, 5个类型)
│   │   → 中等 (52分)
│   └── order/
│       ├── controller.ts  (200行)
│       ├── service.ts     (400行, 12个方法)
│       ├── model.ts       (150行)
│       └── dto.ts         (120行, 8个类型)
│       → 中等 (58分)
├── shared/
│   └── utils/
│       ├── validator.ts   (80行)
│       └── formatter.ts   (60行)
│       → 简单 (22分)
└── config/
    ├── database.ts        (50行)
    └── redis.ts           (40行)
    → 简单 (18分)
```

**期望输出**:
```
wiki/zh/
├── 用户模块/                    # 中等
│   └── README.md                # 章节拆分
├── 订单模块/                    # 中等
│   └── README.md                # 章节拆分
├── 工具函数.md                  # 简单: 合并
└── 配置.md                      # 简单: 合并
```

### 测试用例 3: 框架项目（高复杂度）

**项目结构**:
```
src/
├── core/
│   ├── plugin-system/         (2000行, 复杂插件机制)
│   │   → 复杂 (85分)
│   ├── event-bus/             (800行, 事件系统)
│   │   → 复杂 (72分)
│   └── dependency-injection/  (1500行, DI容器)
│       → 复杂 (80分)
├── runtime/
│   ├── compiler/              (3000行, 编译器)
│   │   → 复杂 (92分)
│   └── renderer/              (2500行, 渲染器)
│       → 复杂 (88分)
└── utils/
    └── helpers.ts             (200行)
    → 简单 (30分)
```

**期望输出**:
```
wiki/zh/
├── 核心框架/                    # 复杂
│   ├── README.md
│   ├── 插件系统/                # 复杂
│   │   ├── README.md
│   │   ├── 插件注册.md
│   │   ├── 生命周期.md
│   │   └── 钩子机制.md
│   ├── 事件总线/                # 复杂
│   │   ├── README.md
│   │   ├── 事件订阅.md
│   │   └── 事件派发.md
│   └── 依赖注入/                # 复杂
│       └── ...
├── 运行时/                      # 复杂
│   ├── README.md
│   ├── 编译器/                  # 复杂
│   │   └── ...
│   └── 渲染器/                  # 复杂
│       └── ...
└── 工具函数.md
```

---

## 实施计划时间表

| Phase | 任务 | 预估时间 | 优先级 |
|-------|------|---------|--------|
| 1.1 | 实现复杂度评估算法 (JavaScript) | 3h | P0 |
| 1.2 | 创建 `agents/complexity-evaluator.md` | 2h | P0 |
| 2.1 | 重构 `agents/doc-generator.md` 支持策略模式 | 2h | P0 |
| 2.2 | 实现单文档生成器 | 1h | P0 |
| 2.3 | 实现章节文档生成器 | 1h | P1 |
| 2.4 | 实现嵌套文档生成器 | 2h | P0 |
| 3.1 | 更新 `agents/module-analyzer.md` 集成复杂度 | 1h | P1 |
| 4.1 | 更新主控 `SKILL.md` 新流程 | 1h | P0 |
| 5.1 | 更新配置 schema | 1h | P2 |
| 6.1 | 增强 `agents/validator.md` | 1h | P1 |
| - | 集成测试（3个测试用例） | 3h | P0 |

**总计: ~18 小时**

### 里程碑

- **M1** (Day 1-2): Phase 1 完成 - 复杂度评估可用
- **M2** (Day 3-4): Phase 2 完成 - 三种生成器可用
- **M3** (Day 5): Phase 3-6 完成 - 完整流程可用
- **M4** (Day 6): 测试完成 - 可上线

---

## 文件修改清单

### 需要修改的文件

1. `skills/wiki-generator/SKILL.md`
   - 更新执行流程，添加复杂度评估阶段
   - 更新为策略驱动的生成流程

2. `skills/wiki-generator/agents/module-clusterer.md`
   - 保持基本功能，移除深度限制
   - 输出添加 `hasSubdirs` 标记

3. `skills/wiki-generator/agents/module-analyzer.md`
   - 集成复杂度评估调用
   - 输出复杂度报告

4. `skills/wiki-generator/agents/doc-generator.md`
   - **完全重写** - 改为策略模式
   - 支持 single/sections/nested 三种策略

5. `skills/wiki-generator/agents/validator.md`
   - 添加复杂度一致性验证
   - 添加文档策略验证

### 需要创建的新文件

1. `skills/wiki-generator/agents/complexity-evaluator.md` ⭐ **核心新增**
   - 复杂度评估 Agent

2. `skills/wiki-generator/scripts/complexity-analyzer.js`
   - 复杂度评估算法实现

3. `skills/wiki-generator/scripts/doc-strategies.js`
   - 文档生成策略实现

4. `skills/wiki-generator/templates/single.md`
   - 单文档模板

5. `skills/wiki-generator/templates/sectioned.md`
   - 章节文档模板

6. `skills/wiki-generator/templates/nested-container.md`
   - 容器模块模板

7. `skills/wiki-generator/references/complexity-guide.md`
   - 复杂度评估指南

### 目录结构最终形态

```
skills/wiki-generator/
├── SKILL.md                          # 主控
├── agents/
│   ├── file-collector.md
│   ├── module-clusterer.md          # 修改
│   ├── complexity-evaluator.md      # ⭐ 新增
│   ├── module-analyzer.md           # 修改
│   ├── doc-generator.md             # 重写
│   ├── index-generator.md
│   └── validator.md                 # 修改
├── scripts/
│   ├── collect-files.js
│   ├── complexity-analyzer.js       # ⭐ 新增
│   └── doc-strategies.js            # ⭐ 新增
├── templates/                        # ⭐ 新增目录
│   ├── single.md
│   ├── sectioned.md
│   └── nested-container.md
├── references/
│   ├── templates.md
│   └── complexity-guide.md          # ⭐ 新增
└── assets/
    └── config-schema.json           # 更新
```

---

## 风险与应对

| 风险 | 影响 | 应对策略 |
|------|------|---------|
| 复杂度评估不准确 | 文档拆分不合理 | 提供配置覆盖，允许用户手动调整 |
| AI Token 消耗过大 | 成本增加 | 限制读取文件数量，使用缓存 |
| 与旧版不兼容 | 用户迁移成本 | 保持向后兼容，默认行为不变 |
| 嵌套过深难以导航 | 用户体验差 | 限制最大深度(4)，提供扁平视图 |
| 策略选择不一致 | 同一项目风格不统一 | 允许配置强制规则 |

---

## 下一步行动

1. **立即开始**: Phase 1.1 - 实现复杂度评估算法
2. **准备测试项目**: 使用 Agent 项目作为测试用例
3. **迭代开发**: 每个 Phase 完成后立即测试验证
4. **文档同步**: 同步更新所有相关文档

---

*计划完成。可以开始执行 Phase 1。*
