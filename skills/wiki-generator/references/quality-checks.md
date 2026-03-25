# 质量保障与防偷懒机制

本文档定义 wiki-generator 执行过程中的质量控制检查点。

---

## 清单强制执行

### 生成文档前
- 必须读取 manifest.json
- 必须知道 totalModules

### 生成文档时
- 每完成一个模块，更新 status = "documented"
- 不能跳过任何一个模块

### 生成文档后
- 对比清单，验证 complete 数量 == totalModules
- 检查 pending 列表是否为空

---

## 显式检查点

每个 Phase 必须：
- 保存 manifest.json
- 输出该 Phase 摘要
- 确认任务完成

---

## 可恢复执行

中断后重新启动：
1. Read(".worker/wiki/meta/manifest.json")
2. 找到第一个 status == "pending" 的任务
3. 从该任务继续

---

## 分层检索强制检查

### Level 1 完成检查
- fileIndex.totalFiles > 0
- fileIndex.files 包含所有 Glob 匹配

### Level 2 完成检查
- modules.candidates.length > 0
- 每个候选模块有 entry 文件
- entry 文件已 Read

### Level 3 完成检查
- 所有确认模块有 files 列表
- 覆盖率 >= 95%（模块文件 + 孤儿文件 / 总文件）
- 无孤立文件（或孤儿文件已分组）

### 最终检查
- `.worker/wiki/meta/manifest.json` 包含完整模块信息
- 依赖图已建立
- 覆盖率 = 100%

---

## 覆盖率计算

```
覆盖率 = (模块文件数 + 孤儿文件数) / 总文件数 * 100%
```

| 覆盖率 | 状态 |
|--------|------|
| 100% | 完美 |
| >= 95% | 可接受 |
| < 95% | 需要检查 |

---

## 错误处理策略

| 失败场景 | 降级方案 |
|----------|----------|
| AI 聚类失败 | 回退到目录分组 |
| 入口文件读取失败 | 标记为待人工确认 |
| 依赖解析失败 | 仅记录入口文件信息 |
| 大文件无法读取 | 只读取前 100 行 |
