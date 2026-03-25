# 复杂度评估指南

## 概述

本指南说明 Wiki Generator 如何使用复杂度评估来决定文档拆分策略。

## 复杂度评估指标

### 1. 代码行数 (权重: 30)

| 行数 | 得分 |
|------|------|
| > 1000 | 30 |
| > 500 | 20 |
| > 200 | 10 |
| > 100 | 5 |
| ≤ 100 | 0 |

### 2. 导出数量 (权重: 15)

每个导出项得 2 分，最高 15 分。

```javascript
score += Math.min(exports * 2, 15);
```

### 3. 依赖数量 (权重: 15)

每个 import 得 1 分，最高 15 分。

```javascript
score += Math.min(dependencies, 15);
```

### 4. 子模块 (权重: 20)

如果包含子目录，得 20 分。

### 5. 复杂逻辑 (权重: 10)

如果检测到复杂逻辑，得 10 分。

复杂逻辑包括：
- 嵌套控制流（if/while/for 嵌套）
- 状态管理（useState, reducer, store）
- 异步嵌套（Promise 链、async/await 嵌套）
- 复杂类继承

### 6. 使用场景 (权重: 10)

每个使用场景得 3 分，最高 10 分。

使用场景从导出名称识别：
- 创建：create, add
- 更新：update, edit
- 删除：delete, remove
- 查询：get, fetch
- 列表：list, search

## 复杂度等级

| 等级 | 分数范围 | 文档策略 |
|------|---------|---------|
| 简单 | 0-30 | 单文档 |
| 中等 | 30-60 | 章节拆分 |
| 复杂 | 60-100 | 嵌套拆分 |

## 策略说明

### 单文档 (single)

适用于简单的工具函数、常量定义、简单组件。

输出：`wiki/zh/{模块名}.md`

内容结构：
- 概述
- API
- 使用示例

### 章节拆分 (sections)

适用于中等复杂度的服务类、中等组件、简单模块。

输出：`wiki/zh/{模块名}/README.md`

内容结构：
- 概述
- 按功能分章节（组件、函数、类等）
- 使用示例
- 总结

### 嵌套拆分 (nested)

适用于复杂的核心模块、复杂组件、框架级代码。

输出：`wiki/zh/{模块名}/README.md`（容器）+ 子模块文档

内容结构：
- 概述
- 架构设计
- 子模块导航
- 快速开始

## 自定义配置

可以通过配置文件调整权重和阈值：

```yaml
complexity:
  weights:
    lines: 30
    exports: 15
    dependencies: 15
    subModules: 20
    complexLogic: 10
    useCases: 10
  thresholds:
    simple: 30
    medium: 60
```

## 手动覆盖

可以通过规则强制指定策略：

```yaml
complexity:
  rules:
    forceSingle:
      - pattern: "**/utils/**"
        reason: "工具函数保持简单"
    forceNested:
      - pattern: "**/core/**"
        name: "核心模块"
        reason: "核心模块必须详细文档"
```

## 最佳实践

1. **简单模块不要过度文档化** - 简单模块单文档即可
2. **复杂模块必须拆分** - 避免单个文档过长
3. **子模块独立评估** - 每个子模块单独计算复杂度
4. **定期重新评估** - 代码变化后重新评估复杂度
