# auto-worker Setup

初始化 auto-worker 工程目录，创建调试埋点和文档生成所需的工作目录结构。

**流程**：Step 1（Debug 目录）→ Step 2（Wiki 目录）

---

## Step 1：初始化 Debug 目录

用于存放调试日志和配置。

```bash
mkdir -p $(pwd)/.worker/debug/logs
cat "${CLAUDE_PLUGIN_ROOT}/skills/debugger/assets/config.yaml" > "$(pwd)/.worker/debug/config.yaml"
```

**目录用途**：
- `config.yaml` — 调试器配置
- `logs/` — HTTP 日志服务接收的日志文件

---

## Step 2：初始化 Wiki 目录

用于存放项目文档生成相关文件。

```bash
mkdir -p $(pwd)/.worker/wiki/meta
mkdir -p $(pwd)/.worker/wiki/temp
mkdir -p $(pwd)/.worker/wiki/content/zh
cat "${CLAUDE_PLUGIN_ROOT}/skills/wiki/assets/config.yaml" > "$(pwd)/.worker/wiki/config.yaml"
```

**目录用途**：
- `config.yaml` — Wiki 配置
- `meta/` — 文档元数据
- `temp/` — 临时处理文件
- `content/zh/` — 中文文档输出目录

---

## 最终目录结构

```
.worker/
├── debug/
│   ├── config.yaml
│   └── logs/
└── wiki/
    ├── config.yaml
    ├── meta/
    ├── temp/
    └── content/
        └── zh/
```