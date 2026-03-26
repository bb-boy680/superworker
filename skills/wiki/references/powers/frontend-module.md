# 前端项目模块扫描能力

> 本文档描述前端项目（SPA、Next.js/Nuxt、组件库）的专项模块扫描策略，用于指导 AI 分析前端代码库的功能模块结构。

## 适用场景

- **SPA 前端项目**：React/Vue/Angular 单页应用，代码按类型分层（components/、pages/、hooks/、services/）
- **Next.js / Nuxt 项目**：路由即文件系统，支持 App Router 或 Pages Router，包含 API Routes
- **组件库项目**：以组件为核心的代码库，按组件类型或类别组织

## 扫描步骤

### 第一步：识别功能入口

根据项目类型扫描页面或组件入口：

**SPA 项目**
```bash
Glob("src/pages/**/index.tsx")
Glob("src/views/**/index.vue")
Glob("src/app/**/page.tsx")
```

**Next.js 项目**
```bash
# App Router
Glob("app/**/page.tsx")
Glob("app/**/layout.tsx")
Glob("app/api/**/route.ts")

# Pages Router
Glob("pages/**/*.tsx")
Glob("pages/api/**/*.ts")
```

**组件库项目**
```bash
Glob("src/components/*/index.ts")
Glob("src/*/index.ts")
```

每个页面目录或组件入口视为一个**功能入口候选**。

### 第二步：分析页面依赖

读取功能入口文件，提取其依赖关系：

- **导入的组件**：`import { UserForm } from '@/components/user/Form'`
- **使用的 hooks**：`import { useUser } from '@/hooks/useUser'`
- **调用的 API**：`import { userApi } from '@/services/userApi'`
- **使用的 store**：`import { userStore } from '@/stores/userStore'`

记录这些依赖的文件路径，用于后续聚类分析。

### 第三步：功能文件聚类

根据命名关联性和导入关系将文件聚类为功能模块：

**关联规则**
1. **路径前缀匹配**：文件路径包含相同前缀（如 `user`、`order`）
2. **导入依赖**：页面 import 了组件/hook/service
3. **共享识别**：被多个功能 import 的文件归为「共享模块」

**示例：用户管理功能聚类**

```
用户管理功能
├─ pages/user/index.tsx       (页面入口)
├─ pages/user/list.tsx        (列表页)
├─ components/user/Form.tsx   (用户表单)
├─ components/user/Card.tsx   (用户卡片)
├─ hooks/useUser.ts           (用户数据管理)
├─ hooks/useUserList.ts       (用户列表管理)
├─ services/userApi.ts        (用户API)
└─ stores/userStore.ts        (用户状态)
```

**Next.js App Router 示例**

```
用户功能域
├─ app/user/
│  ├─ page.tsx      (用户列表页)
│  ├─ [id]/page.tsx (用户详情页)
│  └─ layout.tsx    (用户布局)
├─ app/api/users/
│  └─ route.ts      (用户API)
└─ components/user/ (用户组件)
```

**组件库示例（按功能类型）**

```
表单组件功能
├─ src/components/Form/
├─ src/components/Input/
├─ src/components/Select/
└─ src/components/Checkbox/
```

### 第四步：生成模块数据

为每个聚类生成功能模块数据：

```json
{
  "name": "用户管理",
  "paths": [
    "src/pages/user",
    "src/components/user",
    "src/hooks/useUser.ts",
    "src/hooks/useUserList.ts",
    "src/services/userApi.ts"
  ],
  "entry_points": ["src/pages/user/index.tsx"],
  "functional_domain": "user-management",
  "description": "用户CRUD、用户列表、用户详情"
}
```

```json
{
  "name": "表单组件",
  "paths": [
    "src/components/Form",
    "src/components/Input",
    "src/components/Select",
    "src/components/Checkbox"
  ],
  "entry_points": ["src/components/Form/index.ts"],
  "functional_domain": "form-components",
  "description": "表单相关组件集合"
}
```

## 特殊处理

### 共享模块识别

当文件被多个功能模块导入时，识别为共享模块：

- **共享组件**：`components/common/`、`components/shared/`
- **共享 hooks**：`hooks/useAuth.ts`（被多个功能使用）
- **共享服务**：`services/api.ts`（通用 API 客户端）
- **工具函数**：`utils/`、`lib/` 下的通用函数

### 框架特定处理

**Next.js**
- App Router：`app/` 目录下的 `page.tsx`、`layout.tsx`、`loading.tsx`、`error.tsx` 视为同一功能单元
- 并行路由：`@team/`、`@analytics/` 等特殊目录单独分析
- API Routes：`app/api/` 或 `pages/api/` 下的路由与对应页面关联

**Nuxt**
- 自动路由：`pages/` 目录生成路由
- 布局系统：`layouts/` 目录
- 组合式函数：`composables/` 目录

**组件库**
- 优先按组件类型分组（基础组件、表单组件、数据展示等）
- 考虑组件之间的依赖关系（如 Form 依赖 Input、Select）

## 输出格式

扫描结果输出为模块数据文件：

```json
{
  "modules": [
    {
      "name": "模块名称",
      "paths": ["相关文件路径列表"],
      "entry_points": ["入口文件"],
      "functional_domain": "功能域标识",
      "description": "功能描述"
    }
  ],
  "shared_modules": [
    {
      "name": "共享模块名称",
      "paths": ["共享文件路径"],
      "description": "共享功能描述"
    }
  ]
}
```

## 使用示例

**示例 1：分析 React SPA 项目**

1. 扫描 `src/pages/**/index.tsx` 找到页面入口
2. 读取页面文件，提取导入的组件和 hooks
3. 根据 `user`、`order` 等前缀聚类文件
4. 生成「用户管理」、「订单系统」等功能模块

**示例 2：分析 Next.js App Router 项目**

1. 扫描 `app/**/page.tsx` 找到所有页面
2. 同时扫描 `app/api/**/route.ts` 找到 API 端点
3. 将 `app/user/page.tsx` 与 `app/api/users/route.ts` 关联为同一功能域
4. 识别 `components/ui/` 下的共享 UI 组件

**示例 3：分析组件库**

1. 扫描 `src/components/*/index.ts` 找到组件入口
2. 根据组件类型聚类：Button、Input 等归为「基础组件」
3. Form、FormItem、Validator 归为「表单组件」
4. Table、List、Card 归为「数据展示组件」
