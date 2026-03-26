#!/usr/bin/env node
/**
 * Debugger Skill - Cleanup Script (Node.js version)
 *
 * 一键清理代码中的调试埋点。
 * 删除所有 #region DEBUG 到 #endregion DEBUG 之间的代码块。
 *
 * Usage:
 *   node cleanup.js <file_or_directory> [options]
 *
 * Options:
 *   --dry-run    预览将要删除的内容，不实际删除
 *   --backup     删除前创建 .bak 备份文件
 *   --verbose    显示详细的处理信息
 *
 * Examples:
 *   # 清理单个文件
 *   node cleanup.js src/main.js
 *
 *   # 清理整个目录（递归）
 *   node cleanup.js src/ --backup
 *
 *   # 预览将要删除的内容
 *   node cleanup.js src/ --dry-run
 */

const fs = require('fs');
const path = require('path');

// 支持的文件扩展名
const SUPPORTED_EXTENSIONS = new Set([
  '.js', '.ts', '.jsx', '.tsx',  // JavaScript/TypeScript
  '.vue',                        // Vue
  '.py',                         // Python
  '.java',                       // Java
  '.go',                         // Go
  '.c', '.cpp', '.h', '.hpp',    // C/C++
  '.cs',                         // C#
  '.rb',                         // Ruby
  '.php',                        // PHP
  '.swift',                      // Swift
  '.kt',                         // Kotlin
  '.rs',                         // Rust
]);

// 颜色定义
const COLORS = {
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  blue: '\x1b[0;34m',
  nc: '\x1b[0m',  // No Color
};

// 埋点标记正则表达式
const DEBUG_BLOCK_REGEX = /^[ \t]*(?:#|\/\/)[ \t]*#region[ \t]+DEBUG.*?\r?\n[\s\S]*?^[ \t]*(?:#|\/\/)[ \t]*#?[ \t]*endregion[ \t]*DEBUG/gmi;

/**
 * 检查文件扩展名是否支持
 */
function isSupportedFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext);
}

/**
 * 统计埋点数量
 */
function countDebugBlocks(content) {
  const matches = content.match(DEBUG_BLOCK_REGEX);
  return matches ? matches.length : 0;
}

/**
 * 清理单个文件中的埋点代码
 */
function cleanupFile(filePath, options) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.log(`${COLORS.red}❌ 无法读取文件 ${filePath}:${COLORS.nc} ${err.message}`);
    return { success: false, hasDebug: false };
  }

  // 检查是否包含埋点
  const count = countDebugBlocks(content);
  if (count === 0) {
    if (options.verbose) {
      console.log(`${COLORS.blue}⏭️  跳过${COLORS.nc} ${filePath} (无埋点)`);
    }
    return { success: true, hasDebug: false };
  }

  if (options.dryRun) {
    console.log(`${COLORS.blue}🔍 [预览]${COLORS.nc} ${filePath}: 将删除 ${count} 个埋点块`);

    // 显示埋点预览
    let match;
    const regex = new RegExp(DEBUG_BLOCK_REGEX.source, 'gmi');
    let index = 1;
    while ((match = regex.exec(content)) !== null) {
      const lines = match[0].split(/\r?\n/);
      console.log(`   埋点 #${index}:`);
      const previewLines = lines.slice(0, 5);
      previewLines.forEach(line => console.log(`   ${line}`));
      if (lines.length > 5) {
        console.log(`   ... (${lines.length - 5} more lines)`);
      }
      console.log('');
      index++;
    }
    return { success: true, hasDebug: true };
  }

  // 创建备份
  if (options.backup) {
    const backupPath = `${filePath}.bak`;
    try {
      fs.copyFileSync(filePath, backupPath);
      if (options.verbose) {
        console.log(`${COLORS.blue}💾 已创建备份:${COLORS.nc} ${backupPath}`);
      }
    } catch (err) {
      console.log(`${COLORS.red}❌ 无法创建备份 ${backupPath}:${COLORS.nc} ${err.message}`);
      return { success: false, hasDebug: true };
    }
  }

  // 执行清理
  const cleanedContent = content
    .replace(DEBUG_BLOCK_REGEX, '')
    .replace(/\n{4,}/g, '\n\n\n');  // 清理多余空行

  try {
    fs.writeFileSync(filePath, cleanedContent, 'utf-8');
    console.log(`${COLORS.green}✅ 已清理${COLORS.nc} ${filePath}: 删除了 ${count} 个埋点块`);
    return { success: true, hasDebug: true };
  } catch (err) {
    console.log(`${COLORS.red}❌ 无法写入文件 ${filePath}:${COLORS.nc} ${err.message}`);
    return { success: false, hasDebug: true };
  }
}

