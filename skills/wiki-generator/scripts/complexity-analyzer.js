/**
 * Complexity Analyzer Module
 *
 * This module provides functionality to analyze JavaScript/TypeScript code complexity
 * and determine appropriate documentation splitting strategies.
 *
 * @module skills/wiki-generator/scripts/complexity-analyzer
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * ComplexityAnalyzer class for evaluating code complexity and deciding
 * documentation generation strategies.
 */
class ComplexityAnalyzer {
  /**
   * Main entry point for complexity analysis.
   * Analyzes an entry file and related files to determine code complexity
   * and appropriate documentation strategy.
   *
   * @param {string} entryFile - Path to the main entry file to analyze
   * @param {string[]} relatedFiles - Array of paths to related files
   * @returns {Promise<Object>} Analysis result containing score, metrics, strategy, and reasoning
   */
  async analyze(entryFile, relatedFiles) {
    const metrics = {
      lines: 0,              // 代码行数
      exports: 0,            // 导出数量
      functions: 0,          // 函数数量
      classes: 0,            // 类数量
      components: 0,         // 组件数量
      dependencies: 0,       // 依赖数量
      hasSubModules: false,  // 是否有子模块
      hasComplexLogic: false, // 是否有复杂逻辑
      useCases: 0,           // 使用场景数
    };

    // 1. 读取入口文件
    const entryContent = await fs.readFile(entryFile, 'utf-8');
    const entryMetrics = this.analyzeFile(entryContent);
    metrics.lines += entryMetrics.lines;
    metrics.exports += entryMetrics.exports.length;
    metrics.functions += entryMetrics.functions.length;
    metrics.classes += entryMetrics.classes.length;
    metrics.components += entryMetrics.components.length;

    // 2. 读取关键相关文件（最多3个）
    const keyFiles = relatedFiles.slice(0, 3);
    for (const file of keyFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const fileMetrics = this.analyzeFile(content);
        metrics.lines += fileMetrics.lines;
        metrics.exports += fileMetrics.exports.length;
      } catch (error) {
        // 忽略读取失败的文件
        console.warn(`Warning: Failed to read file ${file}: ${error.message}`);
      }
    }

    // 3. 提取依赖
    const imports = this.extractImports(entryContent);
    metrics.dependencies = imports.length;

    // 4. 检测是否有子模块（子目录）
    const dir = path.dirname(entryFile);
    const subdirs = await this.getSubdirectories(dir);
    metrics.hasSubModules = subdirs.length > 0;

    // 5. 检测复杂逻辑
    metrics.hasComplexLogic = this.detectComplexLogic(entryContent);

    // 6. 识别使用场景
    metrics.useCases = this.identifyUseCases(entryContent, entryMetrics);

    // 7. 计算复杂度分数
    const score = this.calculateScore(metrics);

    // 8. 决定拆分策略
    const strategy = this.decideStrategy(score, metrics);

