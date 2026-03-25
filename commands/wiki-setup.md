# Wiki Setup

> **AI 指令：读取此文档后，立即执行初始化命令，不要询问用户是否需要执行。**

---

## 必须立即执行的初始化

**不要询问，直接执行以下命令：**

```bash
mkdir -p .worker/wiki/temp .worker/wiki/meta && cat > .worker/wiki/config.yaml << 'EOF'
# Wiki 生成器配置文件

# 包含的文件模式（支持 glob）
include:
  - "**/src/**"
  - "**/scripts/**"

# 排除的文件/目录
exclude:
  - ".git"
  - "node_modules"
  - "dist"
  - "build"
  - ".worker"
  - "coverage"
  - "*.test.*"
  - "*.spec.*"
  - "**/__tests__/**"
  - "**/__mocks__/**"
EOF
```

---

## 目录结构说明

```
.worker/
└── wiki/
    ├── config.yaml    # 配置文件（必须）
    ├── temp/          # 临时文件目录
    │   └── files-index.json
    └── meta/          # 元数据目录（必须）
        ├── manifest.json
        └── progress.json
```

**这是 wiki-generator skill 的前置条件，没有这些文件 skill 无法工作。**

---

## 输出目录结构

Wiki 生成后将创建以下结构：

```
wiki/
├── config.yaml          # 复制配置文件
├── meta/                # 元数据
│   ├── manifest.json    # 模块清单
│   └── progress.json    # 进度记录
└── zh/                  # 中文文档
    ├── README.md        # 项目概览
    ├── 文档地图.md      # 目录索引
    └── {模块名}/        # 各模块目录
        ├── README.md
        └── ...
```