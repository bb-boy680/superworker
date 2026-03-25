# AI 语义聚类策略

本文档定义如何使用 AI 基于文件路径语义进行智能模块聚类，配合 `layered-discovery.md` 中的 Level 2 使用。

---

## Step 1: AI 聚类 Prompt 模板

### System Prompt

```
你是一个代码库架构分析专家。你的任务是基于文件路径识别项目的模块边界。

输入：项目文件路径列表（JSON 格式）
输出：模块列表（JSON 格式）

规则：
1. 识别业务模块（如用户管理、订单系统）
2. 识别共享模块（如组件库、工具函数）
3. 识别配置文件和入口文件
4. 每个模块应包含相关文件路径
5. 不要遗漏任何文件
```

### User Prompt 模板

```
基于以下项目文件路径，识别模块边界：

文件列表：
{{fileList}}

请输出模块结构：
{
  "modules": [
    {
      "name": "模块名称（中文）",
      "type": "business|shared|config|entry",
      "paths": ["匹配的文件路径模式"],
      "reason": "为什么这些文件属于同一模块"
    }
  ],
  "shared": [
    {
      "name": "共享模块名称",
      "paths": ["共享文件路径"]
    }
  ]
}
```

---

## Step 2: 聚类后处理逻辑

### 处理 AI 输出的步骤

1. **验证每个模块至少有一个匹配文件**
   - 检查模块的 `paths` 是否对应实际存在的文件
   - 空模块需要标记警告

2. **展开通配符路径为具体文件**
   - 将 `src/components/**/*.tsx` 展开为具体文件列表
   - 支持 glob 模式匹配

3. **检查文件覆盖完整性（是否有遗漏）**
   - 对比输入文件列表与模块覆盖的文件
   - 识别未被任何模块包含的文件

4. **检查模块重叠（同一文件属于多个模块）**
   - 检测文件被多个模块引用的情况
   - 记录冲突供后续解决

### 冲突解决策略

```javascript
// 文件冲突解决优先级
const priority = {
  'business': 3,    // 业务模块优先级最高
  'shared': 2,      // 共享模块次之
  'config': 1,      // 配置最低
  'entry': 2
};

// 解决重叠：保留高优先级模块的文件归属
function resolveConflicts(modules) {
  const fileToModule = new Map();

  // 按优先级排序
  const sorted = modules.sort((a, b) => priority[b.type] - priority[a.type]);

  for (const module of sorted) {
    for (const file of module.files) {
      if (!fileToModule.has(file)) {
        fileToModule.set(file, module.id);
      } else {
        // 记录冲突但保留高优先级
        module.conflicts = module.conflicts || [];
        module.conflicts.push({ file, otherModule: fileToModule.get(file) });
      }
    }
  }

  return fileToModule;
}
```

---

## Step 3: AI 聚类示例

### 输入示例

一个典型前端项目的文件列表：

```json
[
  "src/main.tsx",
  "src/App.tsx",
  "src/components/Button.tsx",
  "src/components/Input.tsx",
  "src/components/Modal.tsx",
  "src/pages/User/List.tsx",
  "src/pages/User/Detail.tsx",
  "src/pages/User/Edit.tsx",
  "src/pages/Order/List.tsx",
  "src/pages/Order/Detail.tsx",
  "src/utils/format.ts",
  "src/utils/validate.ts",
  "src/hooks/useAuth.ts",
  "src/hooks/useUser.ts",
  "src/services/userApi.ts",
  "src/services/orderApi.ts",
  "src/store/index.ts",
  "src/store/userSlice.ts",
  "src/store/orderSlice.ts",
  "src/types/user.ts",
  "src/types/order.ts",
  "vite.config.ts",
  "tsconfig.json",
  "package.json"
]
```

### 输出示例

AI 识别出的模块结构：

```json
{
  "modules": [
    {
      "name": "用户管理模块",
      "type": "business",
      "paths": [
        "src/pages/User/**",
        "src/services/userApi.ts",
        "src/store/userSlice.ts",
        "src/types/user.ts",
        "src/hooks/useUser.ts"
      ],
      "reason": "包含用户相关的页面、API、状态管理和类型定义"
    },
    {
      "name": "订单管理模块",
      "type": "business",
      "paths": [
        "src/pages/Order/**",
        "src/services/orderApi.ts",
        "src/store/orderSlice.ts",
        "src/types/order.ts"
      ],
      "reason": "包含订单相关的页面、API、状态管理和类型定义"
    },
    {
      "name": "入口模块",
      "type": "entry",
      "paths": [
        "src/main.tsx",
        "src/App.tsx"
      ],
      "reason": "应用入口和根组件"
    },
    {
      "name": "配置模块",
      "type": "config",
      "paths": [
        "vite.config.ts",
        "tsconfig.json",
        "package.json"
      ],
      "reason": "项目配置文件"
    }
  ],
  "shared": [
    {
      "name": "UI组件库",
      "paths": [
        "src/components/Button.tsx",
        "src/components/Input.tsx",
        "src/components/Modal.tsx"
      ]
    },
    {
      "name": "工具函数",
      "paths": [
        "src/utils/format.ts",
        "src/utils/validate.ts"
      ]
    },
    {
      "name": "通用Hooks",
      "paths": [
        "src/hooks/useAuth.ts"
      ]
    },
    {
      "name": "状态管理核心",
      "paths": [
        "src/store/index.ts"
      ]
    }
  ]
}
```

### 处理流程示例

展示从 AI 输出到最终模块确认的完整流程：

#### 1. 输入准备

```javascript
// 收集项目文件
const fileList = await collectFiles(projectRoot, {
  exclude: ['node_modules', '.git', 'dist', 'build']
});

// 构建 Prompt
const prompt = buildClusteringPrompt(fileList);
```

#### 2. AI 聚类调用

```javascript
const response = await ai.chat.completions.create({
  model: 'claude-sonnet-4-20250514',
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt }
  ],
  response_format: { type: 'json_object' }
});

const clusteringResult = JSON.parse(response.choices[0].message.content);
```

#### 3. 后处理验证

```javascript
// 展开通配符并验证
const processedModules = clusteringResult.modules.map(module => ({
  ...module,
  files: expandGlobPatterns(module.paths, fileList)
}));

// 检查覆盖完整性
const coveredFiles = new Set(
  processedModules.flatMap(m => m.files)
);
const uncoveredFiles = fileList.filter(f => !coveredFiles.has(f));

if (uncoveredFiles.length > 0) {
  console.warn('未覆盖的文件:', uncoveredFiles);
}

// 解决冲突
const fileToModule = resolveConflicts(processedModules);
```

#### 4. 输出最终模块定义

```javascript
const finalModules = processedModules.map(module => ({
  id: generateId(module.name),
  name: module.name,
  type: module.type,
  files: module.files.filter(f => fileToModule.get(f) === module.id),
  conflicts: module.conflicts || [],
  metadata: {
    reason: module.reason,
    fileCount: module.files.length
  }
}));

// 保存模块定义
await fs.writeFile(
  'modules.json',
  JSON.stringify(finalModules, null, 2)
);
```

---

## 与 Layered Discovery 的集成

AI 语义聚类作为 Level 2 的实现策略：

```
Level 1 (Basic): 文件列表 → Level 2 (AI Clustering): 语义聚类 → Level 3 (Deep): 模块内分析
        ↑___________________________________________↓
                        聚类结果指导深度分析
```

在 `layered-discovery.md` 中，当用户选择 Level 2 时，将使用本文档定义的 AI 聚类策略进行模块边界识别。
