# 分层深度检索策略 (Layered Discovery Strategy)

本文档定义了 wiki-generator skill 的三层递进式文件扫描架构，用于从代码库中智能发现和组织模块。

---

## 第一章：Level 1 - 全量路径索引

### 目标
收集项目中所有源文件的完整路径列表，建立项目文件索引。

### 执行流程

#### 1.1 使用 Glob 收集所有匹配文件路径

不读取内容，仅收集文件路径：

```javascript
const allFiles = [
  ...await Glob("src/**/*.{ts,tsx}"),
  ...await Glob("src/**/*.{js,jsx}"),
  ...await Glob("scripts/**/*.ts")
];
```

#### 1.2 解析路径元数据

为每个文件提取结构化元数据：

```javascript
const fileIndex = allFiles.map(path => ({
  path,
  dir: dirname(path),
  name: basename(path, extname(path)),
  ext: extname(path),
  depth: path.split('/').length
}));
```

#### 1.3 生成目录树结构

```javascript
function buildDirectoryTree(fileIndex) {
  const tree = {};

  for (const file of fileIndex) {
    const parts = file.path.split('/');
    let current = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;

      if (isFile) {
        if (!current.__files) current.__files = [];
        current.__files.push(part);
      } else {
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    }
  }

  return tree;
}

const dirTree = buildDirectoryTree(fileIndex);
// { "src": { "components": { "Button": { "__files": ["index.tsx", "style.css"] } } } }
```

### 输出

| 输出项 | 类型 | 描述 |
|--------|------|------|
| `index.files` | `string[]` | 完整文件路径列表 |
| `index.tree` | `object` | 目录树结构 |
| `index.stats` | `object` | 文件统计（按扩展名、深度分布） |

---

## 第二章：Level 2 - 智能模块识别

### 目标
基于 Level 1 的索引，使用 AI 识别模块边界和入口点。

### 执行流程

#### 2.1 AI 分析目录树语义

- **输入**: 目录树 JSON + 文件路径列表
- **AI 任务**: 识别哪些目录是业务模块、哪些是共享组件
- **输出**: 候选模块列表（名称、路径、类型）

#### 2.2 识别入口文件

对每个候选模块，查找入口：

| 优先级 | 入口文件模式 | 示例 |
|--------|-------------|------|
| 1 | `index.ts` / `index.tsx` | `src/components/Button/index.tsx` |
| 2 | `main.ts` / `main.tsx` | `src/modules/User/main.ts` |
| 3 | `{ModuleName}.tsx` | `src/components/Button/Button.tsx` |

#### 2.3 读取入口文件验证

仅读取候选模块的入口文件（控制 Token 消耗）：

- 验证模块功能描述
- 提取导出内容（组件、函数、类型）
- 提取 import 依赖

### 输出

| 输出项 | 类型 | 描述 |
|--------|------|------|
| `modules.candidates` | `ModuleCandidate[]` | 候选模块列表（含入口文件） |
| `modules.confirmed` | `Module[]` | 已验证模块列表 |
| `modules.orphanFiles` | `string[]` | 未归类文件 |

---

## 第三章：Level 3 - 深度依赖分析

### 目标
对确认模块进行深入分析，提取完整依赖关系和文档所需信息。

### 执行流程

#### 3.1 递归读取模块依赖

- 从入口文件的 import 开始
- 递归读取直接依赖（设置深度限制，如 3 层）
- 记录文件间依赖图

```javascript
function extractDependencies(entryFile, maxDepth = 3, currentDepth = 0) {
  if (currentDepth >= maxDepth) return [];

  const imports = parseImports(entryFile);
  const deps = [];

  for (const imp of imports) {
    if (isInternalImport(imp)) {
      const resolved = resolveImportPath(imp);
      deps.push(resolved);
      deps.push(...extractDependencies(resolved, maxDepth, currentDepth + 1));
    }
  }

  return deps;
}
```

#### 3.2 提取文档元数据

| 类型 | 提取内容 |
|------|----------|
| 组件 | Props、Events、Slots |
| API | 方法、参数、返回值 |
| 类型 | 接口、枚举、类型别名 |
| 注释 | JSDoc/TSDoc |

#### 3.3 识别外部依赖

- 第三方库引用
- 内部其他模块引用
- 全局变量/类型

### 输出

| 输出项 | 类型 | 描述 |
|--------|------|------|
| `module.dependencies` | `DependencyGraph` | 完整依赖图 |
| `module.exports` | `ExportInfo[]` | 导出内容详情 |
| `module.docs` | `DocMetadata` | 文档元数据 |

---

## 第四章：分层聚合算法

### 算法流程

