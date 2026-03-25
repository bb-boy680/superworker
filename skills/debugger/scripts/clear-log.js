#!/usr/bin/env node
/**
 * Debugger Skill - Clear Log Script
 *
 * 快速清空当前调试会话的日志文件。
 *
 * Usage:
 *   node clear-log.js [options]
 *
 * Options:
 *   --all        清空所有会话的日志文件
 *   --session    指定会话 ID（默认从环境变量读取）
 *   --verbose    显示详细处理信息
 *
 * Examples:
 *   # 清空当前会话日志
 *   node clear-log.js
 *
 *   # 清空所有日志
 *   node clear-log.js --all
 *
 *   # 清空指定会话
 *   node clear-log.js --session xxx-xxx-xxx
 */

const fs = require('fs');
const path = require('path');

// 日志目录
const LOG_DIR = '.worker/debug/logs';

// 颜色定义
const COLORS = {
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  blue: '\x1b[0;34m',
  nc: '\x1b[0m',
};

/**
 * 获取当前会话 ID
 */
function getSessionId() {
  // 从环境变量获取
  if (process.env.DEBUG_SESSION_ID) {
    return process.env.DEBUG_SESSION_ID;
  }

  // 尝试从 .worker/.env 读取
  try {
    const envPath = '.worker/.env';
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const match = content.match(/DEBUG_SESSION_ID=(.+)/);
      if (match) {
        return match[1].trim();
      }
    }
  } catch (err) {
    // ignore
  }

  return null;
}

/**
 * 清空指定文件
 */
function clearFile(filePath, verbose) {
  try {
    const stats = fs.statSync(filePath);
    const size = stats.size;

    // 清空文件内容（写入空字符串）
    fs.writeFileSync(filePath, '', 'utf-8');

    if (verbose) {
      console.log(`${COLORS.green}✅ 已清空${COLORS.nc} ${filePath} (${formatBytes(size)})`);
    }
    return { success: true, size };
  } catch (err) {
    console.log(`${COLORS.red}❌ 无法清空${COLORS.nc} ${filePath}: ${err.message}`);
    return { success: false, size: 0 };
  }
}

/**
 * 格式化字节大小
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);

  // 解析参数
  const options = {
    all: args.includes('--all'),
    verbose: args.includes('--verbose'),
    session: null,
  };

  // 解析 --session 参数
  const sessionIndex = args.indexOf('--session');
  if (sessionIndex !== -1 && args[sessionIndex + 1]) {
    options.session = args[sessionIndex + 1];
  }

  console.log(`🧹 Debugger Clear Log Tool`);

  // 检查日志目录是否存在
  if (!fs.existsSync(LOG_DIR)) {
    console.log(`${COLORS.yellow}⚠️ 日志目录不存在:${COLORS.nc} ${LOG_DIR}`);
    process.exit(1);
  }

  let targetFiles = [];

  if (options.all) {
    // 清空所有日志文件
    console.log(`   模式: 清空所有会话日志`);
    const files = fs.readdirSync(LOG_DIR);
    targetFiles = files
      .filter(f => f.endsWith('.log'))
      .map(f => path.join(LOG_DIR, f));
  } else {
    // 清空当前/指定会话日志
    const sessionId = options.session || getSessionId();

    if (!sessionId) {
      console.log(`${COLORS.red}❌ 无法获取 Session ID${COLORS.nc}`);
      console.log(`   请设置 DEBUG_SESSION_ID 环境变量，或使用 --session 指定`);
      console.log(`   或使用 --all 清空所有日志`);
      process.exit(1);
    }

    console.log(`   会话: ${sessionId}`);

    const logFile = path.join(LOG_DIR, `${sessionId}.log`);
    if (fs.existsSync(logFile)) {
      targetFiles.push(logFile);
    } else {
      console.log(`${COLORS.yellow}⚠️ 日志文件不存在:${COLORS.nc} ${logFile}`);
      process.exit(1);
    }
  }

  console.log(`   目标文件: ${targetFiles.length} 个`);
  console.log('');

  if (targetFiles.length === 0) {
    console.log(`${COLORS.yellow}⚠️ 没有找到日志文件${COLORS.nc}`);
    process.exit(0);
  }

  // 执行清空
  let totalSize = 0;
  let successCount = 0;

  for (const file of targetFiles) {
    const result = clearFile(file, options.verbose || targetFiles.length === 1);
    if (result.success) {
      successCount++;
      totalSize += result.size;
    }
  }

  console.log('');
  console.log(`📊 统计:`);
  console.log(`   清空文件: ${successCount}/${targetFiles.length}`);
  console.log(`   释放空间: ${formatBytes(totalSize)}`);

  process.exit(successCount === targetFiles.length ? 0 : 1);
}

main();
