# Wiki 目录生成策略

## 目录层级设计

```
wiki/
├── config.yaml                 # 生成配置（用户可自定义）
├── meta/                       # 元数据（清单、进度、索引）
│   ├── manifest.json          # 文件清单
│   ├── progress.json          # 进度追踪
│   └── search-index.json      # 搜索索引
└── {lang}/                    # 语言目录（zh, en, etc.）
    ├── README.md              # 首页/导航
    ├── 文档地图.md            # 全局目录
    ├── 快速开始.md            # 快速入门
    ├── 架构设计.md            # 架构概览
    ├── 开发指南.md            # 开发规范
    ├── {大功能模块A}/         # 按业务/功能聚合
    │   ├── README.md          # 模块概述
    │   ├── {子模块1}.md       # 具体文档
    │   ├── {子模块2}.md
    │   └── assets/            # 模块专属资源
    │       └── diagram.png
    ├── {大功能模块B}/
    │   ├── README.md
    │   └── ...
    └── shared/                # 跨模块内容
        ├── 术语表.md
        ├── 常见问题.md
        └── 更新日志.md
```

## 模块聚合策略

### 1. 基于目录结构聚合（默认）

```
项目结构:                    Wiki 结构:
src/
├── cli/                     zh/
│   ├── core.ts    ────────→ CLI系统/
│   ├── printer.ts  ──────→ ├── CLI核心.md
│   └── runner.ts  ───────→ ├── CLI打印输出.md
│                           └── 批处理运行器.md
├── mcp/
│   ├── tools.ts   ───────→ MCP系统/
│   └── server.ts  ───────→ ├── MCP基础工具.md
│                           └── MCP服务器实现.md
└── utils/                   utils工具/
    ├── date.ts    ───────→ ├── 日期处理.md
    └── format.ts  ───────→ └── 格式化工具.md
```

**规则：**
- 一级目录 → 大功能模块（目录）
- 目录内文件 → 模块内文档
- 文件命名 → 文档标题（驼峰转中文）

### 2. 基于路由配置聚合（前端项目）

```javascript
// 读取路由配置
const routes = [
  { path: '/user', component: 'UserList', name: '用户管理' },
  { path: '/user/:id', component: 'UserDetail', name: '用户详情' },
  { path: '/order', component: 'OrderList', name: '订单管理' }
];

// 聚合为模块
用户管理模块/
├── README.md              # 路由/功能概述
├── 用户列表.md            # UserList 组件
├── 用户详情.md            # UserDetail 组件
└── API文档.md             # 相关 API 聚合
```

**规则：**
- 路由 name → 模块名称
- 路由下的所有组件 → 模块内文档
- 路由使用的 API → 模块内 API 文档

### 3. 基于依赖关系聚合

```javascript
// 分析 import 关系
// UserList.tsx 引用了：
import { userApi } from '@/api/user';
import { UserCard } from '@/components/User';
import { useUserStore } from '@/store/user';

// 自动聚合为：用户管理模块
用户管理模块/
├── 页面/
│   └── 用户列表.md         # UserList.tsx
├── 组件/
│   └── 用户卡片.md         # UserCard
├── API/
│   └── 用户接口.md         # userApi
└── 状态/
    └── 用户状态管理.md      # useUserStore
```

### 4. 混合策略（推荐）

结合以上三种方式：

```
1. 先按目录结构粗分（得到候选模块）
2. 读取路由配置验证（确认模块边界）
3. 分析依赖关系补充（找到遗漏文件）
4. 最终确认模块划分
```

## 模块深度控制

通过配置控制目录嵌套层级：

```yaml
# config.yaml
structure:
  maxDepth: 3              # 最大嵌套深度

  # 哪些目录视为大模块
  moduleIndicators:
    - "src/**/"            # src 下的直接子目录
    - "app/**/"            # app 下的直接子目录
    - "modules/**/"        # modules 下的目录
    - "features/**/"       # features 下的目录

  # 哪些文件单独成篇
  filePatterns:
    - "**/index.{ts,tsx}"  # index 文件作为模块入口
    - "**/README*"         # README 作为模块入口

  # 哪些文件聚合到一起
  aggregationRules:
    - pattern: "**/utils/*"
      strategy: "group-by-directory"  # 同目录 utils 聚合
    - pattern: "**/types/*"
      strategy: "merge-into-one"      # 所有 types 合并
```

## 生成示例

### 示例 1：标准前端项目

