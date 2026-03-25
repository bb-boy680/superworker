# 章节文档模板

适用于中等复杂度模块（复杂度 30-60）

## 使用说明

此模板用于生成中等复杂度模块的文档，支持多个章节的组织。

## 模板变量

- `{{moduleName}}` - 模块名称
- `{{modulePath}}` - 模块路径
- `{{complexityScore}}` - 复杂度分数
- `{{complexityLevel}}` - 复杂度等级
- `{{sections}}` - 章节列表
- `{{reasoning}}` - 复杂度评估理由

## 章节类型

根据模块内容自动生成以下章节：

1. **概述** - 模块功能简介
2. **组件** - 组件列表和说明（如果有组件）
3. **函数** - 函数列表和说明（如果有函数）
4. **类** - 类列表和说明（如果有类）
5. **核心逻辑** - 复杂逻辑说明（如果检测到复杂逻辑）
6. **使用示例** - 代码示例
7. **总结** - 模块要点回顾

## 模板结构

```markdown
# {{moduleName}}

> 复杂度: {{complexityScore}}/100 ({{complexityLevel}})
> 路径: `{{modulePath}}`

## 概述

{{reasoning}}

{{#each sections}}
## {{name}}

{{content}}

{{/each}}

## 总结

{{moduleName}} 提供了 {{exports.length}} 个导出项，适用于 {{useCases}} 等场景。
```

## 示例输出

```markdown
# User Service

> 复杂度: 52/100 (中等)
> 路径: `src/services/user.ts`

## 概述

用户服务模块，提供用户 CRUD 操作，包含 8 个 API 函数，涉及用户查询、创建、更新、删除等使用场景。

## 用户查询

### `getUserList(params)`

获取用户列表，支持分页和筛选。

### `getUserById(id)`

根据 ID 获取单个用户信息。

## 用户创建

### `createUser(data)`

创建新用户，自动验证数据格式。

## 用户更新

### `updateUser(id, data)`

更新用户信息。

### `batchUpdateUsers(ids, data)`

批量更新多个用户。

## 使用示例

```typescript
import { getUserList, createUser } from './services/user';

const users = await getUserList({ page: 1, limit: 10 });
const newUser = await createUser({ name: 'John', email: 'john@example.com' });
```

## 总结

User Service 提供了 8 个导出项，适用于用户查询、创建、更新、删除等场景。
```
