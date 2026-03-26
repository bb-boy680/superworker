# 模块拆分与合并（两步扫描）

> **AI 执行指南**：按功能语义（而非目录结构）识别和合并模块的两步扫描策略。
> 适用于任何项目类型：前端、后端、Python、Go、Rust、AI/ML、Monorepo 等。

---

# 核心原则（必须遵守）

| 类型       | 规则                         |
| -------- | -------------------------- |
| ❌ **禁止** | 未分析代码语义就生成模块               |
| ✅ **必须** | 读取代码内容（exports/imports/注释） |
| ✅ **必须** | 按功能语义聚类，允许跨目录              |
| ✅ **必须** | 分析每个包内部的功能边界               |
| ✅ **必须** | 生成模块前完成功能聚类检查清单            |

---

# 参考文档

| 文件                                     | 内容                  |
| -------------------------------------- | ------------------- |
| `references/data-structures/module.md` | modules.json 数据结构说明 |
| `references/powers/frontend-module.md` | 前端项目专项扫描策略（如有）      |

---

# 相关依赖文件

| 文件                                              | 用途                  |
| ----------------------------------------------- | ------------------- |
| `.worker/wiki/temp/all_source_files.txt`        | 所有源代码文件列表（相对路径，已排序） |
| `.worker/wiki/temp/all_source_files-by-dir.txt` | 各目录文件数量统计           |

---

# Phase 1: 初步模块解析

## 目标

基于 `all_source_files.txt` 识别细粒度功能模块（基于代码语义，非目录结构）。

## 执行步骤

### 步骤 1: 读取源代码文件列表

**必须首先读取以下文件：**

```bash
# 所有源代码文件列表（已排序）
.worker/wiki/temp/all_source_files.txt

# 各目录文件数量统计
.worker/wiki/temp/all_source_files-by-dir.txt
```

**读取后分析：**
- 总文件数
- 文件类型分布（.ts, .tsx, .vue, .py 等）
- 目录结构层级
- 主要源码目录位置

### 步骤 2: 项目类型判断

根据文件列表特征判断项目类型：

| 判断依据                                       | 项目类型       |
| ------------------------------------------ | ---------- |
| 存在 `.tsx`, `.jsx`, `.vue`, `pages/`, `components/` | 前端项目       |
| 存在 `.py`, `__init__.py`                      | Python 项目  |
| 存在 `.go`, `go.mod`                           | Go 项目      |
| 存在 `.rs`, `Cargo.toml`                       | Rust 项目    |
| 存在 `.java`, `pom.xml`, `build.gradle`        | Java 项目    |
| 存在 `packages/`, `apps/`, `apps/web` 等多目录    | Monorepo   |

### 步骤 3: 按项目类型执行专项扫描

**如果是前端项目：**
→ **读取** `references/powers/frontend-module.md`
→ **按照前端专项策略进行模块划分**

**如果是其他类型项目：**
→ 按照通用策略进行模块划分（见下方）

### 步骤 4: 智能化模块划分（通用策略）

当没有专项策略时，使用通用划分方法：

#### 4.1 分析目录语义

查看 `all_source_files-by-dir.txt`，识别：
- **主要源码目录**（文件数 > 10）
- **功能目录**（命名暗示功能，如 user/, order/, auth/）
- **共享目录**（utils/, common/, shared/）
- **配置/类型目录**（types/, interfaces/, config/）

#### 4.2 代码语义分析

**选取代表性文件进行分析**，提取：

```
- imports/requires: 依赖了哪些模块/包
- exports: 导出了什么（函数、类、组件、对象）
- 注释/JSDoc: 功能描述
- 文件命名: 是否暗示功能（userService, authMiddleware）
```

#### 4.3 功能聚类

基于分析结果，按以下维度聚类：

| 聚类维度 | 示例 |
|---------|------|
| 业务领域 | user/, auth/, order/ → 用户域、认证域、订单域 |
| 技术层次 | components/, services/, utils/ → UI层、服务层、工具层 |
| 功能语义 | 文件命名、导出内容相似 → 同一模块 |
| 依赖关系 | 相互 import 的文件 → 可能同属一个模块 |

#### 4.4 识别细粒度模块

**模块识别原则：**
- 单一职责，功能聚焦
- 3-10 个相关文件
- 有明确的边界（通过 exports 界定）
- 可跨目录聚合（功能相关的不同目录）

