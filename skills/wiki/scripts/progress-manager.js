#!/usr/bin/env node

/**
 * Progress Manager - 管理 Wiki 生成进度
 *
 * 使用方法:
 *   node scripts/progress-manager.js status [newStatus]     - 查看或更改状态
 *   node scripts/progress-manager.js split-module [moduleId] - 拆分合并模块为子功能文件
 *   node scripts/progress-manager.js validate-progress      - 验证进度数据完整性
 *   node scripts/progress-manager.js next                   - 获取下一个待生成的文件
 *   node scripts/progress-manager.js completed <fileId>     - 标记文件为已完成
 */

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

// 固定文件路径（从当前工作目录）
const PROGRESS_FILE = '.worker/wiki/meta/progress.json';
const MODULES_FILE = '.worker/wiki/meta/modules.json';
const WIKI_DIR = '.worker/wiki/zh';

// 状态枚举
const VALID_STATUSES = ['pending', 'progress', 'completed'];

/**
 * 加载 JSON 文件
 */
function loadJson(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`文件不存在: ${filePath}`);
    process.exit(1);
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`解析 JSON 失败: ${filePath}`);
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * 保存 JSON 文件
 */
function saveJson(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`已保存: ${filePath}`);
  } catch (error) {
    console.error(`保存文件失败: ${filePath}`);
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * 确保目录存在
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`创建目录: ${dirPath}`);
  }
}

/**
 * 显示进度状态
 */
function showStatus(progressData, modulesData) {
  console.log('\n=== Wiki 生成进度状态 ===\n');

  // 整体状态
  console.log(`整体状态: ${progressData.status || 'unknown'}`);
  console.log(`\n文件统计:`);
  console.log(`  - 总文件数: ${progressData.total_files || 0}`);
  console.log(`  - 待处理: ${progressData.pending_files || 0}`);
  console.log(`  - 进行中: ${progressData.progress_files || 0}`);
  console.log(`  - 已完成: ${progressData.completed_files || 0}`);

  // 文件列表详情
  if (progressData.files) {
    const {
      pending_files = [],
      progress_files = [],
      completed_files = [],
    } = progressData.files;

    if (pending_files.length > 0) {
      console.log(`\n【待处理文件】(${pending_files.length})`);
      pending_files.slice(0, 10).forEach((f) => console.log(`  - ${f.name}`));
      if (pending_files.length > 10) {
        console.log(`  ... 还有 ${pending_files.length - 10} 个文件`);
      }
    }

    if (progress_files.length > 0) {
      console.log(`\n【进行中文件】(${progress_files.length})`);
      progress_files.forEach((f) => console.log(`  - ${f.name}`));
    }

    if (completed_files.length > 0) {
      console.log(`\n【已完成文件】(${completed_files.length})`);
      completed_files.forEach((f) => console.log(`  - ${f.name}`));
    }
  }

  // 从 modules.json 显示模块统计
  if (modulesData && modulesData.merge_modules) {
    console.log(`\n模块统计:`);
    console.log(`  - 总模块数: ${modulesData.total_modules || 0}`);
    console.log(`  - 待处理: ${modulesData.pending_modules || 0}`);
    console.log(`  - 进行中: ${modulesData.progress_modules || 0}`);
    console.log(`  - 已完成: ${modulesData.completed_modules || 0}`);

    const {
      pending_modules = [],
      progress_modules = [],
      completed_modules = [],
    } = modulesData.merge_modules;

    if (pending_modules.length > 0) {
      console.log(`\n【待处理合并模块】(${pending_modules.length})`);
      pending_modules.forEach((m) =>
        console.log(
          `  - ${m.name} (${m.source_module_ids?.length || 0} 个子模块)`,
        ),
      );
    }

    if (progress_modules.length > 0) {
      console.log(`\n【进行中合并模块】(${progress_modules.length})`);
      progress_modules.forEach((m) => console.log(`  - ${m.name}`));
    }

    if (completed_modules.length > 0) {
      console.log(`\n【已完成合并模块】(${completed_modules.length})`);
      completed_modules.forEach((m) => console.log(`  - ${m.name}`));
    }
  }

  console.log('\n========================\n');
}

/**
 * 验证进度数据完整性
 * 检测 pending_modules 和 progress_modules 是否还存在数据
 */
