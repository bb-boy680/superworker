# 主成员监控循环详细说明

## 监控循环流程图

```
┌─────────────────────────────────────┐
│ 循环开始                            │
│                                     │
│ 等待 10 秒                          │
│                                     │
│ Bash: tmux capture-pane -p -t %2    │
│   查看最新 50 行输出                 │
│                                     │
│ 检查输出内容：                       │
│   ├─ 包含 "Error" / "报错" / 异常？   │
│   │   → 执行异常处理流程             │
│   │                                  │
│   ├─ 包含 "completed" / 完成标识？   │
│   │   → 跳出循环，执行 2.6           │
│   │                                  │
│   └─ 正常执行中                      │
│       → 继续循环                     │
│                                     │
│ TaskList 检查子成员任务状态          │
│   ├─ 状态异常 → 执行异常处理         │
│   └─ 正常 → 继续循环                 │
│                                     │
└───────────────┬─────────────────────┘
                │
                ▼
          回到循环开始
```

## 异常处理流程

```
1. Bash: tmux kill-pane -t %2  (关闭子成员pane)
2. TeamDelete 销毁团队
3. 等待 3-5 秒（确保 TeamDelete 完全生效）
   ```bash
   sleep 3
   ```
4. 如重建仍提示 "Already leading team"，再次执行 TeamDelete 并延长等待时间
   ```bash
   sleep 5
   ```
5. 回到步骤 2.4 重新创建子成员
6. 重新开始监控循环
```

## 常用命令参考

```bash
# 查询子成员的窗口 id
tmux list-panes

# 使用 tmux capture-pane 检查健康
tmux capture-pane -p -t {窗口id} 2>/dev/null | tail -50

# 关闭 tmux pane
tmux kill-pane -t {窗口id} 2>/dev/null
```

## 监控期间行为准则

**✅ 允许操作：**
- 每 10-15 秒执行 tmux capture-pane 检查
- 使用 TaskList 查询子成员任务状态
- 发现异常时执行 kill-pane 和重建
- 子成员完成后 Read modules.json 验证（只读）

**🚫 禁止操作：**
- 使用 CronCreate（必须主动检查）
- 长时间 sleep 而不检查（>30秒不检查算违规）
- 读取 package.json 分析项目（子成员的工作）
- 执行 module-manager.js 脚本（子成员的工作）
- 生成/修改模块数据（子成员的工作）
- 以"帮忙"为由执行子成员工作
