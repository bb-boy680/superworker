/**
 * Wiki Generator - 文件收集脚本
 * 从项目代码库收集源文件路径，基于配置文件的 include/exclude 规则
 * 仅使用 Node.js 内置模块，无需第三方依赖
 */

const fs = require('fs');
const path = require('path');

// 配置文件路径（固定）
const CONFIG_PATH = '.worker/wiki/config.yaml';

/**
 * 简单 YAML 解析器（仅支持基本 key-value 和数组）
 * @param {string} content - YAML 内容
 * @returns {object} 解析后的对象
 */
function parseYaml(content) {
  const result = {};
  const lines = content.split('\n');
  let currentKey = null;
  let currentArray = null;

  for (let line of lines) {
    // 去除注释
    const commentIndex = line.indexOf('#');
    if (commentIndex !== -1) {
      line = line.substring(0, commentIndex);
    }

    // 空行
    if (!line.trim()) {
      if (currentArray) {
        currentArray = null;
        currentKey = null;
      }
      continue;
    }

    const indent = line.search(/\S/);

    // 数组项 (以 - 开头)
    if (line.trim().startsWith('- ')) {
      const value = line.trim().substring(2).trim();
      // 去除引号
      const cleanValue = value.replace(/^["']|["']$/g, '');

      if (currentKey && result[currentKey]) {
        result[currentKey].push(cleanValue);
      }
    }
    // 键值对
    else if (line.includes(':')) {
      const colonIndex = line.indexOf(':');
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();

      // 去除引号
      value = value.replace(/^["']|["']$/g, '');

      if (value === '') {
        // 可能是数组开始
        result[key] = [];
        currentKey = key;
        currentArray = result[key];
      } else {
        // 普通值
        result[key] = value;
        currentKey = null;
        currentArray = null;
      }
    }
  }

  return result;
}

/**
 * 读取配置文件
 * @param {string} projectRoot - 项目根目录
 * @returns {object} 配置对象
 * @throws {Error} 如果配置文件不存在或格式错误
 */
function loadConfig(projectRoot) {
  const configPath = path.join(projectRoot, CONFIG_PATH);

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `配置文件不存在: ${CONFIG_PATH}\n` +
      `请创建 ${CONFIG_PATH} 并配置 include/exclude 规则`
    );
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const config = parseYaml(content);

    // 验证必要字段
    if (!config.include || !Array.isArray(config.include) || config.include.length === 0) {
      throw new Error('配置文件中必须包含非空的 include 数组');
    }

    console.log(`✓ 读取配置: ${CONFIG_PATH}`);
    return {
      include: config.include,
      exclude: config.exclude || []
    };
  } catch (error) {
    throw new Error(`配置文件解析失败: ${configPath} - ${error.message}`);
  }
}

/**
 * 将 glob 模式转换为正则表达式
 * @param {string} pattern - glob 模式
 * @returns {RegExp} 正则表达式
 */
function globToRegex(pattern) {
  let regex = pattern
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.')
    .replace(/\./g, '\\.')
    .replace(/{{GLOBSTAR}}/g, '.*');

  return new RegExp(`^${regex}$`);
}

/**
 * 检查路径是否匹配任一模式
 * @param {string} filePath - 文件路径
 * @param {string[]} patterns - glob 模式数组
 * @returns {boolean}
 */
function matchesAnyPattern(filePath, patterns) {
  // 统一使用正斜杠进行匹配
  const normalizedPath = filePath.replace(/\\/g, '/');

  for (const pattern of patterns) {
    const regex = globToRegex(pattern);
    if (regex.test(normalizedPath)) {
      return true;
    }
  }
  return false;
}

/**
 * 递归遍历目录收集文件
 * @param {string} dir - 当前目录
 * @param {string} projectRoot - 项目根目录
 * @param {string[]} includePatterns - 包含模式
 * @param {string[]} excludePatterns - 排除模式
 * @param {array} results - 结果数组
 * @param {number} maxDepth - 最大深度
 * @param {number} currentDepth - 当前深度
 */
function walkDir(dir, projectRoot, includePatterns, excludePatterns, results, maxDepth = 20, currentDepth = 0) {
  if (currentDepth > maxDepth) {
    return;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(projectRoot, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      // 检查目录是否应该被排除
      if (matchesAnyPattern(relativePath + '/', excludePatterns) ||
          matchesAnyPattern(relativePath, excludePatterns)) {
        continue;
      }

      walkDir(fullPath, projectRoot, includePatterns, excludePatterns, results, maxDepth, currentDepth + 1);
    } else if (entry.isFile()) {
      // 检查文件是否应该被排除
      if (matchesAnyPattern(relativePath, excludePatterns)) {
        continue;
      }

      // 检查文件是否匹配包含模式
      if (matchesAnyPattern(relativePath, includePatterns)) {
        results.push(fullPath);
      }
    }
  }
}

/**
 * 确保目录存在
 * @param {string} dirPath - 目录路径
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✓ 创建目录: ${dirPath}`);
  }
}

/**
 * 收集文件路径
 * @param {string} projectRoot - 项目根目录
 * @param {object} config - 配置对象
 * @returns {object} 文件索引数据
 */
function collectFiles(projectRoot, config) {
  const allFiles = [];
  const stats = {
    byExtension: {},
    byDepth: {},
    totalFiles: 0
  };

  console.log('\n📁 开始收集文件...');
  console.log(`   Include: ${config.include.length} 个模式`);
  console.log(`   Exclude: ${config.exclude.length} 个模式`);

  // 从配置的 include 中提取根目录开始遍历
  const rootDirs = new Set();
  for (const pattern of config.include) {
    const rootDir = pattern.split('/')[0];
    if (rootDir && rootDir !== '**') {
      rootDirs.add(rootDir);
    }
  }

  // 如果没有明确的根目录，从项目根目录开始
  const dirsToScan = rootDirs.size > 0 ? Array.from(rootDirs) : ['.'];

  for (const dir of dirsToScan) {
    const fullDir = path.join(projectRoot, dir);
    if (fs.existsSync(fullDir) && fs.statSync(fullDir).isDirectory()) {
      walkDir(fullDir, projectRoot, config.include, config.exclude, allFiles);
    }
  }

  // 去重（同一文件可能匹配多个模式）
  const uniqueFiles = [...new Set(allFiles)];

  // 提取元数据
  const fileMetadata = uniqueFiles.map(filePath => {
    const relativePath = path.relative(projectRoot, filePath).replace(/\\/g, '/');
    const ext = path.extname(filePath);
    const depth = relativePath.split('/').length;

    // 统计扩展名
    stats.byExtension[ext] = (stats.byExtension[ext] || 0) + 1;
    // 统计深度
    stats.byDepth[depth] = (stats.byDepth[depth] || 0) + 1;

    return {
      path: filePath,
      relative: relativePath,
      dir: path.dirname(relativePath),
      name: path.basename(filePath, ext),
      ext: ext,
      depth: depth,
      isEntry: isEntryFile(filePath)
    };
  });

  stats.totalFiles = uniqueFiles.length;

  // 生成目录树
  const dirTree = buildDirectoryTree(fileMetadata);

  console.log(`   ✓ 找到 ${uniqueFiles.length} 个匹配文件`);

  return {
    files: fileMetadata,
    tree: dirTree,
    stats: stats,
    config: {
      include: config.include,
      exclude: config.exclude
    },
    collectedAt: new Date().toISOString()
  };
}

/**
 * 判断是否为入口文件
 * @param {string} filePath - 文件路径
 * @returns {boolean}
 */
function isEntryFile(filePath) {
  const baseName = path.basename(filePath);
  const nameWithoutExt = path.basename(filePath, path.extname(filePath));
  const parentDir = path.basename(path.dirname(filePath));

  // 入口文件模式
  const entryPatterns = [
    'index.ts', 'index.tsx', 'index.js', 'index.jsx',
    'main.ts', 'main.tsx', 'main.js', 'main.jsx',
    'app.ts', 'app.tsx', 'app.js', 'app.jsx'
  ];

  // 标准入口文件
  if (entryPatterns.includes(baseName.toLowerCase())) {
    return true;
  }

  // 与目录同名的文件（如 Button/Button.tsx）
  if (nameWithoutExt === parentDir) {
    return true;
  }

  return false;
}

/**
 * 构建目录树
 * @param {array} files - 文件列表
 * @returns {object} 目录树结构
 */
function buildDirectoryTree(files) {
  const tree = {};

  for (const file of files) {
    const parts = file.relative.split('/');
    let current = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;

      if (isFile) {
        if (!current.__files) current.__files = [];
        current.__files.push({
          name: part,
          isEntry: file.isEntry,
          ext: file.ext
        });
      } else {
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    }
  }

  return tree;
}

/**
 * 保存文件索引
 * @param {string} outputDir - 输出目录
 * @param {object} fileIndex - 文件索引数据
 */
function saveFileIndex(outputDir, fileIndex) {
  ensureDir(outputDir);

  const outputPath = path.join(outputDir, 'files-index.json');

  fs.writeFileSync(
    outputPath,
    JSON.stringify(fileIndex, null, 2),
    'utf-8'
  );

  console.log(`\n💾 文件索引已保存: ${outputPath}`);
  console.log(`   总文件数: ${fileIndex.stats.totalFiles}`);
  console.log(`   扩展名分布:`, fileIndex.stats.byExtension);
  console.log(`   深度分布:`, fileIndex.stats.byDepth);
}

/**
 * 主函数
 */
function main() {
  const projectRoot = process.cwd();
  const outputDir = path.join(projectRoot, '.worker', 'wiki', 'temp');

  console.log('='.repeat(50));
  console.log('Wiki Generator - 文件收集器');
  console.log('='.repeat(50));
  console.log(`\n项目目录: ${projectRoot}`);
  console.log(`输出目录: ${outputDir}`);

  try {
    // 1. 读取配置
    const config = loadConfig(projectRoot);

    // 2. 收集文件
    const fileIndex = collectFiles(projectRoot, config);

    // 3. 保存结果
    saveFileIndex(outputDir, fileIndex);

    console.log('\n✅ 文件收集完成!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 收集失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

// 导出函数供其他脚本使用
module.exports = {
  loadConfig,
  collectFiles,
  isEntryFile,
  buildDirectoryTree,
  CONFIG_PATH,
  parseYaml
};
