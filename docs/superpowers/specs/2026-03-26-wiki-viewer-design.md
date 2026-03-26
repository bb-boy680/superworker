---
name: Wiki Viewer Design
description: Wiki 文档可视化仪表盘设计规范
type: project
---

# Wiki 文档可视化仪表盘设计规范

> 创建时间: 2026-03-26
> 目标: 构建本地运行的 Wiki 文档可视化平台，支持多项目切换和实时同步

---

## 概述

Wiki Viewer 是一个基于 Nuxt.js 的全栈应用，用于可视化查看和管理本地项目的 Wiki 文档。支持多项目切换、文件目录树浏览、Markdown 渲染和实时文件同步。

---

## 技术栈

| 层级 | 技术选型 |
|------|----------|
| 框架 | Nuxt.js 3 (Vue 3 + Vite 内置) |
| UI 组件库 | shadcn-vue |
| Markdown 渲染 | markstream-vue |
| 文件目录树 | vue-finder |
| 实时通信 | WebSocket |
| 文件监听 | chokidar |
| 样式 | Tailwind CSS |

---

## 系统架构

```
┌─────────────────────────────────────────────────────┐
│                  Nuxt.js Server (:3000)              │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │                 前端页面层                       │ │
│  │  • 侧边栏导航 (项目切换 + Wiki/Plan 切换)        │ │
│  │  • 文件目录树 (vue-finder)                      │ │
│  │  • Markdown 内容区 (markstream-vue)             │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │               Server API 层                     │ │
│  │  • GET  /api/projects       获取项目列表        │ │
│  │  • POST /api/projects       添加项目            │ │
│  │  • DELETE /api/projects/:id 删除项目           │ │
│  │  • GET  /api/files/*        读取文件内容        │ │
│  │  • GET  /api/tree           获取目录树          │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │             WebSocket + 文件监听                │ │
│  │  • ws://localhost:3000/_ws                     │ │
│  │  • chokidar 监听 .worker/ 目录变化              │ │
│  │  • 变更事件推送到前端                           │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
┌──────────────────────┐    ┌──────────────────────────┐
│ ~/.worker/           │    │ <project>/.worker/       │
│ └── project.json     │    │ └── wiki/                │
│     (项目配置)        │    │     └── zh/              │
│                      │    │         └── *.md         │
└──────────────────────┘    └──────────────────────────┘
```

---

## 目录结构

```
ui/
├── nuxt.config.ts           # Nuxt 配置
├── app.vue                  # 根组件
├── pages/
│   └── index.vue            # 主页面
├── components/
│   ├── layout/
│   │   ├── Sidebar.vue      # 侧边栏
│   │   └── Header.vue       # 顶部栏
│   ├── project/
│   │   ├── ProjectSwitcher.vue    # 项目切换器
│   │   └── ProjectList.vue        # 项目列表
│   ├── wiki/
│   │   ├── FileTree.vue     # 文件目录树
│   │   └── MarkdownViewer.vue    # Markdown 渲染器
│   └── plan/
│       └── PlanPlaceholder.vue    # Plan 占位组件
├── server/
│   ├── api/
│   │   ├── projects.ts      # 项目管理 API
│   │   └── files/[...path].ts   # 文件读取 API
│   ├── utils/
│   │   ├── projectStore.ts  # 项目存储工具
│   │   └── fileWatcher.ts   # 文件监听工具
│   └── plugins/
│       └── websocket.ts     # WebSocket 服务
├── composables/
│   ├── useProject.ts        # 项目状态管理
│   ├── useFileTree.ts       # 文件树状态
│   └── useWebSocket.ts      # WebSocket 连接
├── stores/
│   └── app.ts               # 全局状态
└── types/
    └── index.ts             # 类型定义
```

---

## 数据模型

### 项目配置 (project.json)

```typescript
// ~/.worker/project.json
interface ProjectConfig {
  projects: Project[];
  activeProjectId: string | null;
}

interface Project {
  id: string;           // UUID
  name: string;         // 项目名称
  path: string;         // 项目绝对路径
  addedAt: string;      // 添加时间 ISO 8601
  lastAccessedAt: string; // 最后访问时间
}
```

### 文件树节点

```typescript
interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  extension?: string;   // 文件扩展名
}
```

### WebSocket 消息

```typescript
interface WSMessage {
  type: 'file:changed' | 'file:added' | 'file:deleted' | 'tree:refresh';
  payload: {
    path: string;
    timestamp: number;
  };
}
```

---

## API 设计

### 项目管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/projects | 获取所有项目 |
| POST | /api/projects | 添加新项目 |
| DELETE | /api/projects/:id | 删除项目 |
| PATCH | /api/projects/:id/activate | 激活项目 |