```
Input: fileIndex (Level 1 输出)
Output: modules (完整模块列表)

// Step 1: 语义聚类 (AI)
candidates = AI_ClusterBySemantic(fileIndex)
// -> [{ name: "用户管理", paths: ["src/pages/User/**", "src/api/user.ts"] }]

// Step 2: 入口确认
for each candidate:
  entry = FindEntryFile(candidate.paths)
  if entry exists:
    content = Read(entry)
    analysis = AI_AnalyzeEntry(content)
    candidate.entry = entry
    candidate.analysis = analysis
    candidate.confirmed = true

// Step 3: 依赖扩展
for each confirmed module:
  deps = ExtractImports(module.entry.content)
  related = FindRelatedFiles(deps, fileIndex)
  module.files = Merge(candidate.paths, related)

// Step 4: 冲突解决
if a file belongs to multiple modules:
  // 优先保留在业务模块而非共享模块
  // 优先保留在当前目录而非父目录
  ResolveConflict(file, modules)

// Step 5: 孤儿处理
orphan = fileIndex - all(module.files)
orphanModules = GroupOrphanByDirectory(orphan)
modules = modules + orphanModules
```

### 冲突解决优先级

1. **业务模块优先**: 共享组件 vs 业务模块冲突时，优先归属业务模块
2. **最近目录优先**: 优先归属到更具体的子目录而非父目录
3. **入口文件归属**: 入口文件所在目录决定模块归属

---

## 第五章：质量保障机制

### 覆盖率检查

| 检查项 | 要求 |
|--------|------|
| Level 1 输出 | 必须包含所有匹配文件 |
| Level 3 输出 | 必须覆盖所有已确认模块 |
| 最终模块 | 模块文件 + 孤儿文件 = 全量 |

### 一致性检查

- 检查模块间依赖是否存在循环
- 检查文件是否被多个模块引用（冲突）
- 检查入口文件是否可读、可解析

### 降级策略

| 失败场景 | 降级方案 |
|----------|----------|
| AI 聚类失败 | 回退到目录分组 |
| 入口文件读取失败 | 标记为待人工确认 |
| 依赖解析失败 | 仅记录入口文件信息 |

---

## 第六章：Token 消耗优化

### 分层控制原则

| 层级 | Token 策略 | 说明 |
|------|-----------|------|
| Level 1 | 零 Token | 只收集路径，不读取文件内容 |
| Level 2 | 控制读取 | 只读取入口文件，控制每个模块的 Token 消耗 |
| Level 3 | 按需递归 | 设置最大深度限制（建议 3 层） |

### 估算公式

```
总 Token ≈ Level2(入口文件数 × 平均入口大小) + Level3(核心依赖文件数 × 平均文件大小)
```

### 优化技巧

| 技巧 | 实现方式 |
|------|----------|
| 优先读取小文件 | 筛选 `< 500 行` 的文件优先处理 |
| 大文件截断 | `> 1000 行` 只读取前 100 行（接口定义部分） |
| 关键信息提取 | 使用 Grep 提取 `export`、`interface` 而非全文读取 |

### Token 预算分配建议

| 项目规模 | 建议 Token 预算 | Level 3 深度 |
|----------|----------------|--------------|
| 小型 (< 50 文件) | 50K | 3 层 |
| 中型 (50-200 文件) | 100K | 2-3 层 |
| 大型 (200-500 文件) | 200K | 2 层 |
| 超大型 (> 500 文件) | 按需分层 | 1-2 层 |

---

## 附录：数据结构定义

```typescript
interface FileIndex {
  path: string;
  dir: string;
  name: string;
  ext: string;
  depth: number;
}

interface ModuleCandidate {
  name: string;
  paths: string[];
  type: 'business' | 'shared' | 'utility';
  entry?: string;
  confirmed: boolean;
}

interface Module extends ModuleCandidate {
  analysis: EntryAnalysis;
  files: string[];
  dependencies: DependencyGraph;
  exports: ExportInfo[];
  docs: DocMetadata;
}

interface EntryAnalysis {
  description: string;
  exports: ExportInfo[];
  imports: ImportInfo[];
  complexity: number;
}

interface ExportInfo {
  name: string;
  type: 'component' | 'function' | 'class' | 'interface' | 'type' | 'const';
  signature?: string;
  jsdoc?: string;
}

interface ImportInfo {
  source: string;
  specifiers: string[];
  isDefault: boolean;
  isNamespace: boolean;
}

interface DocMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  author?: string;
  since?: string;
  examples?: string[];
  seeAlso?: string[];
}

interface DependencyGraph {
  nodes: string[];      // 文件路径
  edges: [string, string][];  // [from, to]
}
```
