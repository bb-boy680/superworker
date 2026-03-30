# prompts-creator Skill 优化计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 使 prompts-creator skill 与 prompts 目录中的原始总结文档完全一致

**Architecture:** 逐文件修复，确保 skill.md、quality-reviewer.md、review-template.md 三个核心文件与原始总结的原则、公式、权重、流程保持一致

**Tech Stack:** Markdown 文件编辑

**审核要求：每个任务完成后暂停，等待用户审核确认后再继续下一个任务。**

---

## 差异总结（来自对比分析）

| 差异 | 严重程度 | 原文要求 | skill 当前状态 |
|------|----------|----------|----------------|
| description 编写要点 | **高** | description 必须包含核心规则 | skill.md 说"只写触发条件" |
| 权重分配 | **高** | 解释原因⭐⭐⭐ 最高 | quality-reviewer 设第一层25%最高 |
| 优化流程 | **中** | 有完整诊断→优化→验证流程 | skill 中缺失 |
| 公式解释 | **中** | 乘法=缺一失效，加法=兜底 | 无解释 |
| 评分表述 | **低** | 应为"总分10分，各占50%" | 说"三层满分8.5分"有歧义 |

---

## 文件结构

**修改文件：**
- `.claude/skills/prompts-creator/skill.md` - 主 skill 文件
- `.claude/skills/prompts-creator/agents/quality-reviewer.md` - 评审 agent
- `.claude/skills/prompts-creator/assets/review-template.md` - 评审模板

---

### Task 1: 修复 skill.md - description 编写要点

**Files:**
- Modify: `.claude/skills/prompts-creator/skill.md:108-116`

**原文依据：** 《Skill与普通提示词的区别》第127行：`description 必须包含核心规则（最重要的一条约束）`

**当前错误内容：**
```markdown
### description 编写要点

**只写触发条件，不写流程总结。**

```yaml
# ✅ 正确
description: Use when debugging code, locating bugs via logging traces

# ❌ 错误：包含流程总结
description: |
  代码调试，埋点定位修复 bug。
  核心规则：前端 HTTP fetch，后端文件写入。
```
```

- [ ] **Step 1: 删除错误示例**

删除 skill.md 第108-116行的整个 `description 编写要点` 小节。

- [ ] **Step 2: 写入正确内容**

在原位置写入：

```markdown
### description 编写要点

**必须包含核心规则。**（这是 Skill 最重要的约束）

```yaml
# ✅ 正确：包含触发条件 + 核心规则
description: |
  代码调试助手，通过"埋点 → 分析修复 → 清理"定位并修复 bug。
  埋点规则：前端用 HTTP fetch，后端用文件写入，不用 console.log。

# ❌ 错误：只有触发条件，无核心规则
description: Use when debugging code
```

**为什么**：description 在系统提示中始终可见，是对抗注意力稀释的唯一兜底。核心规则放这里，即使提示词被压缩也不会丢失。
```

- [ ] **Step 3: 验证修改**

读取 skill.md，确认第五节 `description 编写要点` 内容与原文一致。

- [ ] **Step 4: 暂停审核**

**等待用户审核确认后继续 Task 2。**

---

### Task 2: 修复 skill.md - 添加优化流程

**Files:**
- Modify: `.claude/skills/prompts-creator/skill.md`（在第六节后插入新节）

**原文依据：** 《提示词优化指南》第301-347行：完整优化流程（诊断→应用→精简→测试→验证）

- [ ] **Step 1: 定位插入点**

在 skill.md 的 `## 六、常见错误` 后面，插入新的 `## 七、优化流程`。

- [ ] **Step 2: 写入优化流程**

