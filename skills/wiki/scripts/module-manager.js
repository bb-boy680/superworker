#!/usr/bin/env node

/**
 * Module Manager
 * 用于管理 wiki 模块的增删改查和状态变更
 * 支持两步扫描：Phase 1 (modules数组) → Phase 2 (merge_modules状态管理)
 */

const fs = require('fs');
const path = require('path');

// 简单的 UUID 生成器
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class ModuleManager {
  constructor(wikiRoot = '.worker/wiki') {
    this.wikiRoot = wikiRoot;
    this.modulesPath = path.join(wikiRoot, 'meta', 'modules.json');
    this.data = null;
  }

  /**
   * 加载 modules.json
   */
  load() {
    if (!fs.existsSync(this.modulesPath)) {
      this.data = this._createEmptyData();
      return this;
    }

    try {
      const content = fs.readFileSync(this.modulesPath, 'utf-8');
      this.data = JSON.parse(content);
      this._validateData();
    } catch (error) {
      throw new Error(`加载 modules.json 失败: ${error.message}`);
    }

    return this;
  }

  /**
   * 保存 modules.json
   */
  save() {
    if (!this.data) {
      throw new Error('数据未加载');
    }

    this._updateStats();

    const dir = path.dirname(this.modulesPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.modulesPath, JSON.stringify(this.data, null, 2), 'utf-8');
    return this;
  }

  // ============ Phase 1: 初步模块解析 ============

  /**
   * 添加 Phase 1 模块（细粒度模块）
   * @param {Object} module - 模块对象
   * @param {string} module.name - 模块名称
   * @param {string[]} module.paths - 模块路径数组
   * @param {string} [module.description] - 模块描述
   * @param {string} [module.module_type] - 模块类型：feature/shared/core
   * @param {string[]} [module.tech_stack] - 技术栈
   * @param {string[]} [module.depend] - 依赖的模块 ID 数组
   * @returns {Object} 添加后的模块（包含生成的 UUID）
   */
  addModule(module) {
    if (!this.data) {
      throw new Error('数据未加载，请先调用 load()');
    }

    const newModule = {
      id: generateUUID(),
      name: module.name,
      paths: Array.isArray(module.paths) ? module.paths : [module.paths],
      description: module.description || '',
      module_type: module.module_type || 'feature',
      tech_stack: module.tech_stack || [],
      depend: module.depend || []
    };

    // 检查是否已存在相同路径的模块
    const existing = this._findModuleByPath(newModule.paths);
    if (existing) {
      throw new Error(`路径已被模块 ${existing.name} (ID:${existing.id}) 占用`);
    }

    this.data.modules.push(newModule);
    this._updateStats();

    return newModule;
  }

  /**
   * 批量添加 Phase 1 模块
   * @param {Object[]} modules - 模块数组
   */
  batchAddModules(modules) {
    if (!this.data) {
      throw new Error('数据未加载，请先调用 load()');
    }

    const added = [];
    modules.forEach(module => {
      try {
        const newMod = this.addModule(module);
        added.push(newMod);
      } catch (error) {
        console.warn(`跳过模块 ${module.name}: ${error.message}`);
      }
    });

    return added;
  }

  /**
   * 获取所有 Phase 1 模块
   * @returns {Object[]} 模块数组
   */
  getAllModules() {
    if (!this.data) {
      throw new Error('数据未加载，请先调用 load()');
    }
    return this.data.modules;
  }

  /**
   * 根据 ID 查找 Phase 1 模块
   * @param {string} id - 模块 UUID
   * @returns {Object|null} 模块对象
   */
  findModuleById(id) {
    if (!this.data) return null;
    return this.data.modules.find(m => m.id === id) || null;
  }

  /**
   * 根据路径查找 Phase 1 模块
   * @param {string|string[]} paths - 路径或路径数组
   * @returns {Object|null} 模块对象
   */
  _findModuleByPath(paths) {
    if (!this.data) return null;
    const pathArray = Array.isArray(paths) ? paths : [paths];

    return this.data.modules.find(m => {
      const modulePaths = m.paths || [];
      return pathArray.some(p => modulePaths.includes(p));
    }) || null;
  }

  // ============ Phase 2: 智能模块合并 ============

  /**
   * 添加合并候选模块到 pending
   * @param {Object} module - 合并模块对象
   * @param {string} module.name - 模块名称
   * @param {string} module.description - 模块描述
   * @param {string[]} [module.source_module_ids] - 来源的 Phase 1 模块 ID 列表（主字段）
   * @param {string[]} [module.depend_paths] - 可选：涉及的真实路径（仅用于展示）
   * @returns {Object} 添加后的合并模块
   */
  addMergeModule(module) {
    if (!this.data) {
      throw new Error('数据未加载，请先调用 load()');
    }

    const newModule = {
      id: generateUUID(),
      name: module.name,
      description: module.description || '',
      source_module_ids: module.source_module_ids || [],
      depend_paths: module.depend_paths || []
    };

    this.data.merge_modules.pending_modules.push(newModule);
    this._updateStats();

    return newModule;
  }

  /**
   * 批量添加合并候选模块（Phase 2 初始化）
   * @param {Object[]} modules - 合并模块数组
   */
  batchAddMergeModules(modules) {
    if (!this.data) {
      throw new Error('数据未加载，请先调用 load()');
    }

    const added = [];
    modules.forEach(module => {
      try {
        const newMod = this.addMergeModule(module);
        added.push(newMod);
      } catch (error) {
        console.warn(`跳过合并模块 ${module.name}: ${error.message}`);
      }
    });

    return added;
  }

  /**
   * 获取下一个待处理的合并模块
   * @returns {Object|null} 模块对象或 null
   */
  getNextMergeModule() {
    if (!this.data) return null;
    const pending = this.data.merge_modules.pending_modules;
    return pending.length > 0 ? pending[0] : null;
  }

  /**
   * 将合并模块从 pending 移到 progress
   * @param {string} id - 模块 UUID
   * @returns {Object} 移动的模块
   */
  startMergeModule(id) {
    if (!this.data) {
      throw new Error('数据未加载，请先调用 load()');
    }

    const pendingList = this.data.merge_modules.pending_modules;
    const moduleIndex = pendingList.findIndex(m => m.id === id);

    if (moduleIndex === -1) {
      throw new Error(`合并模块 ${id} 不存在于 pending 状态`);
    }

    const module = pendingList[moduleIndex];
    this.data.merge_modules.pending_modules = pendingList.filter(m => m.id !== id);
    this.data.merge_modules.progress_modules.push(module);
    this._updateStats();

    return module;
  }

  /**
   * 将合并模块从 progress 移到 completed
   * @param {string} id - 模块 UUID
   * @returns {Object} 移动的模块
   */
  completeMergeModule(id) {
    if (!this.data) {
      throw new Error('数据未加载，请先调用 load()');
    }

    const progressList = this.data.merge_modules.progress_modules;
    const moduleIndex = progressList.findIndex(m => m.id === id);

    if (moduleIndex === -1) {
      throw new Error(`合并模块 ${id} 不存在于 progress 状态`);
    }

    const module = progressList[moduleIndex];
    this.data.merge_modules.progress_modules = progressList.filter(m => m.id !== id);
    this.data.merge_modules.completed_modules.push(module);
    this._updateStats();

    return module;
  }

  /**
   * 更新合并模块信息
   * @param {string} id - 模块 UUID
   * @param {Object} updates - 要更新的字段
   * @param {string} [listName] - 所在的列表名（pending/progress/completed），不传则自动查找
   */
  updateMergeModule(id, updates, listName = null) {
    if (!this.data) {
      throw new Error('数据未加载，请先调用 load()');
    }

    let list = listName;
    if (!list) {
      list = this._findMergeModuleList(id);
    }

    if (!list) {
      throw new Error(`合并模块 ${id} 不存在`);
    }

    const moduleIndex = this.data.merge_modules[list].findIndex(m => m.id === id);
    if (moduleIndex === -1) {
      throw new Error(`合并模块 ${id} 不存在于 ${list}`);
    }

    Object.assign(this.data.merge_modules[list][moduleIndex], updates);
    return this.data.merge_modules[list][moduleIndex];
  }

  /**
   * 获取所有合并模块
   * @returns {Object} 包含 pending/progress/completed 的对象
   */
  getAllMergeModules() {
    if (!this.data) {
      throw new Error('数据未加载，请先调用 load()');
    }
    return {
      pending: this.data.merge_modules.pending_modules,
      progress: this.data.merge_modules.progress_modules,
      completed: this.data.merge_modules.completed_modules
    };
  }

  /**
   * 根据 ID 查找合并模块
   * @param {string} id - 模块 UUID
   * @returns {Object|null} { module, listName } 或 null
   */
  findMergeModuleById(id) {
    if (!this.data) return null;

    const lists = ['pending_modules', 'progress_modules', 'completed_modules'];
    for (const list of lists) {
      const module = this.data.merge_modules[list].find(m => m.id === id);
      if (module) return { module, listName: list };
    }
    return null;
  }

  // ============ 全局状态管理 ============

  /**
   * 更新全局状态
   * @param {string} status - 状态：pending / phase1_completed / phase2_progress / completed
   */
  setStatus(status) {
    if (!this.data) {
      throw new Error('数据未加载，请先调用 load()');
    }

    const validStatuses = ['pending', 'phase1_completed', 'phase2_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      throw new Error(`无效的状态: ${status}，必须是 ${validStatuses.join('/')} 之一`);
    }

    this.data.status = status;
    return this;
  }

  /**
   * 获取全局状态
   * @returns {string} 当前状态
   */
  getStatus() {
    if (!this.data) {
      throw new Error('数据未加载，请先调用 load()');
    }
    return this.data.status;
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    if (!this.data) {
      throw new Error('数据未加载，请先调用 load()');
    }

    return {
      phase1_total: this.data.modules.length,
      phase2_pending: this.data.merge_modules.pending_modules.length,
      phase2_progress: this.data.merge_modules.progress_modules.length,
      phase2_completed: this.data.merge_modules.completed_modules.length,
      status: this.data.status
    };
  }

  // ============ 验证与工具 ============

  /**
   * 验证 modules.json 完整性
   * @returns {Object} 验证结果
   */
  validate() {
    if (!this.data) {
      return { valid: false, error: '数据未加载' };
    }

    const errors = [];

    // 检查 Phase 1 结构
    if (!Array.isArray(this.data.modules)) {
      errors.push('modules 必须是数组');
    }

    // 检查 Phase 2 结构
    if (!this.data.merge_modules) {
      errors.push('缺少 merge_modules 字段');
    } else {
      if (!Array.isArray(this.data.merge_modules.pending_modules)) {
        errors.push('merge_modules.pending_modules 必须是数组');
      }
      if (!Array.isArray(this.data.merge_modules.progress_modules)) {
        errors.push('merge_modules.progress_modules 必须是数组');
      }
      if (!Array.isArray(this.data.merge_modules.completed_modules)) {
        errors.push('merge_modules.completed_modules 必须是数组');
      }
    }

    // 检查 ID 唯一性（Phase 1）
    if (Array.isArray(this.data.modules)) {
      const ids = this.data.modules.map(m => m.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        errors.push('Phase 1 模块存在重复的 ID');
      }
    }

    // 检查 ID 唯一性（Phase 2）
    if (this.data.merge_modules) {
      const allMergeIds = [
        ...this.data.merge_modules.pending_modules.map(m => m.id),
        ...this.data.merge_modules.progress_modules.map(m => m.id),
        ...this.data.merge_modules.completed_modules.map(m => m.id)
      ];
      const uniqueMergeIds = new Set(allMergeIds);
      if (allMergeIds.length !== uniqueMergeIds.size) {
        errors.push('Phase 2 合并模块存在重复的 ID');
      }
    }

    // 检查统计数字
    const expectedTotal = Array.isArray(this.data.modules) ? this.data.modules.length : 0;
    if (this.data.total_modules !== expectedTotal) {
      errors.push(`total_modules 不匹配: ${this.data.total_modules} vs ${expectedTotal}`);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : null
    };
  }

  // ============ 私有方法 ============

  _createEmptyData() {
    return {
      modules: [],
      merge_modules: {
        pending_modules: [],
        progress_modules: [],
        completed_modules: []
      },
      total_modules: 0,
      pending_modules: 0,
      progress_modules: 0,
      completed_modules: 0,
      status: 'pending'
    };
  }

  _validateData() {
    // 确保基本结构存在
    if (!this.data.modules) {
      this.data.modules = [];
    }

    if (!this.data.merge_modules) {
      this.data.merge_modules = {
        pending_modules: [],
        progress_modules: [],
        completed_modules: []
      };
    }

    ['pending_modules', 'progress_modules', 'completed_modules'].forEach(key => {
      if (!Array.isArray(this.data.merge_modules[key])) {
        this.data.merge_modules[key] = [];
      }
    });

    if (!this.data.status) {
      this.data.status = 'pending';
    }
  }

  _updateStats() {
    this.data.total_modules = this.data.modules.length;
    this.data.pending_modules = this.data.merge_modules.pending_modules.length;
    this.data.progress_modules = this.data.merge_modules.progress_modules.length;
    this.data.completed_modules = this.data.merge_modules.completed_modules.length;
  }

  _findMergeModuleList(id) {
    const lists = ['pending_modules', 'progress_modules', 'completed_modules'];
    for (const list of lists) {
      if (this.data.merge_modules[list].some(m => m.id === id)) {
        return list;
      }
    }
    return null;
  }

  // ============ 步骤3: 文件结构生成支持 ============

  /**
   * 获取下一个待处理的合并模块（用于步骤3）
   * 从 pending_modules 中获取第一个模块
   * @returns {Object|null} 模块对象或 null
   */
  getNextPendingMergeModule() {
    if (!this.data) return null;
    const pending = this.data.merge_modules.pending_modules;
    return pending.length > 0 ? pending[0] : null;
  }

  /**
   * 开始处理合并模块（从 pending 移到 progress）
   * @param {string} id - 模块 UUID
   * @returns {Object} 移动的模块
   */
  startMergeModuleProcessing(id) {
    return this.startMergeModule(id);
  }

  /**
   * 完成合并模块处理（从 progress 移到 completed）
   * 并记录文件生成结果
   * @param {string} id - 模块 UUID
   * @param {string[]} fileIds - 生成的文件 ID 列表
   * @returns {Object} 完成的模块
   */
  completeMergeModuleProcessing(id, fileIds = []) {
    if (!this.data) {
      throw new Error('数据未加载，请先调用 load()');
    }

    const progressList = this.data.merge_modules.progress_modules;
    const moduleIndex = progressList.findIndex(m => m.id === id);

    if (moduleIndex === -1) {
      throw new Error(`合并模块 ${id} 不存在于 progress 状态`);
    }

    const module = progressList[moduleIndex];
    module.generated_files = fileIds;
    module.completed_at = new Date().toISOString();

    this.data.merge_modules.progress_modules = progressList.filter(m => m.id !== id);
    this.data.merge_modules.completed_modules.push(module);
    this._updateStats();

    return module;
  }

  /**
   * 获取步骤3统计信息
   * @returns {Object} 统计信息
   */
  getStep3Stats() {
    if (!this.data) {
      throw new Error('数据未加载');
    }

    return {
      total: this.data.merge_modules.pending_modules.length +
             this.data.merge_modules.progress_modules.length +
             this.data.merge_modules.completed_modules.length,
      pending: this.data.merge_modules.pending_modules.length,
      progress: this.data.merge_modules.progress_modules.length,
      completed: this.data.merge_modules.completed_modules.length,
      allCompleted: this.data.merge_modules.pending_modules.length === 0 &&
                    this.data.merge_modules.progress_modules.length === 0 &&
                    this.data.merge_modules.completed_modules.length > 0
    };
  }

  /**
   * 检查是否还有未处理的合并模块
   * @returns {boolean}
   */
  hasPendingMergeModules() {
    if (!this.data) return false;
    return this.data.merge_modules.pending_modules.length > 0;
  }

  /**
   * 获取当前处理中的合并模块
   * @returns {Object|null}
   */
  getCurrentProgressMergeModule() {
    if (!this.data) return null;
    const progress = this.data.merge_modules.progress_modules;
    return progress.length > 0 ? progress[0] : null;
  }

  /**
   * 获取合并模块的子模块列表
   * @param {string} mergeModuleId - 合并模块ID
   * @returns {Object[]} 子模块数组
   */
  getSubModules(mergeModuleId) {
    if (!this.data) {
      throw new Error('数据未加载，请先调用 load()');
    }

    const mergeModule = this.findMergeModuleById(mergeModuleId);
    if (!mergeModule) {
      throw new Error(`合并模块 ${mergeModuleId} 不存在`);
    }

    const sourceIds = mergeModule.module.source_module_ids || [];
    const subModules = [];

    for (const id of sourceIds) {
      const subModule = this.findModuleById(id);
      if (subModule) {
        subModules.push(subModule);
      }
    }

    return subModules;
  }
}

