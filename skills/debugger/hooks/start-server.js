#!/usr/bin/env node
/**
 * Debugger Skill Hook - 启动日志收集服务
 *
 * 触发时机：skill 激活时自动启动
 * 功能：接收前端埋点日志并写入 .worker/debug/logs/{sessionId}.log
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// 路径配置（从项目根目录开始）
const ROOT_DIR = process.cwd();
const DEBUG_DIR = path.join(ROOT_DIR, '.worker', 'debug');
const CONFIG_PATH = path.join(DEBUG_DIR, 'config.yaml');
const LOGS_DIR = path.join(DEBUG_DIR, 'logs');

// 使用环境变量作为 sessionId（仅用于日志显示）
const SESSION_ID = process.env.WT_SESSION || process.env.CLAUDE_CODE_SESSION_ID || `debug-${Date.now()}`;

// 简单的 YAML 解析（只提取 port）
function parsePortFromYaml(content) {
    const match = content.match(/^port:\s*(\d+)/m);
    return match ? parseInt(match[1], 10) : 9229;
}

// 读取配置
let port = 9229;
try {
    const content = fs.readFileSync(CONFIG_PATH, 'utf8');
    port = parsePortFromYaml(content);
} catch (e) {
    console.log('[debugger-hook] config.yaml not found, using default port 9229');
}

// 确保日志目录存在
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// 创建日志服务
const server = http.createServer((req, res) => {
    // 健康检查
    if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            service: 'debugger-log',
            sessionId: SESSION_ID
        }));
        return;
    }

    // 接收日志
    if (req.url === '/debug/log' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const log = JSON.parse(body);
                const sessionId = log.sessionId || SESSION_ID;
                const logFile = path.join(LOGS_DIR, `${sessionId}.log`);

                // 追加写入日志文件
                const line = JSON.stringify(log) + '\n';
                fs.appendFileSync(logFile, line);

                // 控制台输出（可选）
                console.log(`[debugger] ${log.file}:${log.line} ${log.func}`);
            } catch (e) {
                // 静默失败，不影响主逻辑
            }
            res.writeHead(200);
            res.end('ok');
        });
        return;
    }

    res.writeHead(404);
    res.end('not found');
});

// 启动服务
server.listen(port, () => {
    console.log(`[debugger-hook] Log server running on port ${port}`);
    console.log(`[debugger-hook] Session ID: ${SESSION_ID}`);
    console.log(`[debugger-hook] Logs will be saved to: ${path.join(LOGS_DIR, `${SESSION_ID}.log`)}`);
});

// 优雅退出
process.on('SIGINT', () => {
    console.log('\n[debugger-hook] Shutting down...');
    server.close(() => {
        process.exit(0);
    });
});
