# debugger 使用

## debug 初始化

初始化 debugger 配置文件、他会在 .worker/debug 生成一个文件
```bash
/auto-worker:debugger-setup
```

```
.worker/
├── debug/                           
│   ├── logs/
│   ├── config.yaml
```

### config.yaml

这个文件是 debug 的配置文件、他的初始化内容如下：

```yaml
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

```

---


## 开始调试

初始化完毕后、在 claude 输入 `/clear` 并开启新的会话
然后输入 `/debugger` 指令开始调试

debugger 是一个调试的 skills、你也可以不用指定