// ============ CLI 接口 ============

function printUsage() {
  console.log(`
用法: node module-manager.js <命令> [参数]

命令:
  # Phase 1: 初步模块解析
  node module-manager.js add-module <name> <paths> [description] [type]   添加 Phase 1 模块
  node module-manager.js list-modules                                      列出所有 Phase 1 模块

  # Phase 2: 智能模块合并
  node module-manager.js add-merge <name> <source_module_ids> <description> [depend_paths]   添加合并候选模块
  node module-manager.js next-merge                                        获取下一个待合并模块
  node module-manager.js start-merge <id>                                  开始合并模块
  node module-manager.js complete-merge <id>                               完成合并模块
  node module-manager.js list-merge                                        列出所有合并模块

  # 步骤3: 文件结构生成
  node module-manager.js next-pending                          获取下一个待处理模块
  node module-manager.js start-processing <id>                 开始处理模块
  node module-manager.js complete-processing <id> [fileIds]    完成模块处理
  node module-manager.js step3-stats                           步骤3统计
  node module-manager.js has-pending                           是否还有未处理模块
  node module-manager.js current-progress                      获取当前处理中模块

  # 全局状态
  node module-manager.js status <pending/phase1_completed/phase2_progress/completed>   设置状态
  node module-manager.js stats                                             显示统计信息
  node module-manager.js validate                                          验证数据完整性
  node module-manager.js validate-progress                                 检测是否有待处理模块（用于步骤3）
  node module-manager.js help                                              显示帮助

示例:
  # Phase 1: 添加细粒度模块（带 tech_stack 和 depend）
  node module-manager.js add-module "用户管理" '["src/pages/user","src/components/user"]' "用户CRUD功能" "feature"
  node module-manager.js update <module-uuid> tech_stack '["React","TypeScript"]'
  node module-manager.js update <module-uuid> depend '["uuid-1","uuid-2"]'

  # Phase 2: 添加合并候选（source_module_ids + depend_paths）
  node module-manager.js add-merge "AI核心引擎" '["uuid-1","uuid-2"]' "AI核心功能合并" '["packages/core/ai","packages/shared/llm"]'
  node module-manager.js next-merge
  node module-manager.js start-merge <merge-uuid>
  node module-manager.js complete-merge <merge-uuid>

  # 查看状态
  node module-manager.js stats
`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    return;
  }

  const command = args[0];
  const manager = new ModuleManager();

  try {
    // 对于 init 命令，不需要加载现有文件
    if (command !== 'init') {
      manager.load();
    }

    switch (command) {
      // ============ Phase 1 命令 ============
      case 'add-module': {
        if (args.length < 3) {
          console.error('错误: add-module 命令需要 name 和 paths 参数');
          process.exit(1);
        }

        let paths;
        try {
          paths = JSON.parse(args[2]);
          if (!Array.isArray(paths)) {
            paths = [paths];
          }
        } catch {
          paths = [args[2]];
        }

        const module = manager.addModule({
          name: args[1],
          paths: paths,
          description: args[3] || '',
          module_type: args[4] || 'feature'
        });
        manager.save();
        console.log(`Phase 1 模块已添加: ID=${module.id}, name=${module.name}`);
        break;
      }

      case 'list-modules': {
        const modules = manager.getAllModules();
        console.log(`Phase 1 模块列表 (${modules.length} 个):`);
        modules.forEach(m => {
          const type = m.module_type ? ` [${m.module_type}]` : '';
          console.log(`  ${m.id}: ${m.name}${type}`);
          console.log(`    paths: ${JSON.stringify(m.paths)}`);
        });
        break;
      }

      // ============ Phase 2 命令 ============
      case 'add-merge': {
        if (args.length < 4) {
          console.error('错误: add-merge 命令需要 name, source_module_ids 和 description 参数');
          console.error('用法: node module-manager.js add-merge <name> <source_module_ids> <description> [depend_paths]');
          process.exit(1);
        }

        let sourceIds;
        try {
          sourceIds = JSON.parse(args[2]);
          if (!Array.isArray(sourceIds)) {
            sourceIds = [sourceIds];
          }
        } catch {
          sourceIds = [args[2]];
        }

        // 可选的 depend_paths 参数
        let dependPaths = [];
        if (args.length >= 5) {
          try {
            dependPaths = JSON.parse(args[4]);
            if (!Array.isArray(dependPaths)) {
              dependPaths = [dependPaths];
            }
          } catch {
            dependPaths = [args[4]];
          }
        }

        const module = manager.addMergeModule({
          name: args[1],
          source_module_ids: sourceIds,
          description: args[3],
          depend_paths: dependPaths
        });
        manager.save();
        console.log(`Phase 2 合并模块已添加: ID=${module.id}, name=${module.name}`);
        if (dependPaths.length > 0) {
          console.log(`  depend_paths: ${JSON.stringify(dependPaths)}`);
        }
        break;
      }

      case 'next-merge': {
        const next = manager.getNextMergeModule();
        if (next) {
          console.log('下一个待合并模块:');
          console.log(JSON.stringify(next, null, 2));
        } else {
          console.log('没有待处理的合并模块');
        }
        break;
      }

      case 'start-merge': {
        if (args.length < 2) {
          console.error('错误: start-merge 命令需要 id 参数');
          process.exit(1);
        }
        const id = args[1];
        const module = manager.startMergeModule(id);
        manager.save();
        console.log(`合并模块已开始: ID=${module.id}, name=${module.name}`);
        break;
      }

      case 'complete-merge': {
        if (args.length < 2) {
          console.error('错误: complete-merge 命令需要 id 参数');
          process.exit(1);
        }
        const completeId = args[1];
        const completedModule = manager.completeMergeModule(completeId);
        manager.save();
        console.log(`合并模块已完成: ID=${completedModule.id}, name=${completedModule.name}`);
        break;
      }

      case 'list-merge': {
        const mergeModules = manager.getAllMergeModules();
        console.log('Phase 2 合并模块列表:');
        console.log(`\n[pending] (${mergeModules.pending.length} 个)`);
        mergeModules.pending.forEach(m => {
          console.log(`  ${m.id}: ${m.name}`);
        });
        console.log(`\n[progress] (${mergeModules.progress.length} 个)`);
        mergeModules.progress.forEach(m => {
          console.log(`  ${m.id}: ${m.name}`);
        });
        console.log(`\n[completed] (${mergeModules.completed.length} 个)`);
        mergeModules.completed.forEach(m => {
          console.log(`  ${m.id}: ${m.name}`);
        });
        break;
      }

      // ============ 步骤3 命令 ============
      case 'next-pending': {
        const next = manager.getNextPendingMergeModule();
        if (next) {
          console.log(JSON.stringify(next, null, 2));
        } else {
          console.log('null');
        }
        break;
      }

      case 'start-processing': {
        if (args.length < 2) {
          console.error('错误: start-processing 命令需要 id 参数');
          process.exit(1);
        }
        const id = args[1];
        const module = manager.startMergeModuleProcessing(id);
        manager.save();
        console.log(`模块开始处理: ID=${module.id}, name=${module.name}`);
        break;
      }

      case 'complete-processing': {
        if (args.length < 2) {
          console.error('错误: complete-processing 命令需要 id 参数');
          process.exit(1);
        }
        const id = args[1];
        let fileIds = [];
        if (args.length >= 3) {
          try {
            fileIds = JSON.parse(args[2]);
          } catch {
            fileIds = [args[2]];
          }
        }
        const module = manager.completeMergeModuleProcessing(id, fileIds);
        manager.save();
        console.log(`模块处理完成: ID=${module.id}, files=${fileIds.length}`);
        break;
      }

      case 'step3-stats': {
        const stats = manager.getStep3Stats();
        console.log('步骤3统计:');
        console.log(`  总计模块: ${stats.total}`);
        console.log(`  待处理: ${stats.pending}`);
        console.log(`  进行中: ${stats.progress}`);
        console.log(`  已完成: ${stats.completed}`);
        console.log(`  全部完成: ${stats.allCompleted ? '是' : '否'}`);
        break;
      }

      case 'has-pending': {
        const hasPending = manager.hasPendingMergeModules();
        console.log(hasPending ? 'true' : 'false');
        break;
      }

      case 'current-progress': {
        const current = manager.getCurrentProgressMergeModule();
        if (current) {
          console.log(JSON.stringify(current, null, 2));
        } else {
          console.log('null');
        }
        break;
      }

      case 'get-submodules': {
        if (args.length < 2) {
          console.error('错误: get-submodules 命令需要 merge-module-id 参数');
          process.exit(1);
        }
        const mergeId = args[1];
        const subModules = manager.getSubModules(mergeId);
        console.log(JSON.stringify({
          merge_module_id: mergeId,
          sub_modules_count: subModules.length,
          sub_modules: subModules.map(m => ({
            id: m.id,
            name: m.name,
            module_type: m.module_type,
            paths_count: m.paths?.length || 0,
            paths: m.paths || []
          }))
        }, null, 2));
        break;
      }

      // ============ 全局状态命令 ============
      case 'status': {
        if (args.length < 2) {
          console.log(`当前状态: ${manager.getStatus()}`);
          return;
        }
        const newStatus = args[1];
        manager.setStatus(newStatus);
        manager.save();
        console.log(`状态已更新为: ${newStatus}`);
        break;
      }

      case 'stats': {
        const stats = manager.getStats();
        console.log('统计信息:');
        console.log(`  Phase 1 模块总数: ${stats.phase1_total}`);
        console.log(`  Phase 2 待处理: ${stats.phase2_pending}`);
        console.log(`  Phase 2 进行中: ${stats.phase2_progress}`);
        console.log(`  Phase 2 已完成: ${stats.phase2_completed}`);
        console.log(`  当前状态: ${stats.status}`);
        break;
      }

      case 'validate': {
        const result = manager.validate();
        if (result.valid) {
          console.log('✓ modules.json 验证通过');
        } else {
          console.error('✗ 验证失败:');
          result.errors.forEach(err => console.error(`  - ${err}`));
          process.exit(1);
        }
        break;
      }

      case 'validate-progress': {
        const pendingCount = manager.data.merge_modules?.pending_modules?.length || 0;
        const progressCount = manager.data.merge_modules?.progress_modules?.length || 0;
        const hasPending = pendingCount > 0 || progressCount > 0;

        if (hasPending) {
          console.log(`✗ 还有未处理模块: pending=${pendingCount}, progress=${progressCount}`);
        } else {
          console.log('✓ 所有模块已处理完成');
        }
        break;
      }

      case 'help':
      default:
        printUsage();
    }
  } catch (error) {
    console.error(`错误: ${error.message}`);
    process.exit(1);
  }
}

// 导出类和主函数
module.exports = { ModuleManager, main };

// 如果是直接运行，执行主函数
if (require.main === module) {
  main();
}
