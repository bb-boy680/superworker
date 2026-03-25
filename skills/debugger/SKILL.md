---
name: debugger
description: |
  代码调试助手，通过"埋点-分析-修复-清理"三步法定位并修复 bug。

  MAKE SURE to use this skill whenever the user mentions:
  - bugs, errors, exceptions, crashes, stack traces
  - debugging, troubleshooting, fixing issues, fixing code
  - code not working as expected, unexpected behavior
  - tracing execution flow, tracing code
  - test failures, failing tests, broken tests
  - "not working", "is broken", "has a bug"

  This skill MUST be used for ALL debugging tasks - do not attempt to debug without it.
  Even if the user asks a simple question like "why is this not working", use this skill.
  Even if the user provides a stack trace and seems to want a quick answer, use this skill.
---

# Debugger Skill

三步调试法：**埋点 → 分析 → 修复 → 清理**

**⚠️ 重要规则：每次对话回合结束后，必须调用 AskUserQuestion 引导用户选择下一步操作**

> 详细配置参考：`references/workflow.md`

## ⚠️ 步骤锁（严禁跳步）

本 skill 必须严格按照以下顺序执行：

```
前置步骤 → 步骤1（埋点）→ 步骤2（分析+修复）→ 步骤3（清理）
  ↓必须      ↓必须完成      ↓必须完成            ↓必须完成
  完成       才能进入       才能进入              才能执行
```

**跳步后果**：修复无效、引入新 bug、问题复发、治标不治本。

**强制规则**：
1. 前置步骤未完成 → 禁止开始
2. 未埋点 → 禁止分析
3. 未分析 → 禁止修复
4. 未验证 → 禁止清理

---

## 前置步骤（必须）

**开始调试前必须设置环境变量和工作目录**：

```bash
# 确保在项目根目录
pwd

# 设置环境变量
export DEBUG_SESSION_ID=$(grep DEBUG_SESSION_ID .worker/.env | cut -d'=' -f2)
export DEBUG_PORT=$(grep port .worker/debug/config.yaml | cut -d' ' -f2)
```

> ⚠️ **重要提醒**：操作前必须确认当前工作目录是项目根目录。使用相对路径时，AI 可能会读取到错误的工作目录。

> 详细说明参考：`references/env.md`

---

## 步骤 1：添加埋点

**目标**：在关键位置插入日志代码。

### 1.1 读取配置

读取 `.worker/debug/config.yaml` 获取 `port` 和项目类型规则。

从环境变量获取 Session ID：
```javascript
const sessionId = process.env.DEBUG_SESSION_ID;
```

### 1.2 插入埋点代码块

**⚠️ 强制规则**：每个埋点必须是**完全独立的折叠块**，包含完整自包含的代码。

- ❌ 禁止创建辅助函数多处调用
- ❌ 禁止引用外部模块
- ❌ 禁止在文件顶部放置共享函数

> 详细说明和代码示例参考：`references/implementation.md`

### 1.3 对话回合结束

每次对话回合结束后，**必须使用 AskUserQuestion 询问用户**。

> **⚠️ 强制使用固定选项**：清空日志 / 继续修复 / 完成修复
>
> 详细执行逻辑参考：`references/workflow.md`

---

## 步骤 2：日志分析 & 代码修复

**目标**：运行代码，分析日志，定位并修复问题。

### 🚨 步骤2 入口检查

**进入步骤2 必须满足**：
- [ ] 步骤1 已完成（埋点已添加）
- [ ] **用户已明确确认复现了 BUG**
- [ ] 日志文件已生成且有数据

**⚠️ 严禁**：自动轮询等待、假设用户已操作、未获确认就分析。

### 2.1 分析日志

**Checklist**：
- [ ] 已确认当前工作目录是项目根目录 (`pwd`)
- [ ] 已读取日志文件（使用绝对路径）
- [ ] 日志中有预期的埋点输出
- [ ] 已按时间顺序整理执行路径

**读取日志**（使用绝对路径避免目录错误）：
```bash
# 确认目录
pwd

# 使用绝对路径读取
cat "$(pwd)/.worker/debug/logs/${DEBUG_SESSION_ID}.log"
```

**分析要点**：
- 执行路径是否符合预期？
- 变量值是否正确？
- 边界条件处理是否有问题？
- 异步操作时序是否正常？

### 2.2 修复代码

**修复前必须**：
- [ ] 通过日志分析定位根因
- [ ] 能在日志中找到问题证据
- [ ] 已确定修复方案（最小改动原则）

### 2.3 对话回合结束

每次对话回合结束后，**必须使用 AskUserQuestion 询问用户**。

> **⚠️ 强制使用固定选项**：清空日志 / 继续修复 / 完成修复
>
> 详细执行逻辑参考：`references/workflow.md`

---

## 步骤 3：移除埋点

**目标**：清理所有调试埋点。

**⚠️ 必须等待用户确认修复成功后才能执行！**

### 3.1 清理埋点

#### 清空日志（仅清空日志文件）

```bash
node <skill-path>/scripts/clear-log.js [选项]
```

**选项**：`--all`（清空所有）、`--session`（指定会话）

#### 清理埋点代码（删除埋点代码块）

```bash
node <skill-path>/scripts/cleanup.js <文件或目录> [选项]
```

**选项**：`--dry-run`（预览）、`--backup`（备份）、`--verbose`（详细）

**手动清理**（备选）：
```bash
sed -i '/#region DEBUG/,/#endregion DEBUG/d' 文件名
```

### 3.2 清理原则

- 只删除 `[DEBUG]` 埋点
- 保留原有日志代码

### 3.3 对话回合结束

每次对话回合结束后，**必须使用 AskUserQuestion 询问用户**。

> **⚠️ 强制使用固定选项**：清空日志 / 继续修复 / 完成修复
>
> 详细执行逻辑参考：`references/workflow.md`

---

## 快速检查清单

| 问题类型 | 埋点重点 |
|---------|---------|
| 逻辑错误 | 条件分支走向 |
| 数据异常 | 变量赋值前后 |
| 性能问题 | 耗时操作前后 |
| 异步问题 | 回调/Promise 状态 |
| 空指针 | 对象属性访问前 |