**生成模块列表（草稿）：**
```
模块 1: 用户认证
- paths: ["src/auth/login.ts", "src/auth/register.ts", "src/middleware/auth.ts"]
- 描述: 用户登录、注册、认证中间件
- type: feature

模块 2: 工具函数
- paths: ["src/utils/date.ts", "src/utils/format.ts"]
- 描述: 日期格式化、数据格式化工具
- type: shared
```

### 步骤 5: 录入模块到 modules.json

使用脚本录入识别的模块：

```bash
# 逐个添加
node scripts/module-manager.js add-module "模块名称" '["path1","path2"]' "功能描述" "feature"

# 示例
node scripts/module-manager.js add-module "用户认证" '["src/auth/login.ts","src/auth/register.ts"]' "用户登录注册功能" "feature"
node scripts/module-manager.js add-module "工具函数" '["src/utils/date.ts","src/utils/format.ts"]' "日期和数据格式化工具" "shared"
```

**录入检查清单：**
- [ ] 每个模块名称准确反映功能
- [ ] paths 包含该模块所有相关文件
- [ ] 描述清晰说明模块用途
- [ ] module_type 分类正确（feature/shared/core）
- [ ] 没有遗漏重要文件
- [ ] 没有重复模块

### 步骤 6: 更新 Phase 1 完成状态

全部录入完成后：

```bash
node scripts/module-manager.js status phase1_completed
```

**Phase 1 完成标准：**
- modules 数组中包含所有识别的细粒度模块
- 每个模块有正确的 id, name, paths, description, module_type
- status 设置为 phase1_completed

---

# Phase 2: 智能模块合并

## 目标

将 Phase 1 的细粒度模块合并为功能域大模块。

## 合并原则

**为什么要合并？**
- 细粒度模块过多，难以管理
- 需要高层次视角理解项目
- 生成 wiki 文档时按大模块组织

**合并依据：**
1. **业务领域** - 同一业务概念的模块
2. **技术层次** - 同一技术层次的模块
3. **依赖关系** - 相互依赖的模块
4. **端到端流程** - 共同完成一个流程的模块

## 执行步骤

### 步骤 1: 分析模块关系

查看 Phase 1 的所有模块：

```bash
node scripts/module-manager.js list-modules
```

**分析维度：**

1. **命名相似性**
   - userLogin, userProfile, userSettings → 可能同属"用户模块"

2. **路径相近性**
   - src/pages/user/, src/services/userApi.ts → 用户相关

3. **功能互补性**
   - Button 组件 + Modal 组件 → 可能同属"UI组件"

4. **业务关联性**
   - OrderList + OrderDetail + OrderPayment → 订单业务域

### 步骤 2: 确定合并策略

**策略 A: 按业务域合并（推荐）**

适用于大多数项目：
- 用户域：用户认证 + 用户资料 + 用户设置
- 订单域：订单列表 + 订单详情 + 支付
- 内容域：文章 + 评论 + 标签

**策略 B: 按技术层次合并**

适用于技术密集型项目：
- UI 层：所有组件
- 服务层：所有 API 服务
- 数据层：所有模型定义

**策略 C: 混合策略**

大型项目采用：
- 核心业务按业务域（用户、订单）
- 基础设施按技术层（组件库、工具函数）

### 步骤 3: 创建合并候选

对于每个要合并的模块组，创建合并候选：

```bash
node scripts/module-manager.js add-merge "合并后模块名" '["uuid-1","uuid-2","uuid-3"]' "功能域描述" '["path1","path2"]'
```

**参数说明：**
- `source_module_ids`: Phase 1 模块的 UUID 数组（必须）
- `depend_paths`: 合并后的文件路径（用于 wiki 生成）

### 步骤 4: 处理合并流程

逐个处理合并候选：

```bash
# 1. 获取下一个待合并模块
node scripts/module-manager.js next-merge

# 2. 开始处理（从 pending 移到 progress）
node scripts/module-manager.js start-merge <merge-uuid>

# 3. 【AI 执行】生成该模块的 wiki 文档

# 4. 完成合并（从 progress 移到 completed）
node scripts/module-manager.js complete-merge <merge-uuid>
```

### 步骤 5: 验证合并结果

检查合并是否合理：

