#!/usr/bin/env node

/**
 * Generate Wiki Structure
 * 根据 modules.json 的嵌套树形结构生成 Wiki 文件目录结构
 *
 * 规则：
 * - 非叶子节点：创建目录 + 生成概述文件 {节点名称}/{节点名称}.md
 * - 叶子节点：在父目录下生成 {节点名称}.md（详细文档，后续填充）
 * - 根目录：4 个固定文件
 *
 * 使用方法:
 *   node scripts/generate-wiki-structure.js
 */

const fs = require('fs');
const path = require('path');

// 固定文件路径
const MODULES_FILE = '.worker/wiki/meta/modules.json';
const CONTENT_DIR = '.worker/wiki/content/zh';

// 固定文件列表（只创建空文件）
const FIXED_FILES = [
  '快速开始.md',
  '架构设计.md',
  '开发手册.md',
  '文档地图.md'
];

/**
 * 加载 modules.json
 */
function loadModules() {
  if (!fs.existsSync(MODULES_FILE)) {
    console.error(`错误: ${MODULES_FILE} 不存在`);
    console.error('请先执行步骤 2 模块扫描');
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(MODULES_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`错误: 解析 ${MODULES_FILE} 失败`);
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * 遍历树节点，生成目录和文件
 */
function traverseTree(nodes, basePath = '', parentNodeName = '') {
  const stats = {
    dirsCreated: 0,
    filesCreated: 0,
    nodes: []
  };

  for (const node of nodes) {
    // 正确判断：有 children 就是分支节点（需要创建目录）
    const hasChildren = node.children && node.children.length > 0;
    const isLeaf = !hasChildren;
    const nodePath = basePath ? `${basePath}/${node.name}` : node.name;

    // 记录节点信息（用于 progress.json）
    stats.nodes.push({
      id: node.id,
      name: node.name,
      doc_path: isLeaf
        ? `${CONTENT_DIR}/${basePath}/${node.name}.md`
        : `${CONTENT_DIR}/${nodePath}/${node.name}.md`,
      paths: node.paths || [],
      description: node.description || '',
      is_leaf: isLeaf
    });

    if (isLeaf) {
      // 叶子节点：在父目录下生成空文档文件
      const filePath = `${CONTENT_DIR}/${basePath}/${node.name}.md`;
      const dir = path.dirname(filePath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        stats.dirsCreated++;
      }

      // 创建空文件
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '', 'utf-8');
        stats.filesCreated++;
        console.log(`  创建: ${filePath}`);
      }
    } else {
      // 分支节点：创建目录 + 主文件
      const dirPath = `${CONTENT_DIR}/${nodePath}`;

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        stats.dirsCreated++;
        console.log(`  创建目录: ${dirPath}`);
      }

      // 创建目录主文件（空文件）
      const mainFilePath = `${dirPath}/${node.name}.md`;
      if (!fs.existsSync(mainFilePath)) {
        fs.writeFileSync(mainFilePath, '', 'utf-8');
        stats.filesCreated++;
        console.log(`  创建: ${mainFilePath}`);
      }

      // 递归处理子节点
      if (node.children && node.children.length > 0) {
        const childStats = traverseTree(node.children, nodePath, node.name);
        stats.dirsCreated += childStats.dirsCreated;
        stats.filesCreated += childStats.filesCreated;
        stats.nodes.push(...childStats.nodes);
      }
    }
  }

  return stats;
}

/**
 * 清理根目录下的扁平模块文件（旧逻辑生成的）
 */
function cleanupOldFiles() {
  const rootFiles = fs.readdirSync(CONTENT_DIR);
  let cleaned = 0;

  // 获取所有根模块名称
  const modulesData = loadModules();
  const rootModuleNames = modulesData.module_tree.root_modules.map(n => n.name);

  for (const file of rootFiles) {
    // 如果是 md 文件且名称匹配根模块名称，说明是旧文件
    if (file.endsWith('.md') && !file.startsWith('.')) {
      const baseName = file.replace('.md', '');
      if (rootModuleNames.includes(baseName)) {
        const filePath = `${CONTENT_DIR}/${file}`;
        // 检查是否是旧文件（非固定文件）
        if (!FIXED_FILES.includes(file)) {
          console.log(`  清理旧文件: ${filePath}`);
          fs.unlinkSync(filePath);
          cleaned++;
        }
      }
    }
  }

  return cleaned;
}

/**
 * 主函数
 */
function main() {
  console.log('\n=== 生成 Wiki 文件目录结构 ===\n');

  // 确保 content 目录存在
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
    console.log(`创建根目录: ${CONTENT_DIR}`);
  }

  // 清理旧的扁平文件
  console.log('\n清理旧文件:');
  const cleanedCount = cleanupOldFiles();
  if (cleanedCount === 0) {
    console.log('  无需清理');
  }

  // 生成固定文件（空文件）
  console.log('\n生成固定文件:');
  for (const fileName of FIXED_FILES) {
    const filePath = `${CONTENT_DIR}/${fileName}`;
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '', 'utf-8');
      console.log(`  创建: ${filePath}`);
    } else {
      console.log(`  已存在: ${filePath}`);
    }
  }

  // 加载模块数据
  console.log('\n加载模块数据...');
  const modulesData = loadModules();

  if (!modulesData.module_tree || !modulesData.module_tree.root_modules) {
    console.error('错误: modules.json 中没有 module_tree');
    process.exit(1);
  }

  // 遍历树节点，生成目录结构
  console.log('\n生成模块目录结构:');
  const stats = traverseTree(modulesData.module_tree.root_modules);

  // 保存节点路径信息（供 progress-manager 使用）
  const nodesInfoPath = '.worker/wiki/meta/doc_paths.json';
  const nodesInfo = {
    nodes: stats.nodes,
    generated_at: new Date().toISOString()
  };
  fs.writeFileSync(nodesInfoPath, JSON.stringify(nodesInfo, null, 2), 'utf-8');
  console.log(`\n保存节点路径信息: ${nodesInfoPath}`);

  // 输出统计
  console.log('\n=== 生成完成 ===');
  console.log(`创建目录: ${stats.dirsCreated} 个`);
  console.log(`创建文件: ${stats.filesCreated + FIXED_FILES.length} 个（含固定文件）`);
  console.log(`总节点数: ${stats.nodes.length} 个`);
  console.log('\n下一步: 执行步骤 4 生成详细文档');
}

main();