```markdown
## 七、优化流程

### 标准优化步骤

```
诊断问题 → 应用原则 → 精简内容 → 测试验证
```

### 诊断阶段

| 检查项 | 操作 |
|--------|------|
| 识别重复内容 | 同一配置出现几次？ |
| 统计强调词数量 | "必须""严禁"出现几次？ |
| 检查负面指令占比 | "禁止"占比多少？ |
| 检查结构是否清晰 | 能否画成流程图？ |

### 优化阶段

| 检查项 | 操作 |
|--------|------|
| 核心规则放入第一层 | description 是否有核心规则？ |
| 完整配置只在开头定义 | 定义一次还是多次？ |
| 关键规则在每个使用点提醒 | 有渐进提示吗？ |
| 正面指令替代负面指令 | "禁止X"改成"使用Y"？ |
| 解释"为什么" | 有原因解释吗？ |
| 结构替代强调 | 有流程图/列表吗？ |

### 验证阶段

| 检查项 | 操作 |
|--------|------|
| 多轮对话测试 | 5+回合后规则仍有效？ |
| 边界情况测试 | 模型能正确判断？ |
| 行数对比 | 优化后是否精简？ |
```

- [ ] **Step 3: 更新后续章节编号**

将原来的 `## 七、质量检测` 改为 `## 八、质量检测`。
将原来的 `## 八、心法` 改为 `## 九、心法`。

- [ ] **Step 4: 验证修改**

读取 skill.md，确认第七节优化流程内容完整，后续章节编号正确。

- [ ] **Step 5: 暂停审核**

**等待用户审核确认后继续 Task 3。**

---

### Task 3: 修复 skill.md - 添加公式解释

**Files:**
- Modify: `.claude/skills/prompts-creator/skill.md:18-25`

**原文依据：** 《Skill与普通提示词的区别》第139-151行：公式含义解释

- [ ] **Step 1: 定位公式位置**

找到 skill.md 第18-25行的核心公式区域。

- [ ] **Step 2: 在公式后添加解释**

在现有公式下方添加：

```markdown
**公式含义**：

- **乘法**：三者缺一则失效。例如"解释原因 × 正面指令 × 渐进提示"，如果缺少渐进提示，普通提示词效果会大幅下降。
- **加法**：兜底保护。例如"正面指令 + description兜底"，即使正面指令较弱，description 仍然能保护核心规则不丢失。
```

- [ ] **Step 3: 验证修改**

读取 skill.md，确认公式区域包含解释内容。

- [ ] **Step 4: 暂停审核**

**等待用户审核确认后继续 Task 4。**

---

### Task 4: 修复 quality-reviewer.md - 权重分配

**Files:**
- Modify: `.claude/skills/prompts-creator/agents/quality-reviewer.md`

**原文依据：** 《Skill与普通提示词的区别》第24-28行：重要性排序（解释原因⭐⭐⭐ 最高）

- [ ] **Step 1: 定位权重分配区域**

找到 `## 五、评分计算` 章节。

- [ ] **Step 2: 更新权重分配说明**

将权重分配改为：

```markdown
### 权重分配

**Skill**：
```
总分 = 三层防御(50%) + 六大原则(50%)

三层防御 = 第一层(20%) + 第二层(15%) + 第三层(15%)
六大原则 = 相信智能(8%) + 结构(5%) + 渐进(5%) + 解释(20%) + 正面(15%) + 清理(7%)
```

**普通提示词**：
```
总分 = 第二层(15%) + 第三层(20%) + 六大原则(65%)

# 无 description，解释原因和正面指令权重提高
六大原则 = 相信智能(8%) + 结构(5%) + 渐进(15%) + 解释(20%) + 正面(15%) + 清理(7%)
```

**权重依据**：原文明确指出"解释原因"和"正面指令"重要性最高（⭐⭐⭐），因此解释原因权重设为 20%（最高），正面指令设为 15%（次高）。
```

- [ ] **Step 3: 更新 Skill 评分公式**

