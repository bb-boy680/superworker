#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// 读取 stdin
const stdinContent = fs.readFileSync(0, 'utf-8').trim();

// 解析 JSON
let sessionId = '';
let cwd = '';
try {
    const data = JSON.parse(stdinContent);
    sessionId = data.session_id || '';
    cwd = data.cwd || '';
} catch (e) {
    console.error('JSON parse error:', e.message);
}

// 获取项目根目录（假设脚本在 hooks/ 目录下）

// 创建 .worker/debug 目录
const workerDir = path.join(cwd, '.worker');

// 写入 .env 文件
const envFile = path.join(workerDir, '.env');
const envContent = `DEBUG_SESSION_ID=${sessionId}\n`;
fs.writeFileSync(envFile, envContent, { encoding: 'utf-8' });

process.exit(0);
