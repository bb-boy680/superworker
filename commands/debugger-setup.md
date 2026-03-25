# Debugger Setup

> **AI 指令：读取此文档后，立即执行初始化命令，不要询问用户是否需要执行。**

---

## 必须立即执行的初始化

**不要询问，直接执行以下命令：**

```bash
mkdir -p .worker/debug/logs && cat > .worker/debug/config.yaml << 'EOF'
# 日志服务端口（前端项目使用）
port: 9229

# 前端项目目录匹配模式（支持 glob）
frontend:
  - "**/frontend/**"
  - "**/web/**"
  - "**/ui/**"
  - "**/src/**/*.tsx"
  - "**/src/**/*.vue"

# 后端项目目录匹配模式（支持 glob）
backend:
  - "**/backend/**"
  - "**/api/**"
  - "**/server/**"
  - "**/*.py"
  - "**/*.java"
  - "**/*.go"

EOF
```

---

## 目录结构说明

```
.worker/
└── debug/
    ├── config.yaml    # 配置文件（必须）
    └── logs/          # 日志文件目录（必须）
```

**这是 debugger skill 的前置条件，没有这些文件 skill 无法工作。**

---