function validateProgress(progressData, modulesData) {
  console.log('\n=== 进度数据验证 ===\n');

  const issues = [];

  // 检查 modules.json 中的 pending_modules
  const pendingModules = modulesData.merge_modules?.pending_modules || [];
  if (pendingModules.length > 0) {
    issues.push(`⚠️ modules.json 中还有 ${pendingModules.length} 个待处理模块未拆分`);
    console.log(`❌ pending_modules: ${pendingModules.length} 个模块未处理`);
    pendingModules.forEach(m => console.log(`   - ${m.name} (${m.id})`));
  } else {
    console.log('✅ pending_modules: 已清空');
  }

  // 检查 modules.json 中的 progress_modules
  const progressModules = modulesData.merge_modules?.progress_modules || [];
  if (progressModules.length > 0) {
    issues.push(`⚠️ modules.json 中还有 ${progressModules.length} 个模块处理中`);
    console.log(`❌ progress_modules: ${progressModules.length} 个模块处理中`);
    progressModules.forEach(m => console.log(`   - ${m.name} (${m.id})`));
  } else {
    console.log('✅ progress_modules: 已清空');
  }

  // 检查 progress.json 中的文件状态
  const files = progressData.files || {};
  const pendingFiles = files.pending_files || [];
  const progressFiles = files.progress_files || [];
  const completedFiles = files.completed_files || [];

  console.log(`\n文件统计:`);
  console.log(`  - 待处理: ${pendingFiles.length}`);
  console.log(`  - 进行中: ${progressFiles.length}`);
  console.log(`  - 已完成: ${completedFiles.length}`);

  // 验证统计数字是否匹配
  const totalFromArrays = pendingFiles.length + progressFiles.length + completedFiles.length;
  const totalFromStats = progressData.total_files || 0;

  if (totalFromArrays !== totalFromStats) {
    issues.push(`⚠️ total_files (${totalFromStats}) 与实际数组总和 (${totalFromArrays}) 不匹配`);
    console.log(`❌ total_files 不匹配: ${totalFromStats} vs ${totalFromArrays}`);
  } else {
    console.log(`✅ total_files: ${totalFromStats} (与实际数组匹配)`);
  }

  if (pendingFiles.length !== (progressData.pending_files || 0)) {
    issues.push(`⚠️ pending_files 统计数字不匹配`);
  }
  if (progressFiles.length !== (progressData.progress_files || 0)) {
    issues.push(`⚠️ progress_files 统计数字不匹配`);
  }
  if (completedFiles.length !== (progressData.completed_files || 0)) {
    issues.push(`⚠️ completed_files 统计数字不匹配`);
  }

  console.log('\n=== 验证结果 ===');
  if (issues.length === 0) {
    console.log('✅ 所有检查通过，进度数据完整');
  } else {
    console.log(`❌ 发现 ${issues.length} 个问题:`);
    issues.forEach(issue => console.log(`   ${issue}`));
  }
  console.log('\n');

  return issues.length === 0;
}

/**
 * 获取下一个待生成的文件
 * 先尝试从 progress_files 获取，如果没有则从 pending_files 获取
 */
function nextFile(progressData) {
  console.log('\n=== 获取下一个文件 ===\n');

  const files = progressData.files || {};
  let progressFiles = files.progress_files || [];
  let pendingFiles = files.pending_files || [];

  // 先从 progress_files 中返回（已存在进行中的文件）
  if (progressFiles.length > 0) {
    const file = progressFiles[0];
    console.log(`✅ 从 progress_files 返回文件:`);
    console.log(`   - ${file.name} (${file.id})`);
    console.log(`   - 路径: ${file.path}`);
    console.log(`   - 描述: ${file.description}`);
    console.log('\n');

    // 输出 JSON 格式，方便调用方解析
    console.log('---JSON_OUTPUT_START---');
    console.log(JSON.stringify(file, null, 2));
    console.log('---JSON_OUTPUT_END---');

    return file;
  }

  // 如果 progress_files 为空，从 pending_files 中获取一项
  if (pendingFiles.length > 0) {
    const file = pendingFiles.shift(); // 移除并获取第一项

    // 将该项插入到 progress_files
    progressFiles.push(file);

    // 更新统计
    progressData.pending_files = pendingFiles.length;
    progressData.progress_files = progressFiles.length;

    // 保存更新
    saveJson(PROGRESS_FILE, progressData);

    console.log(`✅ 从 pending_files 移动文件到 progress_files:`);
    console.log(`   - ${file.name} (${file.id})`);
    console.log(`   - 路径: ${file.path}`);
    console.log(`   - 描述: ${file.description}`);
    console.log(`\n当前统计: 待处理=${pendingFiles.length}, 进行中=${progressFiles.length}, 已完成=${files.completed_files?.length || 0}`);
    console.log('\n');

    // 输出 JSON 格式，方便调用方解析
    console.log('---JSON_OUTPUT_START---');
    console.log(JSON.stringify(file, null, 2));
    console.log('---JSON_OUTPUT_END---');

    return file;
  }

  // 没有更多文件
  console.log('⚠️ 没有待处理的文件');
  console.log('\n');
  return null;
}

