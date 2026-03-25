# 调试流程控制 - AskUserQuestion 配置

本文档定义每次对话回合结束后使用 AskUserQuestion 工具的固定配置。

**核心规则：每次对话回合结束后，必须调用 AskUserQuestion 引导用户**

---

## 固定选项配置

**每次对话回合结束后，使用相同的 AskUserQuestion 配置：**

```json
{
  "questions": [{
    "question": "请选择下一步操作",
    "header": "下一步",
    "options": [
      {
        "label": "清空日志",
        "description": "清空当前会话的 *.log 文件内容"
      },
      {
        "label": "继续修复",
        "description": "埋点的范围不够全面，需要再次添加更多的埋点"
      },
      {
        "label": "完成修复",
        "description": "用户验证后，认为 BUG 已经修复完毕了，需要清空埋点代码"
      }
    ]
  }]
}
```

---

## 选项详细说明

### 清空日志
- **作用**：清空当前会话的 `*.log` 文件内容
- **使用脚本**：`node ${CLAUDE_PLUGIN_ROOT}/skills/debugger/scripts/clear-log.js`
- **使用场景**：日志文件过大、数据混乱，或想重新开始收集日志
- **注意**：只清空日志文件内容，不删除埋点代码

**执行**：
```bash
# 清空当前会话日志（自动读取环境变量）
node ${CLAUDE_PLUGIN_ROOT}/skills/debugger/scripts/clear-log.js

# 或手动指定会话
node ${CLAUDE_PLUGIN_ROOT}/skills/debugger/scripts/clear-log.js --session $DEBUG_SESSION_ID
```

### 继续修复
- **作用**：埋点的范围不够全面，需要再次添加更多的埋点
- **使用场景**：
  - 问题未复现，埋点位置不对
  - 日志数据不足，无法定位根因
- **执行**：继续当前调试流程，添加更多埋点

### 完成修复
- **作用**：用户验证后，认为 BUG 已经修复完毕了，需要清空埋点代码
- **使用场景**：
  - 准备进入分析阶段
  - 修复已验证成功
  - 调试流程结束
- **执行**：进入下一阶段或结束调试

---

## 调用时机

**每次对话回合结束后必须调用 AskUserQuestion**，包括：

1. **前置步骤完成后** → AskUserQuestion → 用户选择 → 继续
2. **埋点添加后** → AskUserQuestion → 用户选择 → 继续
3. **分析日志后** → AskUserQuestion → 用户选择 → 继续
4. **修复代码后** → AskUserQuestion → 用户选择 → 继续
5. **清理埋点后** → AskUserQuestion → 用户选择 → 继续

**规则**：
- 不等待用户输入，主动提供选项
- 每次回复后都必须有 Question
- 用户选择后再执行对应逻辑

---

## 执行流程示例

```
用户: 我的代码有 bug
AI:  好的，我来帮你调试。首先设置环境变量...
     [执行前置步骤]
     → AskUserQuestion(清空日志/继续修复/完成修复)

用户: 选择"继续修复"（添加埋点）
AI:  好的，我在关键位置添加了埋点...
     [添加埋点]
     → AskUserQuestion(清空日志/继续修复/完成修复)

用户: 选择"完成修复"（确认埋点完成）
AI:  请手动复现 BUG...
     [等待用户复现]
     [分析日志]
     → AskUserQuestion(清空日志/继续修复/完成修复)

用户: 选择"完成修复"（确认分析完成）
AI:  根据日志分析，问题是...
     [修复代码]
     → AskUserQuestion(清空日志/继续修复/完成修复)

用户: 选择"完成修复"（确认修复完成）
AI:  修复已应用，请验证...
     [用户验证成功]
     [清理埋点]
     → AskUserQuestion(清空日志/继续修复/完成修复)

用户: 选择"完成修复"
AI:  调试完成！
```

---

## 代码示例

**每次回复后调用 AskUserQuestion：**

```javascript
// AI 完成某个动作后
async function afterAction() {
  // 1. 完成当前工作（添加埋点/分析/修复等）
  await doWork();

  // 2. 调用 AskUserQuestion 引导用户
  const result = await AskUserQuestion({
    questions: [{
      question: "请选择下一步操作",
      header: "下一步",
      options: [
        { label: "清空日志", description: "清空当前会话的 *.log 文件内容" },
        { label: "继续修复", description: "埋点的范围不够全面，需要再次添加更多的埋点" },
        { label: "完成修复", description: "用户验证后，认为 BUG 已经修复完毕了，需要清空埋点代码" }
      ]
    }]
  });

  // 3. 根据用户选择处理
  const answer = result.answers["请选择下一步操作"];

  switch (answer) {
    case "清空日志":
      await exec("node ${CLAUDE_PLUGIN_ROOT}/skills/debugger/scripts/clear-log.js");
      // 清空后继续 AskUserQuestion
      await afterAction();
      break;
    case "继续修复":
      // 继续当前工作
      await continueWork();
      // 完成后再次 AskUserQuestion
      await afterAction();
      break;
    case "完成修复":
      // 进入下一阶段
      await nextStage();
      // 完成后再次 AskUserQuestion
      await afterAction();
      break;
  }
}
```

---

## 通用规则

1. **每次对话回合后必须调用 AskUserQuestion**
2. **固定选项**：始终使用三个固定选项
3. **不自动推进**：等待用户明确选择后才能继续
4. **循环调用**：选择后继续工作，然后再次调用 Question
