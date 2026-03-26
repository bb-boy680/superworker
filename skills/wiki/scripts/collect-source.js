#!/usr/bin/env node
/**
 * 收集项目源代码文件
 * 用法: node collect-source.js
 * 配置: .worker/wiki/config.yaml (exclude 配置)
 * 输出: .worker/wiki/temp/all_source_files.txt
 */

const fs = require('fs');
const path = require('path');

// 支持的源代码扩展名
const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.py',
  '.go',
  '.rs',
  '.java',
  '.kt',
  '.swift',
  '.vue',
  '.svelte',
  '.php',
  '.rb',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.cs',
  '.fs',
  '.fsx',
  '.ml',
  '.mli',
]);

// 默认排除（即使 config.yaml 没有指定）
const DEFAULT_EXCLUDE = [
  'node_modules',
  '.git',
  '.github',
  '.vscode',
  'coverage',
  '__pycache__',
  'venv',
  '.venv',
  '.worker',
];

/**
 * 读取并解析 config.yaml
 * 固定路径: .worker/wiki/config.yaml
 */
function loadConfig(projectRoot) {
  const configPath = path.join(projectRoot, '.worker', 'wiki', 'config.yaml');

  if (!fs.existsSync(configPath)) {
    console.log('未找到 config.yaml，使用默认配置');
    return { exclude: [] };
  }

  try {
    const content = fs.readFileSync(configPath, 'utf8');
    return parseYaml(content);
  } catch (e) {
    console.error(`读取配置文件失败: ${configPath}`, e.message);
    return { exclude: [] };
  }
}

/**
 * 简单 YAML 解析（只解析 exclude 数组）
 */
function parseYaml(content) {
  const result = { exclude: [] };
  const lines = content.split('\n');
  let inExclude = false;
  let excludeIndent = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // 检测 exclude: 开始
    if (trimmed.startsWith('exclude:')) {
      inExclude = true;
      excludeIndent = line.indexOf('exclude:');
      continue;
    }

    // 检测其他同层级或更高层级的键，退出 exclude
    if (
      inExclude &&
      trimmed &&
      !line.startsWith(' ') &&
      !line.startsWith('#')
    ) {
      inExclude = false;
      continue;
    }

    // 解析 exclude 数组项
    if (inExclude && trimmed.startsWith('- ')) {
      const currentIndent = line.indexOf('- ');
      if (currentIndent > excludeIndent) {
        const value = trimmed
          .slice(2)
          .trim()
          .replace(/^["']|["']$/g, '');
        if (value) {
          result.exclude.push(value);
        }
      }
    }
  }

  return result;
}

/**
 * 判断路径是否匹配排除规则
 */
function shouldExclude(filePath, excludeRules, projectRoot) {
  const relativePath = path.relative(projectRoot, filePath);
  const normalizedPath = relativePath.replace(/\\/g, '/');
  const fileName = path.basename(normalizedPath);
  const dirName = path.dirname(normalizedPath);
  const parts = normalizedPath.split('/');

  for (const rule of excludeRules) {
    // 1. 通配符模式: *.test.ts, **/tests/**
    if (rule.includes('*') || rule.includes('?')) {
      if (matchGlob(fileName, rule) || matchGlob(normalizedPath, rule)) {
        return true;
      }
      continue;
    }

    // 2. 目录匹配: node_modules, dist, build
    // 检查路径中是否包含该目录
    if (parts.includes(rule)) {
      return true;
    }

    // 3. 后缀匹配: .test.ts (没有通配符但有多个点)
    if (rule.startsWith('.') && fileName.endsWith(rule)) {
      return true;
    }

    // 4. 精确文件名匹配
    if (fileName === rule) {
      return true;
    }
  }

  return false;
}

/**
 * 简单的 glob 匹配
 */
function matchGlob(str, pattern) {
  // 将 glob 模式转为正则表达式
  let regexPattern = pattern
    .replace(/\*\*/g, '{{GLOBSTAR}}') // 先保护 **
    .replace(/\./g, '\\.') // 转义点号
    .replace(/\*/g, '[^/]*') // * 匹配任意非斜杠字符
    .replace(/\?/g, '.') // ? 匹配单个字符
    .replace(/{{GLOBSTAR}}/g, '.*'); // ** 匹配任意字符（包括斜杠）

  try {
    const regex = new RegExp('^' + regexPattern + '$');
    return regex.test(str);
  } catch (e) {
    // 如果正则构造失败，使用简单包含检查
    const simplePattern = pattern.replace(/\*/g, '').replace(/\?/g, '');
    return str.includes(simplePattern);
  }
}

/**
 * 递归收集源代码文件
 */
function collectSourceFiles(dir, projectRoot, excludeRules, result = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    // 提前排除目录（优化性能）
    if (item.isDirectory()) {
      if (shouldExclude(fullPath, excludeRules, projectRoot)) {
        continue;
      }
      collectSourceFiles(fullPath, projectRoot, excludeRules, result);
    } else if (item.isFile()) {
      // 检查是否是源代码文件
      const ext = path.extname(item.name).toLowerCase();
      if (!SOURCE_EXTENSIONS.has(ext)) {
        continue;
      }

      // 检查排除规则
      if (shouldExclude(fullPath, excludeRules, projectRoot)) {
        continue;
      }

      result.push(fullPath);
    }
  }

  return result;
}