/**
 * 递归遍历目录
 */
function* walkDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDirectory(fullPath);
    } else if (entry.isFile()) {
      yield fullPath;
    }
  }
}

/**
 * 清理目录
 */
function cleanupDirectory(dirPath, options) {
  let totalFiles = 0;
  let cleanedFiles = 0;
  let errors = 0;

  try {
    for (const filePath of walkDirectory(dirPath)) {
      if (!isSupportedFile(filePath)) continue;

      totalFiles++;
      const result = cleanupFile(filePath, options);

      if (result.success) {
        if (result.hasDebug) {
          cleanedFiles++;
        }
      } else {
        errors++;
      }
    }
  } catch (err) {
    console.log(`${COLORS.red}❌ 遍历目录时出错:${COLORS.nc} ${err.message}`);
    errors++;
  }

  return { totalFiles, cleanedFiles, errors };
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`Debugger Cleanup Tool (Node.js)

Usage: node cleanup.js <file_or_directory> [options]

Options:
  --dry-run    预览将要删除的内容，不实际删除
  --backup     删除前创建 .bak 备份文件
  --verbose    显示详细的处理信息
  --help       显示此帮助信息

支持的文件类型:
  JavaScript/TypeScript: .js, .ts, .jsx, .tsx
  Vue: .vue
  Python: .py
  Java: .java
  Go: .go
  C/C++: .c, .cpp, .h, .hpp
  C#: .cs
  其他: .rb, .php, .swift, .kt, .rs

Examples:
  # 清理单个文件
  node cleanup.js src/main.js

  # 清理整个目录并创建备份
  node cleanup.js src/ --backup

  # 预览模式
  node cleanup.js src/ --dry-run
`);
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);

  // 检查帮助
  if (args.length === 0 || args.includes('--help')) {
    showHelp();
    process.exit(args.length === 0 ? 1 : 0);
  }

  const targetPath = args[0];
  const options = {
    dryRun: args.includes('--dry-run'),
    backup: args.includes('--backup'),
    verbose: args.includes('--verbose'),
  };

  // 检查目标是否存在
  if (!fs.existsSync(targetPath)) {
    console.log(`${COLORS.red}❌ 路径不存在:${COLORS.nc} ${targetPath}`);
    process.exit(1);
  }

  console.log(`🧹 Debugger Cleanup Tool (Node.js)`);
  console.log(`   目标: ${targetPath}`);
  if (options.dryRun) {
    console.log(`   模式: 预览 (dry-run)`);
  }
  if (options.backup) {
    console.log(`   备份: 启用`);
  }
  console.log('');

  const stats = fs.statSync(targetPath);

  if (stats.isFile()) {
    // 单个文件
    const result = cleanupFile(targetPath, options);
    process.exit(result.success ? 0 : 1);
  } else {
    // 目录
    const { totalFiles, cleanedFiles, errors } = cleanupDirectory(targetPath, options);

    console.log('');
    console.log(`📊 统计:`);
    console.log(`   扫描文件: ${totalFiles}`);
    if (options.dryRun) {
      console.log(`   包含埋点的文件: ${cleanedFiles}`);
    } else {
      console.log(`   成功清理: ${cleanedFiles}`);
    }
    console.log(`   错误: ${errors}`);

    process.exit(errors === 0 ? 0 : 1);
  }
}

main();