```bash
node scripts/module-manager.js list-merge
node scripts/module-manager.js stats
```

**验证清单：**
- [ ] 合并后的模块粒度适中（3-10 个细粒度模块合并）
- [ ] 没有遗漏重要模块
- [ ] 合并后的模块有明确的功能边界
- [ ] completed 数量符合预期

### 步骤 6: 更新状态

全部完成后：

```bash
node scripts/module-manager.js status completed
```

---

# 脚本参考

## Phase 1: 初步模块解析

```bash
# 添加细粒度模块（扫描结果录入）
node scripts/module-manager.js add-module "模块名" '["path1","path2"]' "描述" "feature"

# 批量添加模块（JSON 格式）
node scripts/module-manager.js batch-add < modules.json

# 查看所有 Phase 1 模块
node scripts/module-manager.js list-modules

# 更新模块
node scripts/module-manager.js update-module <id> <field> <value>

# 删除模块
node scripts/module-manager.js delete-module <id>
```

## Phase 2: 智能模块合并

```bash
# 添加合并候选模块
node scripts/module-manager.js add-merge "AI核心引擎" '["uuid-1","uuid-2"]' "AI核心功能合并" '["packages/core/ai"]'

# 获取下一个待合并模块
node scripts/module-manager.js next-merge

# 开始处理合并模块
node scripts/module-manager.js start-merge <merge-uuid>

# 完成合并模块
node scripts/module-manager.js complete-merge <merge-uuid>

# 查看所有合并模块状态
node scripts/module-manager.js list-merge

# 更新合并模块
node scripts/module-manager.js update-merge <id> <field> <value>
```

## 全局状态管理

```bash
# 设置扫描阶段状态
node scripts/module-manager.js status pending           # 初始状态
node scripts/module-manager.js status phase1_completed  # Phase 1 完成
node scripts/module-manager.js status phase2_progress   # Phase 2 进行中
node scripts/module-manager.js status completed         # 全部完成

# 查看统计信息
node scripts/module-manager.js stats

# 验证数据完整性
node scripts/module-manager.js validate

# 导出/导入
node scripts/module-manager.js export [file]
node scripts/module-manager.js import <file>
```

---

# 常见问题

## Q1: 如何判断模块粒度？

**太细的标志：**
- 一个模块只包含 1-2 个文件
- 模块名是技术术语而非功能（如 "utils"）

**太粗的标志：**
- 一个模块包含 >20 个文件
- 模块名过于笼统（如 "核心业务"）

**合适的粒度：**
- 3-10 个相关文件
- 单一职责，功能聚焦

## Q2: 如何处理跨目录的功能？

允许跨目录聚合，例如：
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

## Q3: 共享代码如何处理？

共享代码单独作为 `shared` 类型模块：
- `utils/` → "工具函数"
- `components/common/` → "通用组件"
- `types/` → "类型定义"

## Q4: 如何处理边界模糊的模块？

当不确定时：
1. 先作为独立模块录入 Phase 1
2. Phase 2 时根据依赖关系决定是否合并
3. 如果与其他模块强耦合 → 合并
4. 如果相对独立 → 保持独立

---

# 完整执行流程示例

```bash
# ===== Phase 1: 初步模块解析 =====

# 1. 收集源代码
node scripts/collect-source.js

# 2. AI 分析 all_source_files.txt，识别细粒度模块

# 3. 录入识别的模块
node scripts/module-manager.js add-module "用户认证" '["src/auth/login.ts","src/auth/register.ts"]' "用户登录注册功能" "feature"
node scripts/module-manager.js add-module "用户资料" '["src/user/profile.ts"]' "用户个人资料管理" "feature"
# ... 继续录入其他模块

# 4. Phase 1 完成
node scripts/module-manager.js status phase1_completed

# ===== Phase 2: 智能模块合并 =====

# 5. 添加合并候选
node scripts/module-manager.js add-merge "用户系统" '["uuid-1","uuid-2"]' "包含用户认证和资料管理" '["src/auth","src/user"]'

# 6. 逐个处理
node scripts/module-manager.js next-merge
node scripts/module-manager.js start-merge <uuid>
# 【AI 生成 wiki 文档】
node scripts/module-manager.js complete-merge <uuid>

# 7. 全部完成
node scripts/module-manager.js status completed
```