/**
 * 标记文件为已完成
 * 把文件从 progress_files 移动到 completed_files
 */
function completeFile(progressData, fileId) {
  console.log(`\n=== 标记文件为已完成 ===`);
  console.log(`文件ID: ${fileId}\n`);

  const files = progressData.files || {};
  let progressFiles = files.progress_files || [];
  let completedFiles = files.completed_files || [];

  // 查找文件在 progress_files 中的索引
  const fileIndex = progressFiles.findIndex(f => f.id === fileId);

  if (fileIndex === -1) {
    console.error(`❌ 错误: 未找到ID为 ${fileId} 的文件在 progress_files 中`);
    console.error('   可能该文件已被完成或ID不正确');
    process.exit(1);
  }

  // 获取文件并移除
  const file = progressFiles.splice(fileIndex, 1)[0];

  // 添加完成时间戳
  file.completed_at = new Date().toISOString();

  // 移动到 completed_files
  completedFiles.push(file);

  // 更新统计
  progressData.progress_files = progressFiles.length;
  progressData.completed_files = completedFiles.length;

  // 保存更新
  saveJson(PROGRESS_FILE, progressData);

  console.log(`✅ 文件已标记为完成:`);
  console.log(`   - ${file.name} (${file.id})`);
  console.log(`   - 完成时间: ${file.completed_at}`);
  console.log(`\n当前统计: 进行中=${progressFiles.length}, 已完成=${completedFiles.length}`);
  console.log('\n');

  return file;
}

/**
 * 更改整体状态
 */
function changeStatus(progressData, newStatus) {
  if (!VALID_STATUSES.includes(newStatus)) {
    console.error(`无效的状态: ${newStatus}`);
    console.error(`有效状态: ${VALID_STATUSES.join(', ')}`);
    process.exit(1);
  }

  const oldStatus = progressData.status;
  progressData.status = newStatus;

  console.log(`状态已更改: ${oldStatus} -> ${newStatus}`);

  // 保存更新
  saveJson(PROGRESS_FILE, progressData);
}

/**
 * 拆分合并模块为子功能文件
 * 遍历所有 pending_modules，处理每一项并移动到 completed_modules
 */
