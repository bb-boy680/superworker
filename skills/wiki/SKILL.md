---
name: wiki
description: |-
  自动从文档、代码、设计文件和图片生成**专业级**结构化项目 Wiki。

  在以下情况下使用：
  - 用户请求"生成 wiki"、"创建文档"、"创建文档"
  - 用户请求"更新 wiki"、"重建 wiki"
  - 用户请求"列出插件"、"安装插件"、"管理插件"
  - 项目需要自动生成文档

  特性：
  - 智能项目结构和技术栈分析
  - **深度代码分析**，具备语义理解能力
  - **Mermaid 图表**，用于架构、数据流、依赖关系
  - **交叉链接的文档**网络
  - 增量更新（仅更改的文件）
  - 代码块链接到源文件
  - 多语言支持（zh/en）
  - **用于扩展的插件系统**
---

# Wiki 生成器

生成**专业级**结构化项目 Wiki 到 `.worker/wiki` 目录。

> **核心原则**：生成的文档必须 **详细、结构化、有图表、相互关联**，达到企业级技术文档标准。

---

# 脚本参考

| 脚本 | 用途 |
|------|------|
| `scripts/init-wiki.js <path>` | 初始化 wiki 工程目录 |
| `scripts/module-manager.js` | 管理模块状态 |

---

# 成员档案

| 成员               | 文件                         | 内容                            | 说明                |
| ---------------- | -------------------------- | ----------------------------- | ----------------- |
| `team-lead`      | `agents/team-lead.md`      | **主成员(team-lead)**文档          | 负责协调、监控、成员健康检查、验证 |
| `module-scanner` | `agents/module-scanner.md` | **子成员(module-scanner)**模块扫描文档 | 负责模块分解工作          |
| `wiki-generator` | `agents/wiki-generator.md` | **子成员(wiki-generator)** wiki 生成文档       | 负责生成 Wiki 文档   |

# 参考文档

| 文件                                      | 内容                                     |
| --------------------------------------- | -------------------------------------- |
| `references/monitoring-loop.md`         | 监控循环时序图和详细流程                           |
| `references/data-structures.md`         | modules.json 和 progress.json 数据结构说明    |
| `references/project-type-strategies.md` | 不同项目类型的功能扫描策略（Monorepo/前端SPA/Next.js等） |

---

# 执行步骤（必须严格顺序执行，禁止跳过）

## 步骤完成检查清单

每完成一个步骤，必须在回复中明确勾选：
```
步骤 1 完成: [ ]
步骤 2 完成: [ ]
步骤 3 完成: [ ]
步骤 4 完成: [ ]
```

**⚠️ 严禁跳过任何步骤！步骤 2 未完成前，绝对禁止执行步骤 3 或 4！**

---

## 步骤 1: 初始化检查

**本步骤允许的操作：**
- 使用 Bash 检查目录是否存在
- 使用 Read 检查关键文件是否存在
- 执行 `init-wiki.js` 脚本（仅限文件不完整时）

**本步骤禁止的操作：**
- ❌ 读取项目源码（package.json, tsconfig.json 等）
- ❌ 分析项目结构
- ❌ 生成任何文档

**执行指令：**

```bash
# 1.1 检查目录状态
ls -la .worker/wiki/ 2>/dev/null || echo "目录不存在或为空"
```

**1.2 检查关键文件是否存在：**
- `.worker/wiki/config.yaml`
- `.worker/wiki/meta/modules.json`
- `.worker/wiki/zh/文档地图.md` （仅检查存在性，不读取内容）

**1.3 处理结果：**
- 文件不完整 → 执行 `node scripts/init-wiki.js .worker` → 重新检查
- 文件完整 → **步骤 1 完成: [✓]** → 进入步骤 2

---

## 步骤 2: 模块扫描（必须使用 Agent Team）

**⚠️ 本步骤是唯一允许进行"项目分析"的步骤，且必须由子成员(module-scanner)执行！**

**主成员权限与禁止：** 详见 `agents/team-lead.md`

**执行指令：**

#### 2.1 检查 modules.json 状态
```bash
# 只允许读取 status 字段，禁止读取其他内容
cat .worker/wiki/meta/modules.json | grep '"status"'
```

**判断：**
- 如果输出 `"status": "completed"` → **步骤 2 完成: [✓]** → 进入步骤 3
- 其他情况 → 继续 2.2

#### 2.2 创建 Team
```
使用 TeamCreate 工具：
- team_name: midscene-wiki
```

#### 2.3 获取 pane ID
```bash
tmux list-panes
```
- 记录主成员 pane（通常是 %1）
- 子成员将使用新 pane（通常是 %2）

#### 2.4 召唤子成员 Agent
```
使用 Agent 工具：
- subagent_type: general-purpose
- name: module-scanner
- description: 分析工程代码语义并按功能划分模块，使用 `scripts/module-manager.js` 更新文件
- prompt: 读取 agents/module-scanner.md 文件内容作为上下文
- team_name: midscene-wiki
- model: sonnet
```

#### 2.5 【核心】主动监控循环

**监控循环详细流程：** 详见 `agents/team-lead.md` 或 `references/monitoring-loop.md`

#### 2.6 验证结果（只读）

```bash
# 只允许验证 status 字段
cat .worker/wiki/meta/modules.json | grep '"status"'
```

**判断：**
- 输出 `"status": "completed"` → **步骤 2 完成: [✓]** → 进入步骤 3
- 其他状态 → 回到 2.2 重新创建团队

---

## 步骤 3: 文件结构生成

### 3.1 强制检测

```bash
# 检测文件拆分状态
cat .worker/wiki/meta/progress.json | grep '"status"'

# 检测模块数据、主要检测 modules.json 字段 pending_modules、progress_modules 是否还存在数据
node scripts/module-manager.js validate-progress
```

条件检测：
- 检测文件拆分状态是 `completed`、`modules.json` 没有待处理模块、直接接入 **步骤 4: Wiki 文档生成**
- 否则按照当前步骤继续执行

检测结束后、更改 `progress.json` 状态为 `progress`

```bash
node scripts/progress-manager.js status "progress"
```

### 3.1 子模块拆分

执行脚本：

```bash
# 把 modules.json 合并的模块、拆分成子功能文件
node scripts/progress-manager.js split-module

node scripts/progress-manager.js status "completed"
```

---

## 步骤 4: Wiki 文档生成（必须使用 Agent Team）

**主成员权限与禁止** 详见： `agents/team-lead.md`
**子成员(wiki-generator)**详见：`agents/wiki-generator.md`

### 4.1 进度检测

```bash
# 检测模块数据、主要检测 progress.json 字段 pending_modules、progress_modules 是否还存在数据
node scripts/progress-manager.js validate-progress
```

条件检测：
- 检测文件 `progress.json` 没有待处理文档、结束
- 否则按照当前步骤继续执行

### 4.2 成员召唤

**只能同时转换一个成员、当这个成员任务结束后、在创建新的成员来生成文档**

```
使用 Agent 工具：
- subagent_type: general-purpose
- name: wiki-generator
- description: 深度阅读文档的依赖文件、并根据依赖文件生成一个符合企业级、专业级别的 wiki 文档
- prompt: 读取 agents/wiki-generator.md 文件内容作为上下文
- team_name: midscene-wiki
- model: sonnet
```

### 4.3 结果验证

等待 `wiki-generator` 成员反馈、如果审核成功、关闭当前运行的成员 `wiki-generator`、并回到 **4.1 进度检测**

---
