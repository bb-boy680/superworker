# Wiki Generator 执行流程

## Phase 1: Discovery（发现阶段）

### 目标
扫描项目，识别类型，收集所有源文件，生成分组候选。

### 步骤

```
1. 读取项目根目录的标志性文件
   - package.json → JS/TS 项目
   - pom.xml / build.gradle → Java 项目
   - requirements.txt / pyproject.toml → Python 项目
   - go.mod → Go 项目
   - Cargo.toml → Rust 项目

2. 根据项目类型，执行对应的文件匹配模式
   - 使用 Glob 获取所有匹配文件
   - 记录每个文件的：路径、大小、修改时间

3. 生成分组候选

   方式 A：按路由分组（前端项目）
   - 读取路由配置文件
   - 每个路由对应一个业务模块
   - 追踪路由使用的组件、API

   方式 B：按目录分组
   - 分析目录结构
   - 同目录下的相关文件聚类

   方式 C：按依赖关系分组
   - 分析 import 关系
   - 经常一起引用的文件聚类

4. 输出清单文件
   - 写入 .wiki-generator/manifest.json
   - 包含：项目信息、文件清单、分组候选、当前状态
```

### 输出
- `.wiki-generator/manifest.json` - 完整清单

---

## Phase 2: Analysis（分析阶段）

### 目标
读取关键文件，提取文档所需信息，确定最终分组。

### 步骤

```
1. 按模块逐个分析
   For each module in manifest.modules:

     a. 读取入口文件
        - 提取：组件/函数签名、props/参数、导出内容

     b. 读取相关组件
        - 提取：每个组件的用途、props、依赖关系

     c. 读取 API 文件
        - 提取：接口定义、请求/响应类型、错误处理

     d. 读取类型定义
        - 提取：数据模型、枚举、接口

     e. 更新模块信息
        - 添加：功能描述、依赖列表、API 列表
        - 更新状态为 analyzed

     f. 实时保存进度
        - 每完成一个模块，更新 manifest.json
        - 输出："已完成 3/12 模块分析"

2. 处理孤儿文件
   - 分析未被归入任何模块的文件
   - 尝试找到关联模块，或标记为通用工具

3. 建立依赖图
   - 记录模块间的依赖关系
   - 用于后续生成交叉引用
```

### 输出
- 更新的 manifest.json（包含详细分析结果）

---

## Phase 3: Generation（生成阶段）

### 目标
为每个模块生成专业文档。

### 步骤

```
1. 读取模块分析结果
   - 从 manifest.json 加载模块信息

2. 按模块生成文档
   For each module with status == 'analyzed':

     a. 应用文档模板
        - 根据模块类型选择模板
        - 填充：名称、描述、文件列表、API、组件

     b. 生成功能描述
        - 基于入口文件和组件分析
        - 描述该模块的核心功能

     c. 生成 API 文档
        - 列出所有 API 端点
        - 包含：方法、路径、请求参数、响应格式

     d. 生成组件文档
        - 列出所有组件
        - 包含：props、事件、使用示例

     e. 生成依赖说明
        - 内部依赖：引用其他模块
        - 外部依赖：第三方库

     f. 保存文档
        - 写入 wiki/modules/{module-name}.md
        - 更新模块状态为 documented

     g. 实时输出进度
        - "正在生成：用户管理模块文档 (4/12)"

3. 生成索引文档
   - README.md：项目概览
   - ARCHITECTURE.md：架构总览
   - MODULES.md：模块索引

4. 添加交叉引用
   - 在文档间建立链接
   - 生成依赖关系图
```

### 输出
- `wiki/` 目录及所有文档文件
- 更新的 manifest.json

---

## Phase 4: Validation（验证阶段）

### 目标
确保没有遗漏，文档完整可用。

### 步骤

```
1. 文件覆盖检查
   - 读取原始文件清单
   - 读取已生成文档引用
   - 找出未被引用的文件

2. 模块完整性检查
   For each module:
     - 检查 entry 文件是否存在
     - 检查关联文件是否存在
     - 检查生成的文档是否包含关键章节

3. 文档质量检查
   - 检查空章节
   - 检查缺失的 API 文档
   - 检查缺失的组件文档

4. 生成验证报告
   - 统计：文档覆盖率、模块完整度
   - 列出：警告、问题、建议

5. 输出结果
   - 显示验证报告
   - 如有问题，提供修复选项
```

### 输出
- `wiki/VALIDATION.md` - 验证报告

---

## 进度监控机制

### 实时输出

每完成一个步骤，立即输出：

```
[Phase 1/4 - Discovery]
✓ 检测到项目类型：React + TypeScript
✓ 发现源文件：156 个
✓ 识别路由：23 个
✓ 生成分组候选：12 个模块
✓ 清单已保存

[Phase 2/4 - Analysis]
⏳ 正在分析模块 (3/12)
  ✓ 用户管理
  ✓ 权限管理
  ⏳ 订单管理 (当前)
  ○ 商品管理
  ○ ...

[Phase 3/4 - Generation]
⏳ 正在生成文档 (7/12)
  ✓ 用户管理 → wiki/modules/user-management.md
  ✓ 权限管理 → wiki/modules/auth-management.md
  ⏳ 订单管理 (当前)
  ○ ...

[Phase 4/4 - Validation]
✓ 文档覆盖率：98% (153/156 文件)
⚠ 未文档化文件：3 个
  - src/utils/date.ts (通用工具)
  - src/utils/format.ts (通用工具)
  - src/hooks/useDebounce.ts (待确认)
```

### 状态文件

`.wiki-generator/state.json` 实时保存：

```json
{
  "currentPhase": "generation",
  "currentTask": "生成订单管理模块",
  "completedTasks": 7,
  "totalTasks": 12,
  "startedAt": "2024-01-15T10:30:00Z",
  "elapsedTime": 450,
  "estimatedRemaining": 180
}
```

---

## 防偷懒策略

### 1. 清单强制执行

```
生成文档前：
- 必须读取 manifest.json
- 必须知道 totalTasks

生成文档时：
- 每完成一个，更新 status
- 不能跳过任何一个

生成文档后：
- 对比清单，验证 complete 数量
- 检查是否还有 pending
```

### 2. 显式检查点

```
每个 Phase 结束时，必须：
- 保存 manifest.json
- 输出该 Phase 摘要
- 等待用户确认（可选）
```

### 3. 可恢复执行

```
如果中断，下次启动时：
- 读取 manifest.json
- 找到第一个 pending 的任务
- 从那里继续
```
