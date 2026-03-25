# 嵌套容器模板

适用于复杂模块（复杂度 > 60）

## 使用说明

此模板用于生成复杂模块的容器文档，包含模块概述、子模块导航和架构说明。

## 模板变量

- `{{moduleName}}` - 模块名称
- `{{modulePath}}` - 模块路径
- `{{complexityScore}}` - 复杂度分数
- `{{complexityLevel}}` - 复杂度等级
- `{{reasoning}}` - 复杂度评估理由
- `{{subModules}}` - 子模块列表
- `{{maxDepth}}` - 最大嵌套深度

## 模板结构

```markdown
# {{moduleName}}

> 复杂度: {{complexityScore}}/100 ({{complexityLevel}})
> 路径: `{{modulePath}}`
> 嵌套深度: {{currentDepth}}/{{maxDepth}}

## 概述

{{reasoning}}

## 架构设计

{{moduleName}} 包含以下子模块：

{{#each subModules}}
- [{{name}}](./{{path}}/README.md) - 复杂度 {{complexity}}
{{/each}}

## 快速开始

### 导入整个模块

```typescript
import * as {{moduleName}} from '{{modulePath}}';
```

### 导入特定子模块

{{#each subModules}}
```typescript
import { {{exports}} } from '{{modulePath}}/{{name}}';
```
{{/each}}

## 子模块导航

{{#each subModules}}
### {{name}}

{{description}}

[查看详情](./{{path}}/README.md)

{{/each}}

## 总结

{{moduleName}} 是一个复杂的模块系统，建议根据具体需求导入所需的子模块，而非导入整个模块。
```

## 示例输出

```markdown
# LLM 调用

> 复杂度: 78/100 (复杂)
> 路径: `src/agent/core/llm`
> 嵌套深度: 1/3

## 概述

LLM 调用模块是核心组件，代码量大（1650行），包含 12 个导出项，涉及子模块、复杂逻辑和多使用场景。

## 架构设计

LLM 调用包含以下子模块：

- [基础调用](./基础调用/README.md) - 复杂度 40
- [流式处理](./流式处理/README.md) - 复杂度 50
- [重试机制](./重试机制/README.md) - 复杂度 35
- [缓存管理](./缓存管理/README.md) - 复杂度 45
- [模型适配器](./模型适配器/README.md) - 复杂度 60

## 快速开始

### 导入整个模块

```typescript
import * as LLM from 'src/agent/core/llm';
```

### 导入特定子模块

```typescript
import { callLLM } from 'src/agent/core/llm/call';
import { streamLLM } from 'src/agent/core/llm/stream';
```

## 子模块导航

### 基础调用

提供基础的 LLM 调用功能，支持同步和异步调用。

[查看详情](./基础调用/README.md)

### 流式处理

支持流式响应处理，适用于实时输出场景。

[查看详情](./流式处理/README.md)

...

## 总结

LLM 调用是一个复杂的模块系统，建议根据具体需求导入所需的子模块，而非导入整个模块。
```
