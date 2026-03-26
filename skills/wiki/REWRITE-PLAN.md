# skills/wiki 改造计划

## 目标
将 `skills/wiki` 从 **Team 协作模式** 改为 **subAgent 顺序执行模式**，大幅简化架构。

## 现状分析

### 当前架构问题
1. **过度复杂**：使用 Team + tmux 监控，增加环境依赖
2. **调试困难**：子成员失败时需要 kill-pane → TeamDelete → 重建
3. **token 浪费**：监控循环本身消耗大量 token
4. **不必要的并行**：文档生成是流水线任务，不需要并行协作

### 当前流程
```
步骤 1: 初始化检查
    ↓
步骤 2: 模块扫描（Team + tmux 监控）
    ↓
步骤 3: 文件结构生成（Team + tmux 监控）
    ↓
步骤 4: Wiki 文档生成（Team + tmux 监控）
```

## 改造方案

### 新架构
```
skills/wiki/
├── SKILL.md                    # 简化，删除 Team/tmux 相关内容
├── agents/
│   ├── coordinator.md          # 协调器（原 team-lead 简化）
│   ├── module-scanner.md       # 独立 subAgent
│   └── wiki-generator.md       # 独立 subAgent
├── scripts/
│   ├── init-wiki.js            # 初始化
│   ├── collect-source.js       # 收集源代码（保留）
│   ├── module-manager.js       # 模块管理
│   └── progress-manager.js     # 进度管理
└── references/
    ├── split-module.md         # 模块扫描策略
    └── data-structures/        # 数据结构说明
```

### 新流程（subAgent 顺序执行）
```
步骤 1: 初始化
    ├── node scripts/init-wiki.js
    └── node scripts/collect-source.js
    ↓
步骤 2: 模块扫描（subAgent）
    ├── Agent(module-scanner)
    ├── 读取源码文件列表
    ├── 分析语义，识别模块
    └── 写入 modules.json
    ↓
步骤 3: Wiki 文档生成（subAgent）
    ├── node scripts/progress-manager.js split-module
    ├── for 每个待生成模块:
    │   └── Agent(wiki-generator, moduleId)
    └── 更新 progress.json
    ↓
步骤 4: 完成
    └── 生成首页索引
```

## 具体任务

### 任务 1: 重写 SKILL.md
- 删除 TeamCreate / TeamDelete 指令
- 删除 tmux capture-pane 监控循环
- 删除 TaskList 检查子成员状态
- 简化步骤检查清单
- 添加 subAgent 顺序执行说明

### 任务 2: 改造 Agents

#### team-lead.md → coordinator.md
- 删除 tmux 相关指令
- 删除 Team 管理相关指令
- 保留协调职责和步骤顺序

#### module-scanner.md
- 删除 Team 相关上下文
- 简化为接收参数执行
- 直接返回结果到文件

#### wiki-generator.md
- 删除 Team 相关上下文
- 保留文档生成核心逻辑

### 任务 3: 保留 Scripts
- `init-wiki.js`：初始化目录和配置
- `collect-source.js`：收集源代码文件
- `module-manager.js`：模块状态管理
- `progress-manager.js`：进度管理

### 任务 4: 清理 References
- 删除 `monitoring-loop.md`
- 保留 `split-module.md`
- 保留 `data-structures/`

## 预期效果

| 方面 | 改造前 | 改造后 |
|------|--------|--------|
| 代码行数 | ~2000 行 | ~800 行 |
| 复杂度 | 高（Team + tmux） | 低（subAgent） |
| 环境依赖 | 需要 tmux | 无特殊依赖 |
| 调试难度 | 难 | 简单 |
| token 消耗 | 高 | 低 |
| 可维护性 | 低 | 高 |

## 下一步行动
1. 重写 SKILL.md
2. 改造 3 个 Agent 定义
3. 验证 scripts 功能完整
4. 清理 references
5. 测试改造后的流程
