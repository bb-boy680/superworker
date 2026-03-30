#!/usr/bin/env node

/**
 * Module Manager
 * 管理模块数据和树形结构
 *
 * 数据结构：
 * - modules: Phase 1 模块数组
 * - module_tree: Phase 2 树形结构
 */

const fs = require('fs');
const path = require('path');

// UUID 生成器
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

  // ============ 基础操作 ============

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

  _createEmptyData() {
    return {
      modules: [],
      module_tree: {
        root_modules: [],
        status: 'pending'
      },
      status: 'pending'
    };
  }

  _validateData() {
    if (!this.data.modules) {
      this.data.modules = [];
    }

    if (!this.data.module_tree) {
      this.data.module_tree = {
        root_modules: [],
        status: 'pending'
      };
    }

    if (!this.data.status) {
      this.data.status = 'pending';
    }
  }

  _updateStats() {
    // 统计信息可选
  }

  // ============ Phase 1: 模块操作 ============

  /**
   * 添加模块
   */
  addModule(module) {
    if (!this.data) {
      throw new Error('数据未加载，请先调用 load()');
    }

    const newModule = {
      id: module.id || generateUUID(),
      name: module.name,
      paths: Array.isArray(module.paths) ? module.paths : [module.paths],
      description: module.description || '',
      module_type: module.module_type || 'feature',
      depend: module.depend || []
    };

    this.data.modules.push(newModule);
    return newModule;
  }

  /**
   * 获取所有模块
   */
  getAllModules() {
    if (!this.data) return [];
    return this.data.modules;
  }

  /**
   * 根据 ID 查找模块
   */
  findModuleById(id) {
    if (!this.data) return null;
    return this.data.modules.find(m => m.id === id) || null;
  }

  /**
   * 删除模块
   */
  deleteModule(id) {
    if (!this.data) return false;
    const index = this.data.modules.findIndex(m => m.id === id);
    if (index !== -1) {
      this.data.modules.splice(index, 1);
      return true;
    }
    return false;
  }

  // ============ Phase 2: 树形结构操作 ============

  /**
   * 添加树节点
   * @param {Object} node - 节点数据
   * @param {string} node.name - 节点名称
   * @param {string} node.parentId - 父节点 ID（空则为根节点）
   * @param {string[]} node.leaf_module_ids - 叶子节点引用的 Phase 1 模块 ID
   * @param {string} node.description - 节点描述
   */
  addTreeNode(node) {
    if (!this.data) {
      throw new Error('数据未加载，请先调用 load()');
    }

    const newNode = {
      id: node.id || generateUUID(),
      name: node.name,
      description: node.description || '',
      paths: [],
      leaf_module_ids: node.leaf_module_ids || [],
      children: []
    };

    // 计算 paths
    newNode.paths = this._calculateNodePaths(newNode);

    if (node.parentId) {
      // 添加到父节点
      const parent = this._findTreeNodeById(node.parentId);
      if (!parent) {
        throw new Error(`父节点 ${node.parentId} 不存在`);
      }
      parent.children.push(newNode);
      // 更新父节点的 paths
      this._updateParentPaths(node.parentId);
    } else {
      // 添加为根节点
      this.data.module_tree.root_modules.push(newNode);
    }

    return newNode;
  }

  /**
   * 计算节点的 paths
   */
  _calculateNodePaths(node) {
    const paths = [];

    // 从 leaf_module_ids 获取 paths
    if (node.leaf_module_ids && node.leaf_module_ids.length > 0) {
      for (const moduleId of node.leaf_module_ids) {
        const module = this.findModuleById(moduleId);
        if (module && module.paths) {
          paths.push(...module.paths);
        }
      }
    }

    // 从 children 获取 paths
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (child.paths) {
          paths.push(...child.paths);
        }
      }
    }

    // 去重
    return [...new Set(paths)];
  }

  /**
   * 更新父节点的 paths
   */
  _updateParentPaths(nodeId) {
    const node = this._findTreeNodeById(nodeId);
    if (node) {
      node.paths = this._calculateNodePaths(node);
    }
  }

  /**
   * 根据 ID 查找树节点
   */
  _findTreeNodeById(id) {
    const search = (nodes) => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children && node.children.length > 0) {
          const found = search(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    return search(this.data.module_tree.root_modules);
  }

  /**
   * 获取树结构
   */
  getTree() {
    if (!this.data) return null;
    return this.data.module_tree;
  }

  /**
   * 列出所有树节点（扁平化）
   */
  listAllTreeNodes() {
    const nodes = [];

    const traverse = (nodeList, level = 0, parentId = null) => {
      for (const node of nodeList) {
        nodes.push({
          id: node.id,
          name: node.name,
          level,
          parentId,
          pathsCount: node.paths ? node.paths.length : 0,
          childrenCount: node.children ? node.children.length : 0,
          isLeaf: node.leaf_module_ids && node.leaf_module_ids.length > 0
        });
        if (node.children && node.children.length > 0) {
          traverse(node.children, level + 1, node.id);
        }
      }
    };

    traverse(this.data.module_tree.root_modules);
    return nodes;
  }

  // ============ 状态管理 ============

  setStatus(status) {
    if (!this.data) {
      throw new Error('数据未加载');
    }

    const validStatuses = ['pending', 'phase1_completed', 'phase2_completed', 'completed'];
    if (!validStatuses.includes(status)) {
      throw new Error(`无效的状态: ${status}`);
    }

    this.data.status = status;
    return this;
  }

  getStatus() {
    if (!this.data) return null;
    return this.data.status;
  }

  setTreeStatus(status) {
    if (!this.data || !this.data.module_tree) return;
    this.data.module_tree.status = status;
    return this;
  }

  // ============ 验证 ============

  validate() {
    if (!this.data) {
      return { valid: false, errors: ['数据未加载'] };
    }

    const errors = [];
    const warnings = [];
    let branchCount = 0;
    let leafCount = 0;
    let maxDepth = 0;

    // 检查 modules
    if (!Array.isArray(this.data.modules)) {
      errors.push('modules 必须是数组');
    }

    // 检查 module_tree
    if (!this.data.module_tree) {
      errors.push('缺少 module_tree');
    } else if (!Array.isArray(this.data.module_tree.root_modules)) {
      errors.push('module_tree.root_modules 必须是数组');
    }

    // 检查每个模块的 paths
    for (const module of this.data.modules) {
      if (!module.paths || module.paths.length === 0) {
        errors.push(`模块 ${module.name} 缺少 paths 字段`);
      }
    }

    // 检查树节点的一致性和嵌套层级
    const checkTreeNodes = (nodes, depth = 1) => {
      for (const node of nodes) {
        const hasChildren = node.children && node.children.length > 0;
        const hasLeafIds = node.leaf_module_ids && node.leaf_module_ids.length > 0;

        // 更新最大深度
        if (depth > maxDepth) maxDepth = depth;

        // 检查 paths 字段
        if (!node.paths || node.paths.length === 0) {
          errors.push(`树节点 ${node.name} 缺少 paths 字段`);
        }

        // 检查节点类型一致性
        if (hasChildren && hasLeafIds) {
          errors.push(`树节点 ${node.name} 同时有 children 和 leaf_module_ids（违规：分支节点不应有 leaf_module_ids）`);
        }

        if (!hasChildren && !hasLeafIds) {
          warnings.push(`树节点 ${node.name} 既无 children 也无 leaf_module_ids（可能是空节点）`);
        }

        // 统计
        if (hasChildren) {
          branchCount++;
        } else {
          leafCount++;
        }

        // 递归检查
        if (hasChildren) {
          checkTreeNodes(node.children, depth + 1);
        }
      }
    };
    checkTreeNodes(this.data.module_tree.root_modules);

    // 检查嵌套层级
    if (maxDepth < 2) {
      warnings.push(`嵌套层级只有 ${maxDepth} 层，建议至少 2 层以形成有意义的目录结构`);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : null,
      warnings: warnings.length > 0 ? warnings : null,
      stats: {
        branchCount,
        leafCount,
        maxDepth,
        totalNodes: branchCount + leafCount
      }
    };
  }

  // ============ 统计 ============

  getStats() {
    if (!this.data) return null;

    const countTreeNodes = (nodes) => {
      let count = 0;
      for (const node of nodes) {
        count++;
        if (node.children && node.children.length > 0) {
          count += countTreeNodes(node.children);
        }
      }
      return count;
    };

    return {
      modulesCount: this.data.modules.length,
      treeNodesCount: countTreeNodes(this.data.module_tree.root_modules),
      status: this.data.status,
      treeStatus: this.data.module_tree.status
    };
  }
}

