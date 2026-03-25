# 项目类型检测指南

根据特征文件自动检测项目类型，选择合适的文档生成策略。

---

## 前端项目

| 特征文件 | 检测内容 | 项目类型 |
|---------|---------|---------|
| package.json | dependencies.react | React 前端 |
| package.json | dependencies.vue | Vue 前端 |
| package.json | dependencies.next | Next.js |
| package.json | dependencies.nuxt | Nuxt.js |
| package.json | dependencies.angular | Angular |

### 前端项目特殊处理
- 重点分析 components/ 和 pages/ 目录
- 提取 Props、Events、Slots 信息
- 识别路由配置

---

## 后端项目

| 特征文件 | 检测内容 | 项目类型 |
|---------|---------|---------|
| package.json | dependencies.express | Express |
| package.json | dependencies.fastify | Fastify |
| package.json | dependencies.nestjs | NestJS |
| pom.xml | spring-boot | Spring Boot |
| build.gradle | spring-boot | Spring Boot |
| requirements.txt | django | Django |
| requirements.txt | flask | Flask |
| requirements.txt | fastapi | FastAPI |

### 后端项目特殊处理
- 重点分析 controllers/ 和 routes/ 目录
- 提取 API 端点、参数、响应类型
- 识别数据模型

---

## 全栈项目

| 特征文件组合 | 项目类型 |
|-------------|---------|
| package.json + Next.js deps | Next.js 全栈 |
| package.json + Nuxt deps | Nuxt.js 全栈 |
| pom.xml + React/Vue | Java + 前端 |

### 全栈项目特殊处理
- 分别处理前端和后端代码
- 生成分层文档结构
- 建立前后端关联

---

## 其他语言项目

| 特征文件 | 项目类型 |
|---------|---------|
| go.mod | Go 项目 |
| Cargo.toml | Rust 项目 |
| composer.json | PHP 项目 |
| Gemfile | Ruby 项目 |
| pubspec.yaml | Flutter/Dart |

---

## 检测优先级

当存在多个特征文件时，按以下优先级选择：

1. **显式框架依赖**（如 react, vue, django）
2. **构建工具**（如 vite, webpack）
3. **语言特征**（如 package.json, go.mod）
4. **通用文件**（如 README.md 中的描述）

---

## 配置覆盖

用户可以通过配置显式指定项目类型：

```yaml
# .worker/wiki/config.yaml
project:
  type: "react"  # 强制指定项目类型
  framework: "nextjs"  # 指定框架
```
