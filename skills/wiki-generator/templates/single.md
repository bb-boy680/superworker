# 单文档模板

适用于简单模块（复杂度 < 30）

## 使用说明

此模板用于生成简单模块的文档，包含概述、API 和使用示例三个部分。

## 模板变量

- `{{moduleName}}` - 模块名称
- `{{modulePath}}` - 模块路径
- `{{complexityScore}}` - 复杂度分数
- `{{complexityLevel}}` - 复杂度等级（简单/中等/复杂）
- `{{reasoning}}` - 复杂度评估理由
- `{{exports}}` - 导出项列表
- `{{examples}}` - 使用示例

## 模板结构

```markdown
# {{moduleName}}

> 复杂度: {{complexityScore}}/100 ({{complexityLevel}})
> 路径: `{{modulePath}}`

## 概述

{{reasoning}}

## API

{{exports}}

## 使用示例

{{examples}}
```

## 生成规则

1. **概述**: 基于复杂度评估的理由自动生成
2. **API**: 列出所有导出的函数、类、组件
3. **示例**: 根据模块类型生成基本使用示例

## 示例输出

```markdown
# Date Utils

> 复杂度: 25/100 (简单)
> 路径: `src/utils/date.ts`

## 概述

此模块为简单的工具函数集合，包含日期格式化、解析等基础功能。

## API

| 函数 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `formatDate(date, format)` | 格式化日期 | `date: Date`, `format: string` | `string` |
| `parseDate(str, format)` | 解析日期字符串 | `str: string`, `format: string` | `Date` |

## 使用示例

```typescript
import { formatDate, parseDate } from './utils/date';

const formatted = formatDate(new Date(), 'YYYY-MM-DD');
const parsed = parseDate('2024-01-15', 'YYYY-MM-DD');
```
```