    return {
      score,
      metrics,
      strategy,
      reasoning: this.generateReasoning(metrics, score, strategy),
    };
  }

  /**
   * Analyzes a single file's content to extract code metrics.
   *
   * @param {string} content - File content to analyze
   * @returns {Object} File metrics including lines, exports, functions, classes, and components
   */
  analyzeFile(content) {
    const lines = content.split('\n').length;
    const exports = content.match(/export\s+(?:const|let|var|function|class|interface|type)\s+\w+/g) || [];
    const functions = content.match(/(?:async\s+)?function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g) || [];
    const classes = content.match(/class\s+\w+/g) || [];
    const components = content.match(/React\.FC|React\.Component|Vue\.Component|const\s+\w+:\s*React\.FC/g) || [];
    return { lines, exports, functions, classes, components };
  }

  /**
   * Calculates complexity score based on metrics (0-100 scale).
   *
   * @param {Object} metrics - Code metrics object
   * @returns {number} Complexity score between 0 and 100
   */
  calculateScore(metrics) {
    let score = 0;

    // 基于代码行数评分
    if (metrics.lines > 1000) score += 30;
    else if (metrics.lines > 500) score += 20;
    else if (metrics.lines > 200) score += 10;
    else if (metrics.lines > 100) score += 5;

    // 基于导出数量评分（上限15分）
    score += Math.min(metrics.exports * 2, 15);

    // 基于依赖数量评分（上限15分）
    score += Math.min(metrics.dependencies, 15);

    // 子模块加分
    if (metrics.hasSubModules) score += 20;

    // 复杂逻辑加分
    if (metrics.hasComplexLogic) score += 10;

    // 使用场景评分（上限10分）
    score += Math.min(metrics.useCases * 3, 10);

    return Math.min(score, 100);
  }

  /**
   * Decides documentation splitting strategy based on complexity score and metrics.
   *
   * @param {number} score - Complexity score (0-100)
   * @param {Object} metrics - Code metrics object
   * @returns {Object} Strategy configuration including type, description, sections, and maxDepth
   */
  decideStrategy(score, metrics) {
    if (score < 30) {
      return {
        type: 'single',
        description: '单文档模式',
        sections: ['概述', 'API', '示例'],
        maxDepth: 1
      };
    } else if (score < 60) {
      return {
        type: 'sections',
        description: '章节拆分模式',
        sections: this.generateSections(metrics),
        maxDepth: 1
      };
    } else {
      return {
        type: 'nested',
        description: '嵌套文档模式',
        sections: ['概述'],
        subModules: this.identifySubModules(metrics),
        maxDepth: metrics.hasSubModules ? 3 : 2
      };
    }
  }

  /**
   * Detects if the code contains complex logic patterns.
   *
   * @param {string} content - Code content to analyze
   * @returns {boolean} True if complex logic patterns are detected
   */
  detectComplexLogic(content) {
    const patterns = [
      // 嵌套控制流
      /(?:if|switch|while|for)\s*\([^)]*\)\s*\{[^}]*(?:if|switch|while|for)/,
      // 复杂的类继承和实现
      /class\s+\w+.*extends.*implements/,
      // React hooks
      /(?:useEffect|useMemo|useCallback)\s*\([^)]*\)/,
      // 状态管理
      /(?:state|store|reducer|slice)\s*[=:]/i,
      // 异步嵌套
      /(?:async|await|Promise|Observable).{0,100}(?:async|await|Promise)/,
    ];
    return patterns.some(p => p.test(content));
  }

  /**
   * Identifies use cases from exports and content.
   *
   * @param {string} content - Code content
   * @param {Object} metrics - File metrics with exports
   * @returns {number} Number of unique use cases identified
   */
  identifyUseCases(content, metrics) {
    const useCases = [];
    for (const exp of metrics.exports || []) {
      if (exp.includes('create') || exp.includes('add')) useCases.push('创建');
      if (exp.includes('update') || exp.includes('edit')) useCases.push('更新');
      if (exp.includes('delete') || exp.includes('remove')) useCases.push('删除');
      if (exp.includes('get') || exp.includes('fetch')) useCases.push('查询');
      if (exp.includes('list') || exp.includes('search')) useCases.push('列表');
    }
    return [...new Set(useCases)].length;
  }

  /**
   * Generates documentation sections based on metrics.
   *
   * @param {Object} metrics - Code metrics object
   * @returns {string[]} Array of section names
   */
  generateSections(metrics) {
    const sections = ['概述'];
    if (metrics.components > 0) sections.push('组件');
    if (metrics.functions > 0) sections.push('函数');
    if (metrics.classes > 0) sections.push('类');
    if (metrics.hasComplexLogic) sections.push('核心逻辑');
    sections.push('使用示例');
    return sections;
  }

  /**
   * Generates reasoning for the chosen strategy.
   *
   * @param {Object} metrics - Code metrics object
   * @param {number} score - Complexity score
   * @param {Object} strategy - Strategy configuration
   * @returns {Object} Reasoning object with score, strategy, reasons, and recommendation
   */
  generateReasoning(metrics, score, strategy) {
    const reasons = [];
    if (metrics.lines > 500) reasons.push(`代码量大(${metrics.lines}行)`);
    if (metrics.exports > 5) reasons.push(`导出内容多(${metrics.exports}个)`);
    if (metrics.hasSubModules) reasons.push('包含子模块');
    if (metrics.hasComplexLogic) reasons.push('包含复杂逻辑');
    if (metrics.useCases > 2) reasons.push(`使用场景多(${metrics.useCases}个)`);

    return {
      score,
      strategy: strategy.type,
      reasons: reasons.length > 0 ? reasons : ['功能简单'],
      recommendation: strategy.description
    };
  }

  /**
   * Extracts import statements from code content.
   *
   * @private
   * @param {string} content - Code content
   * @returns {string[]} Array of import statements
   */
  extractImports(content) {
    const importRegex = /(?:import|require)\s*(?:\{[^}]*\}|[^'"]*)\s*(?:from\s*)?['"][^'"]+['"]/g;
    return content.match(importRegex) || [];
  }

  /**
   * Gets subdirectories of a given directory.
   *
   * @private
   * @param {string} dir - Directory path
   * @returns {Promise<string[]>} Array of subdirectory names
   */
  async getSubdirectories(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules')
        .map(entry => entry.name);
    } catch (error) {
      return [];
    }
  }

  /**
   * Identifies submodules for nested documentation.
   *
   * @private
   * @param {Object} metrics - Code metrics
   * @returns {string[]} Array of submodule identifiers
   */
  identifySubModules(metrics) {
    const subModules = [];
    if (metrics.hasSubModules) {
      subModules.push('子模块');
    }
    return subModules;
  }
}

module.exports = { ComplexityAnalyzer };