### 文件操作

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/tree | 获取当前项目的 .worker 目录树 |
| GET | /api/files/* | 读取文件内容 (路径作为参数) |

---

## UI 设计

### 布局结构

```
┌──────────────────────────────────────────────────────────┐
│                      Header (可选)                        │
├────────────────┬─────────────────────────────────────────┤
│                │                                         │
│   Sidebar      │           Main Content                  │
│   (260px)      │                                         │
│                │   ┌─────────────────────────────────┐   │
│ ┌────────────┐ │   │ Breadcrumb: Wiki / zh / file.md │   │
│ │ 项目切换    │ │   └─────────────────────────────────┘   │
│ └────────────┘ │                                         │
│                │   ┌─────────────────────────────────┐   │
│ ┌────────────┐ │   │                                 │   │
│ │ Wiki 文档   │ │   │     Markdown Content           │   │
│ │ Plan 计划   │ │   │     (markstream-vue)           │   │
│ └────────────┘ │   │                                 │   │
│                │   │                                 │   │
│ ┌────────────┐ │   │                                 │   │
│ │ 文件目录树  │ │   │                                 │   │
│ │            │ │   │                                 │   │
│ │ (vue-finder)│ │   │                                 │   │
│ │            │ │   │                                 │   │
│ └────────────┘ │   └─────────────────────────────────┘   │
│                │                                         │
│ ┌────────────┐ │                                         │
│ │ 状态: 监听中│ │                                         │
│ └────────────┘ │                                         │
└────────────────┴─────────────────────────────────────────┘
```

### 组件规范

#### Sidebar (侧边栏)

- **宽度**: 260px，固定
- **背景色**: 深色主题 (#0f172a)
- **内容区域**:
  1. 项目切换器 (顶部)
  2. 导航标签 (Wiki / Plan)
  3. 文件目录树 (vue-finder)
  4. 状态指示器 (底部)

#### ProjectSwitcher (项目切换器)

- 显示当前项目名称
- 点击展开内嵌项目列表
- 支持添加新项目
- 项目列表显示项目名称和路径

#### FileTree (文件目录树)

- 使用 vue-finder 组件
- 默认完整展开
- 支持手动折叠
- 高亮当前选中文件

#### MarkdownViewer (Markdown 渲染器)

- 使用 markstream-vue 渲染
- 支持代码高亮
- 支持表格渲染
- 支持本地图片预览

---

## 实时同步机制

### 文件监听

```typescript
// server/utils/fileWatcher.ts
import chokidar from 'chokidar';

export function createFileWatcher(projectPath: string, ws: WebSocket) {
  const watcher = chokidar.watch(
    `${projectPath}/.worker`,
    {
      ignored: /(^|[\/\\])\../, // 忽略隐藏文件
      persistent: true,
      ignoreInitial: true,
    }
  );

  watcher
    .on('add', path => sendChange('file:added', path))
    .on('change', path => sendChange('file:changed', path))
    .on('unlink', path => sendChange('file:deleted', path));

  function sendChange(type: string, path: string) {
    ws.send(JSON.stringify({
      type,
      payload: { path, timestamp: Date.now() }
    }));
  }

  return watcher;
}
```

### WebSocket 连接

```typescript
// composables/useWebSocket.ts
export function useWebSocket() {
  const ws = ref<WebSocket | null>(null);
  const isConnected = ref(false);

  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws.value = new WebSocket(`${protocol}//localhost:3000/_ws`);

    ws.value.onopen = () => { isConnected.value = true; };
    ws.value.onclose = () => { isConnected.value = false; };
    ws.value.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleMessage(message);
    };
  }

  return { ws, isConnected, connect };
}
```

---

## 启动流程

```
用户运行 npm run dev
        │
        ▼
┌───────────────────────┐
│   Nuxt Server 启动    │
│   localhost:3000      │
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│   读取 ~/.worker/     │
│   project.json        │
│   加载项目列表        │
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│   用户打开浏览器      │
│   localhost:3000      │
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│   前端建立 WebSocket  │
│   连接                │
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│   后端启动文件监听    │
│   监听当前项目        │
│   .worker/ 目录       │
└───────────────────────┘
        │
        ▼
   用户可以正常使用
```

---

## 开发阶段

### Phase 1: 项目初始化

- [ ] 创建 Nuxt.js 项目
- [ ] 安装依赖 (shadcn-vue, vue-finder, markstream-vue, chokidar)
- [ ] 配置 Tailwind CSS
- [ ] 配置 TypeScript

### Phase 2: 后端 API

- [ ] 实现项目配置存储 (~/.worker/project.json)
- [ ] 实现项目管理 API
- [ ] 实现文件读取 API
- [ ] 实现目录树 API

### Phase 3: WebSocket + 文件监听

- [ ] 实现 WebSocket 服务端
- [ ] 实现 chokidar 文件监听
- [ ] 实现变更推送机制

### Phase 4: 前端页面

- [ ] 实现侧边栏布局
- [ ] 实现项目切换器
- [ ] 集成 vue-finder 文件树
- [ ] 集成 markstream-vue 渲染器
- [ ] 实现 WebSocket 客户端

### Phase 5: 测试与优化

- [ ] 功能测试
- [ ] 性能优化
- [ ] 错误处理

---

## 风险与应对

| 风险 | 影响 | 应对策略 |
|------|------|---------|
| vue-finder 兼容性问题 | 文件树无法正常显示 | 准备备选方案 (vue3-tree-view) |
| markstream-vue 功能不足 | Markdown 渲染效果差 | 准备备选方案 (markdown-it) |
| 文件监听性能问题 | 大量文件时卡顿 | 使用防抖 + 增量更新 |
| WebSocket 连接断开 | 实时同步失效 | 实现自动重连机制 |

---

## 下一步

设计文档已确认，下一步将调用 writing-plans 技能创建详细的实施计划。