// ============ CLI 接口 ============

function printUsage() {
  console.log(`
用法: node module-manager.js <命令> [参数]

=== Phase 1: 模块操作 ===
  add-module <name> <paths> <description> <type>   添加模块
  list-modules                                     列出所有模块
  delete-module <id>                               删除模块

=== Phase 2: 树形结构 ===
  add-tree-node <name> <parentId> <leafIds> <description>   添加树节点
                                                            parentId 为空则为根节点
                                                            leafIds 为 JSON 数组或空字符串
  list-tree                                        列出树结构（扁平化）

=== 状态管理 ===
  status [value]                                   获取/设置状态
  tree-status [value]                              获取/设置树状态

=== 其他 ===
  stats                                            显示统计信息
  validate                                         验证数据完整性
  help                                             显示帮助

示例:
  # 添加模块
  node module-manager.js add-module "用户管理" '["src/pages/user/index.tsx"]' "用户管理功能" "feature"

  # 添加根节点
  node module-manager.js add-tree-node "Agents 核心" "" '["uuid-1","uuid-2"]' "Agents 核心功能"

  # 添加子节点
  node module-manager.js add-tree-node "MCP 相关" "tree-parent-id" '["uuid-3"]' "MCP 相关模块"

  # 更新状态
  node module-manager.js status phase1_completed
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
    manager.load();

    switch (command) {
      // ============ Phase 1 命令 ============
      case 'add-module': {
        if (args.length < 3) {
          console.error('错误: add-module 需要 name 和 paths 参数');
          process.exit(1);
        }

        let paths;
        try {
          paths = JSON.parse(args[2]);
          if (!Array.isArray(paths)) paths = [paths];
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
        console.log(`模块已添加: ID=${module.id}, name=${module.name}`);
        break;
      }

      case 'list-modules': {
        const modules = manager.getAllModules();
        console.log(`模块列表 (${modules.length} 个):`);
        modules.forEach(m => {
          console.log(`  ${m.id}: ${m.name} [${m.module_type}]`);
          console.log(`    paths: ${m.paths.length} 个文件`);
        });
        break;
      }

      case 'delete-module': {
        if (args.length < 2) {
          console.error('错误: delete-module 需要 id 参数');
          process.exit(1);
        }
        const deleted = manager.deleteModule(args[1]);
        manager.save();
        console.log(deleted ? `模块已删除: ${args[1]}` : `模块不存在: ${args[1]}`);
        break;
      }

      // ============ Phase 2 命令 ============
      case 'add-tree-node': {
        if (args.length < 4) {
          console.error('错误: add-tree-node 需要 name, parentId, leafIds, description 参数');
          console.error('用法: add-tree-node <name> <parentId> <leafIds> <description>');
          console.error('  parentId 为空字符串表示根节点');
          console.error('  leafIds 为 JSON 数组字符串，如 \'["uuid-1","uuid-2"]\'');
          process.exit(1);
        }

        let leafIds = [];
        try {
          if (args[3] && args[3] !== '[]') {
            leafIds = JSON.parse(args[3]);
          }
        } catch {
          console.error('错误: leafIds 必须是 JSON 数组格式');
          process.exit(1);
        }

        const node = manager.addTreeNode({
          name: args[1],
          parentId: args[2] || null,
          leaf_module_ids: leafIds,
          description: args[4] || ''
        });
        manager.save();
        console.log(`树节点已添加: ID=${node.id}, name=${node.name}`);
        console.log(`  paths: ${node.paths.length} 个文件`);
        break;
      }

      case 'list-tree': {
        const nodes = manager.listAllTreeNodes();
        console.log(`树节点列表 (${nodes.length} 个):`);
        nodes.forEach(n => {
          const indent = '  '.repeat(n.level);
          const leafMark = n.isLeaf ? ' [叶子]' : '';
          console.log(`${indent}${n.id}: ${n.name}${leafMark}`);
          console.log(`${indent}  paths: ${n.pathsCount} 个文件`);
        });
        break;
      }

      // ============ 状态命令 ============
      case 'status': {
        if (args.length < 2) {
          console.log(`当前状态: ${manager.getStatus()}`);
        } else {
          manager.setStatus(args[1]);
          manager.save();
          console.log(`状态已更新: ${args[1]}`);
        }
        break;
      }

      case 'tree-status': {
        if (args.length < 2) {
          console.log(`树状态: ${manager.data?.module_tree?.status}`);
        } else {
          manager.setTreeStatus(args[1]);
          manager.save();
          console.log(`树状态已更新: ${args[1]}`);
        }
        break;
      }

      // ============ 其他命令 ============
      case 'stats': {
        const stats = manager.getStats();
        console.log('统计信息:');
        console.log(`  模块数: ${stats.modulesCount}`);
        console.log(`  树节点数: ${stats.treeNodesCount}`);
        console.log(`  状态: ${stats.status}`);
        console.log(`  树状态: ${stats.treeStatus}`);
        break;
      }

      case 'validate': {
        const result = manager.validate();
        console.log('\n=== 树结构验证 ===\n');

        // 显示统计
        if (result.stats) {
          console.log('统计信息:');
          console.log(`  分支节点: ${result.stats.branchCount}`);
          console.log(`  叶子节点: ${result.stats.leafCount}`);
          console.log(`  总节点数: ${result.stats.totalNodes}`);
          console.log(`  嵌套层级: ${result.stats.maxDepth}`);
        }

        // 显示错误
        if (result.errors && result.errors.length > 0) {
          console.log('\n❌ 错误:');
          result.errors.forEach(err => console.log(`  - ${err}`));
        }

        // 显示警告
        if (result.warnings && result.warnings.length > 0) {
          console.log('\n⚠️ 警告:');
          result.warnings.forEach(warn => console.log(`  - ${warn}`));
        }

        if (result.valid) {
          console.log('\n✓ 数据验证通过');
        } else {
          console.log('\n✗ 验证失败');
          process.exit(1);
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

module.exports = { ModuleManager, main };

if (require.main === module) {
  main();
}