```markdown
### 评分公式

**Skill（满分 10 分）**：
```
总分 = 第一层得分 × 0.20
     + 第二层得分 × 0.15
     + 第三层得分 × 0.15
     + 相信智能得分 × 0.08
     + 结构得分 × 0.05
     + 渐进得分 × 0.05
     + 解释得分 × 0.20
     + 正面得分 × 0.15
     + 清理得分 × 0.07
```

**普通提示词（满分 10 分）**：
```
总分 = 第二层得分 × 0.15
     + 第三层得分 × 0.20
     + 相信智能得分 × 0.08
     + 结构得分 × 0.05
     + 渐进得分 × 0.15
     + 解释得分 × 0.20
     + 正面得分 × 0.15
     + 清理得分 × 0.07
```
```

- [ ] **Step 4: 同步更新检查项满分值**

在 `## 三、三层防御体系检查` 的评分标准表中：
- 第一层：满分改为 10（从9调整）
- 第三层：满分保持 8

- [ ] **Step 5: 同步更新六大原则检查满分值**

在 `## 四、六大原则检查` 的评分标准表中：
- 解释原因：满分改为 10（权重提高）
- 正面指令：满分改为 10（权重提高）
- 定期清理：满分改为 10

- [ ] **Step 6: 验证修改**

读取 quality-reviewer.md，确认权重分配与原文排序一致：解释原因权重最高（20%）。

- [ ] **Step 7: 暂停审核**

**等待用户审核确认后继续 Task 5。**

---

### Task 5: 修复 review-template.md - 评分表述

**Files:**
- Modify: `.claude/skills/prompts-creator/assets/review-template.md`

- [ ] **Step 1: 定位评分细则区域**

找到 `## 六、评分细则` 章节。

- [ ] **Step 2: 添加总分计算说明**

在评分细则表格后添加：

```markdown
**计算方式**：
- 总分 10 分
- Skill：三层防御占 50%，六大原则占 50%
- 普通提示词：第二层15% + 第三层20% + 六大原则65%

**最终得分**：{{各小计之和}} 分
```

- [ ] **Step 3: 验证修改**

读取 review-template.md，确认评分表述清晰无歧义。

- [ ] **Step 4: 暂停审核**

**等待用户审核确认后完成优化。**

---

### Task 6: 最终验证

**Files:**
- Read: 所有修改过的文件

- [ ] **Step 1: 逐文件验证一致性**

对比修改后的内容与原始总结文档：

| 文件 | 原文依据 | 验证点 |
|------|----------|--------|
| skill.md | 《提示词优化指南》 | 优化流程完整 |
| skill.md | 《Skill与普通提示词的区别》 | description 必须包含核心规则 |
| skill.md | 《Skill与普通提示词的区别》 | 公式含义解释 |
| quality-reviewer.md | 《Skill与普通提示词的区别》 | 解释原因权重最高 |

- [ ] **Step 2: 运行自检清单**

| 检查项 | 预期结果 |
|--------|----------|
| description 编写要点 | 包含"必须包含核心规则" |
| 权重分配 | 解释原因权重最高（20%） |
| 优化流程 | 有完整诊断→优化→验证流程 |
| 公式解释 | 有乘法/加法含义说明 |
| 评分表述 | "总分10分，各占50%" |

- [ ] **Step 3: 输出最终报告**

列出所有修改的文件和具体变更内容，供用户最终审核。

---

## Self-Review Checklist

**1. Spec coverage:**

| 原文要求 | 对应任务 |
|----------|----------|
| description 必须包含核心规则 | Task 1 |
| 解释原因权重最高 | Task 4 |
| 优化流程（诊断→验证） | Task 2 |
| 公式含义解释 | Task 3 |
| 评分表述清晰 | Task 5 |

**2. Placeholder scan:**

- 无 "TBD"、"TODO"、"implement later"
- 每个步骤有具体内容
- 代码块有完整示例

**3. Type consistency:**

- 权重数字一致（解释原因20%）
- 文件路径一致
- 章节编号一致