/**
 * 统计各目录源文件数量
 */
function countByDirectory(files, projectRoot) {
  const counts = new Map();

  for (const file of files) {
    const dir = path.dirname(path.relative(projectRoot, file)) || '.';
    const normalizedDir = dir.replace(/\\/g, '/');
    counts.set(normalizedDir, (counts.get(normalizedDir) || 0) + 1);
  }

  // 按数量降序排序
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

/**
 * 主函数
 */
function main() {
  // 固定路径配置
  const projectRoot = process.cwd();
  const outputFile = path.join(projectRoot, '.worker', 'wiki', 'temp', 'all_source_files.txt');
  const statsFile = outputFile.replace('.txt', '-by-dir.txt');

  console.log(`项目根目录: ${projectRoot}`);
  console.log(`输出文件: ${outputFile}`);

  // 1. 加载配置 (固定路径: .worker/wiki/config.yaml)
  const config = loadConfig(projectRoot);
  const excludeRules = [...DEFAULT_EXCLUDE, ...config.exclude];

  console.log(`排除规则: ${excludeRules.length} 条`);
  console.log(`自定义排除: ${config.exclude.join(', ') || '无'}`);

  // 2. 确保输出目录存在
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 3. 收集源代码文件
  console.log('正在扫描源代码文件...');
  const startTime = Date.now();
  const sourceFiles = collectSourceFiles(
    projectRoot,
    projectRoot,
    excludeRules,
  );
  const duration = Date.now() - startTime;

  // 4. 按相对路径排序并写入文件
  const sortedFiles = sourceFiles
    .map((f) => path.relative(projectRoot, f).replace(/\\/g, '/'))
    .sort();

  fs.writeFileSync(outputFile, sortedFiles.join('\n') + '\n', 'utf8');

  // 5. 生成目录统计
  const dirStats = countByDirectory(sourceFiles, projectRoot);
  const statsContent = dirStats
    .map(([dir, count]) => `${count.toString().padStart(6)}  ${dir}`)
    .join('\n');
  fs.writeFileSync(statsFile, statsContent + '\n', 'utf8');

  // 6. 输出摘要
  console.log('\n扫描完成!');
  console.log(`- 总文件数: ${sourceFiles.length}`);
  console.log(`- 耗时: ${duration}ms`);
  console.log(`- 结果文件: ${outputFile}`);
  console.log(`- 统计文件: ${statsFile}`);

  // 7. 输出前10个文件最多的目录
  console.log('\n文件最多的目录 (Top 10):');
  dirStats.slice(0, 10).forEach(([dir, count]) => {
    console.log(`  ${count.toString().padStart(4)}  ${dir}`);
  });

  // 返回结果供其他脚本使用
  return {
    totalFiles: sourceFiles.length,
    outputFile,
    statsFile,
    files: sortedFiles,
  };
}

// 执行
if (require.main === module) {
  try {
    const result = main();
    // 输出 JSON 供管道使用
    console.log('\n' + JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

module.exports = { collectSourceFiles, loadConfig, shouldExclude, matchGlob };