function splitModule(progressData, modulesData) {
  // 从 modules.json 获取 merge_modules
  const mergeModules = modulesData.merge_modules || {};
  const pendingModules = mergeModules.pending_modules || [];

  if (pendingModules.length === 0) {
    console.log('没有待处理的合并模块可拆分');
    return;
  }

  console.log(`\n开始拆分 ${pendingModules.length} 个合并模块...\n`);

  // 从 modules.json 的 modules 数组查找子模块详情
  const allModules = modulesData.modules || [];
  const newFiles = [];
  const completedModules = [];

  // 遍历所有 pending_modules
  for (const targetModule of pendingModules) {
    console.log(`正在拆分模块: ${targetModule.name} (${targetModule.id})`);
    console.log(`描述: ${targetModule.description}`);
    console.log(`包含 ${targetModule.source_module_ids?.length || 0} 个子模块`);

    // 确定基础路径（从合并模块名称生成）
    const baseDirName = targetModule.name.replace(/[^\w\u4e00-\u9fa5]/g, '');
    const baseDir = path.join(WIKI_DIR, baseDirName);
    ensureDir(baseDir);

    const moduleFiles = [];

    for (const sourceModuleId of targetModule.source_module_ids || []) {
      // 在 modules 数组中查找子模块
      const sourceModule = allModules.find((m) => m.id === sourceModuleId);
      if (!sourceModule) {
        console.warn(`  警告: 未找到子模块 ${sourceModuleId}`);
        continue;
      }

      // 生成文件路径
      const fileName =
        sourceModule.name.replace(/[^\w\u4e00-\u9fa5]/g, '') + '.md';
      const filePath = path.join(baseDirName, fileName);
      const fullPath = path.join(WIKI_DIR, filePath);

      // 创建文件记录
      const fileRecord = {
        id: randomUUID(),
        name: sourceModule.name,
        description: sourceModule.description,
        path: `.worker/wiki/zh/${filePath.replace(/\\/g, '/')}`,
        depend_files: sourceModule.paths || [],
      };

      moduleFiles.push(fileRecord);
      newFiles.push(fileRecord);

      // 创建空的 Markdown 文件（如果不存在）
      if (!fs.existsSync(fullPath)) {
        const template = `---\nname: ${sourceModule.name}\ndescription: ${sourceModule.description}\n---\n`;
        fs.writeFileSync(fullPath, template, 'utf-8');
        console.log(`  创建文件: ${fullPath}`);
      } else {
        console.log(`  文件已存在: ${fullPath}`);
      }
    }

    // 将处理完的模块标记为完成
    completedModules.push({
      ...targetModule,
      split_at: new Date().toISOString(),
      generated_files: moduleFiles.map((f) => f.id),
    });

    console.log(`  ✓ 生成了 ${moduleFiles.length} 个子功能文件\n`);
  }

  // 更新 modules.json
  // 1. 清空 pending_modules
  mergeModules.pending_modules = [];

  // 2. 将处理的模块添加到 completed_modules
  mergeModules.completed_modules = mergeModules.completed_modules || [];
  mergeModules.completed_modules.push(...completedModules);

  // 3. 更新统计
  modulesData.pending_modules = 0;
  modulesData.completed_modules =
    (modulesData.completed_modules || 0) + completedModules.length;

  // 更新 progress.json
  progressData.files = progressData.files || {};
  progressData.files.pending_files = progressData.files.pending_files || [];
  progressData.files.pending_files.push(...newFiles);

  // 更新统计（基于实际数组长度）
  progressData.total_files =
    (progressData.files.pending_files?.length || 0) +
    (progressData.files.progress_files?.length || 0) +
    (progressData.files.completed_files?.length || 0);
  progressData.pending_files = progressData.files.pending_files?.length || 0;
  progressData.progress_files = progressData.files.progress_files?.length || 0;
  progressData.completed_files =
    progressData.files.completed_files?.length || 0;

  // 保存更新
  saveJson(MODULES_FILE, modulesData);
  saveJson(PROGRESS_FILE, progressData);

  console.log(`✅ 全部拆分完成!`);
  console.log(`   处理了 ${completedModules.length} 个合并模块`);
  console.log(`   生成了 ${newFiles.length} 个子功能文件`);
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
Usage: node progress-manager.js <command> [options]

Commands:
  status [newStatus]          查看当前状态或更改状态
                              有效状态: ${VALID_STATUSES.join(', ')}

  split-module [moduleId]     拆分合并模块为子功能文件
                              如果不指定 moduleId，则拆分第一个待处理模块

  validate-progress           验证进度数据完整性
                              检测 pending_modules 和 progress_modules 是否还存在数据

  next                        获取下一个待生成的文件
                              优先从 progress_files 获取，否则从 pending_files 获取

  completed <fileId>          标记文件为已完成
                              将文件从 progress_files 移动到 completed_files

Examples:
  node scripts/progress-manager.js status
  node scripts/progress-manager.js status in_progress
  node scripts/progress-manager.js split-module
  node scripts/progress-manager.js split-module 3ec942ec-a296-4e39-a613-aba9fa9de93c
  node scripts/progress-manager.js validate-progress
  node scripts/progress-manager.js next
  node scripts/progress-manager.js completed abc123-xxx
`);
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }

  const command = args[0];

  switch (command) {
    case 'status': {
      const progressData = loadJson(PROGRESS_FILE);
      const modulesData = loadJson(MODULES_FILE);

      if (args[1]) {
        // 更改状态
        changeStatus(progressData, args[1]);
      } else {
        // 显示状态
        showStatus(progressData, modulesData);
      }
      break;
    }

    case 'split-module': {
      const progressData = loadJson(PROGRESS_FILE);
      const modulesData = loadJson(MODULES_FILE);
      splitModule(progressData, modulesData);
      break;
    }

    case 'validate-progress': {
      const progressData = loadJson(PROGRESS_FILE);
      const modulesData = loadJson(MODULES_FILE);
      validateProgress(progressData, modulesData);
      break;
    }

    case 'next': {
      const progressData = loadJson(PROGRESS_FILE);
      nextFile(progressData);
      break;
    }

    case 'completed': {
      const fileId = args[1];
      if (!fileId) {
        console.error('错误: 请提供文件ID');
        console.error('用法: node scripts/progress-manager.js completed <fileId>');
        process.exit(1);
      }
      const progressData = loadJson(PROGRESS_FILE);
      completeFile(progressData, fileId);
      break;
    }

    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;

    default:
      console.error(`未知命令: ${command}`);
      showHelp();
      process.exit(1);
  }
}

// 运行主程序
main();
