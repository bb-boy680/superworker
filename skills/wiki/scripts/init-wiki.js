#!/usr/bin/env node
/**
 * Mini-Wiki 初始化脚本
 * 创建 .mini-wiki 目录结构和默认配置
 */

const fs = require('fs');
const path = require('path');

/**
 * 从 .gitignore 读取排除规则
 * @param {string} projectRoot - 项目根目录
 * @returns {string[]} 排除规则列表
 */
function parseGitignore(projectRoot) {
  const gitignorePath = path.join(projectRoot, '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => {
        // 只过滤掉空行和注释
        return line && !line.startsWith('#');
      })
      .map((line) => {
        // 移除开头的 !（否定模式）
        if (line.startsWith('!')) {
          return null;
        }
        // 移除开头的 / 或 */
        return line.replace(/^(\/|\*\/)/, '');
      })
      .filter((line) => line !== null);
  } catch (err) {
    console.warn('⚠️ 读取 .gitignore 失败:', err.message);
    return [];
  }
}

/**
 * 返回默认配置文件内容
 */
function getDefaultConfig() {
  // 基础排除规则
  const baseExcludes = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '__pycache__',
    'venv',
    '.venv',
    '.worker',
    '*.test.ts',
    '*.spec.ts',
    '*.test.js',
    '*.spec.js',
    '.claude',
  ];

  // 从当前工作目录的 .gitignore 读取排除规则
  const gitignoreExcludes = parseGitignore(process.cwd());

  // 合并并去重
  const allExcludes = [...new Set([...baseExcludes, ...gitignoreExcludes])];

  // 生成 YAML 格式的 exclude 列表
  const excludeYaml = allExcludes.map((item) => `  - ${item}`).join('\n');

  return `# Mini-Wiki 配置文件

# 生成选项
generation:
  language: zh                   # zh / en / both
  include_diagrams: true         # 生成 Mermaid 架构图
  include_examples: true         # 包含代码使用示例
  link_to_source: true           # 代码块链接到源码
  max_file_size: 100000          # 跳过大于此大小的文件（字节）

# 排除规则
exclude:
${excludeYaml}
`;
}

/**
 * 返回进度数据
 */
function getDefaultProgress() {
  return {
    files: {
      pending_files: [
        {
          id: 'file-001',
          path: '.worker/wiki/zh/快速开始.md',
          name: '快速开始',
          description: '快速开始文档',
          depend_files: [],
        },
        {
          id: 'file-002',
          path: '.worker/wiki/zh/架构设计.md',
          name: '架构设计',
          description: '系统架构设计文档',
          depend_files: [],
        },
        {
          id: 'file-003',
          path: '.worker/wiki/zh/开发指南.md',
          name: '开发指南',
          description: '开发指南文档',
          depend_files: [],
        },
        {
          id: 'file-004',
          path: '.worker/wiki/zh/文档地图.md',
          name: '文档地图',
          description: '文档地图文档',
          depend_files: [],
        },
      ],
      progress_files: [],
      completed_files: [],
    },
    total_files: 4,
    pending_files: 0,
    progress_files: 0,
    completed_files: 0,
    status: 'pending',
  };
}

/**
 * 返回模块数据（两步扫描结构）
 */
function getDefaultModules() {
  return {
    // Phase 1: 初步模块解析 - 存储所有识别出的细粒度模块
    modules: [],

    // Phase 2: 智能模块合并 - 管理合并过程中的状态
    merge_modules: {
      pending_modules: [],
      progress_modules: [],
      completed_modules: [],
    },

    // 统计信息
    total_modules: 0,
    pending_modules: 0,
    progress_modules: 0,
    completed_modules: 0,

    // 当前执行状态
    status: 'pending',
  };
}

/**
 * 获取文件默认内容
 */
function getFileDefaultContent(filePath) {
  const fileName = path.basename(filePath);
  const ext = path.extname(fileName);

  // Markdown 文件创建为空文件
  if (ext === '.md') {
    return '';
  }

  switch (fileName) {
    case 'progress.json':
      return JSON.stringify(getDefaultProgress(), null, 2);

    case 'modules.json':
      return JSON.stringify(getDefaultModules(), null, 2);

    case 'config.yaml':
      return getDefaultConfig();

    default:
      return '';
  }
}

/**
 * 确保目录存在
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  }
  return false;
}

/**
 * 写入文件
 */
function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * 复制文件
 */
function copyFile(src, dest) {
  fs.copyFileSync(src, dest);
}

/**
 * 判断路径是否为文件（有扩展名）
 */
function isFile(filePath) {
  return path.extname(filePath).length > 0;
}

/**
 * 初始化 wiki 目录
 * @param {string} projectRoot - 项目根目录
 * @param {boolean} force - 是否强制重新初始化
 * @returns {object} 初始化结果
 */
function initMiniWiki(projectRoot, force = false) {
  const root = path.resolve(projectRoot);

  const result = {
    success: true,
    created: [],
    skipped: [],
    message: '',
  };

  // 检查 wiki 目录是否已存在
  const wikiDir = path.join(root, 'wiki');
  if (fs.existsSync(wikiDir)) {
    if (!force) {
      result.success = false;
      result.message = 'wiki 目录已存在。使用 --force 重新初始化。';
      return result;
    } else {
      // 备份现有配置
      const configPath = path.join(root, 'wiki/config.yaml');
      if (fs.existsSync(configPath)) {
        const backupPath = path.join(root, 'wiki/config.yaml.bak');
        copyFile(configPath, backupPath);
        result.skipped.push('wiki/config.yaml (已备份)');
      }
    }
  }

  // 创建目录结构（包含文件）
  const structure = [
    'wiki',
    'wiki/zh',
    'wiki/zh/快速开始.md',
    'wiki/zh/架构设计.md',
    'wiki/zh/开发指南.md',
    'wiki/zh/文档地图.md',
    'wiki/config.yaml',
    'wiki/meta',
    'wiki/meta/progress.json',
    'wiki/meta/modules.json',
    'wiki/temp',
  ];

  for (const item of structure) {
    const fullPath = path.join(root, item);

    if (isFile(item)) {
      // 是文件
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (!fs.existsSync(fullPath) || force) {
        writeFile(fullPath, getFileDefaultContent(item));
        result.created.push(item);
      }
    } else {
      // 是目录
      if (ensureDir(fullPath)) {
        result.created.push(item);
      }
    }
  }

  result.message = `成功初始化 wiki 目录，创建了 ${result.created.length} 个文件/目录`;
  return result;
}

/**
 * 打印初始化结果
 */
function printResult(result) {
  if (result.success) {
    console.log('✅', result.message);
    if (result.created.length > 0) {
      console.log('\n创建的文件/目录:');
      for (const item of result.created) {
        console.log(`  + ${item}`);
      }
    }
    if (result.skipped.length > 0) {
      console.log('\n跳过的文件:');
      for (const item of result.skipped) {
        console.log(`  - ${item}`);
      }
    }
  } else {
    console.log('❌', result.message);
  }
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  const projectPath = args[0] || process.cwd();
  const force = args.includes('--force');

  const result = initMiniWiki(projectPath, force);
  printResult(result);
}

// 导出 API
module.exports = { initMiniWiki, printResult };

// 如果直接运行此脚本
if (require.main === module) {
  main();
}