```
src/
├── components/              # 通用组件
│   ├── Button/
│   ├── Modal/
│   └── Table/
├── pages/                   # 页面
│   ├── Dashboard/
│   ├── User/
│   │   ├── List.tsx
│   │   ├── Detail.tsx
│   │   └── Form.tsx
│   └── Order/
│       ├── List.tsx
│       └── Detail.tsx
├── api/                     # 接口
│   ├── user.ts
│   └── order.ts
└── store/                   # 状态
    ├── userSlice.ts
    └── orderSlice.ts

↓ 生成 ↓

wiki/zh/
├── 概览.md
├── 全局组件/               # 检测为通用，单独成模块
│   ├── 按钮.md
│   ├── 模态框.md
│   └── 表格.md
├── 仪表盘/                 # Dashboard 模块
├── 用户管理/               # 聚合：pages/User + api/user + store/user
│   ├── 用户列表.md         # List.tsx
│   ├── 用户详情.md         # Detail.tsx
│   ├── 用户表单.md         # Form.tsx
│   ├── 用户接口.md         # user.ts
│   └── 用户状态.md         # userSlice.ts
└── 订单管理/               # 聚合：pages/Order + api/order + store/order
    ├── 订单列表.md
    ├── 订单详情.md
    ├── 订单接口.md
    └── 订单状态.md
```

### 示例 2：后端项目

```
src/
├── controllers/
│   ├── user.controller.ts
│   └── order.controller.ts
├── services/
│   ├── user.service.ts
│   └── order.service.ts
├── models/
│   ├── user.entity.ts
│   └── order.entity.ts
└── routes/
    ├── user.routes.ts
    └── order.routes.ts

↓ 生成 ↓

wiki/zh/
├── API概览.md
├── 用户模块/               # 按业务聚合
│   ├── 控制器.md           # user.controller
│   ├── 服务层.md           # user.service
│   ├── 数据模型.md         # user.entity
│   └── 路由定义.md         # user.routes
└── 订单模块/               # 按业务聚合
    ├── 控制器.md
    ├── 服务层.md
    ├── 数据模型.md
    └── 路由定义.md
```

## 生成规则总结

| 场景 | 策略 | 输出结构 |
|------|------|----------|
| 目录深度=1 | 目录=模块 | `模块名/文件.md` |
| 目录深度>1 | 子目录=子模块 | `模块名/子模块/文件.md` |
| 路由配置存在 | 路由=模块 | `路由名/组件.md` |
| import 关系密集 | 依赖=模块 | `模块名/类型/文件.md` |

## 特殊文件处理

```yaml
# 这些文件特殊处理
specialFiles:
  # 入口文件
  "**/index.*":
    action: "as-module-readme"
    output: "{module}/README.md"

  # 配置文件
  "**/config.*":
    action: "merge-into-architecture"
    output: "架构设计.md#配置"

  # 常量定义
  "**/constants.*":
    action: "append-to-module"
    output: "{module}/常量定义.md"

  # 类型定义
  "**/types/**":
    action: "merge-all-types"
    output: "{module}/类型定义.md"

  # 工具函数
  "**/utils/**":
    action: "group-by-file"
    output: "{module}/工具函数/{filename}.md"
```

## 用户自定义配置

用户可以覆盖默认聚合规则：

```yaml
# wiki/config.yaml
customModules:
  # 强制聚合某些文件到一个模块
  核心工具:
    files:
      - "src/utils/date.ts"
      - "src/utils/format.ts"
      - "src/utils/validate.ts"

  # 强制拆分某个模块
  用户系统:
    splitInto:
      - 用户认证
      - 用户资料
      - 用户权限
```

## 基于分层检索的目录生成

当使用分层深度检索时，模块结构已经通过 AI 语义聚类确定：

### 目录映射规则

Level 3 模块 -> Wiki 目录

业务模块 (type=business):
  wiki/zh/{模块名称}/
    ├── README.md          # 模块概述
    ├── 页面.md            # 页面组件文档
    ├── API接口.md         # API 文档
    └── 组件.md            # 共享组件文档

共享模块 (type=shared):
  wiki/zh/shared/{模块名称}/
    ├── README.md
    └── ...

配置模块 (type=config):
  wiki/zh/配置/
    └── {模块名称}.md

入口模块 (type=entry):
  wiki/zh/项目入口/
    ├── 主入口.md
    └── 根组件.md

### 嵌套深度控制

- 最大深度：3 层（wiki/zh/大模块/子模块）
- 超过 3 层的模块：扁平化为同级目录
- 共享模块统一放在 wiki/zh/shared/

### 文件分类映射

根据 Level 3 的 files.byCategory 分类：

pages/     → {模块名称}/页面/{文件名}.md
components/ → {模块名称}/组件/{文件名}.md
api/       → {模块名称}/API接口.md（合并）
types/     → {模块名称}/类型定义.md（合并）
utils/     → shared/工具函数/{模块名称}.md
hooks/     → shared/Hooks/{文件名}.md

### 与分层检索的集成流程

Level 3 输出:
  modules[].files.byCategory
  modules[].type (business/shared/config/entry)

↓ 映射

Wiki 目录结构:
  wiki/zh/
    ├── {business模块}/
    ├── shared/
    │   ├── {shared模块}/
    │   ├── 工具函数/
    │   └── Hooks/
    ├── 配置/
    └── 项目入口/
