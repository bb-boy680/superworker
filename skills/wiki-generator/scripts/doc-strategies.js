/**
 * Documentation Strategies Module
 *
 * This module provides documentation generation strategies for wiki-generator.
 * Supports three strategies: single document, sectioned document, and nested documents.
 *
 * @module skills/wiki-generator/scripts/doc-strategies
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Main entry point for documentation generation.
 * Selects and executes the appropriate strategy based on complexity report.
 *
 * @param {Object} module - Module information object
 * @param {string} module.name - Module name
 * @param {string} module.path - Module path
 * @param {string} module.entryFile - Entry file path
 * @param {Object} complexityReport - Complexity analysis report
 * @param {Object} complexityReport.strategy - Strategy configuration
 * @param {string} complexityReport.strategy.type - Strategy type ('single', 'sections', 'nested')
 * @param {number} [currentDepth=1] - Current recursion depth for nested strategy
 * @returns {Promise<string>} Path to generated documentation
 */
async function generateDocs(module, complexityReport, currentDepth = 1) {
  const { strategy } = complexityReport;

  switch (strategy.type) {
    case 'single':
      return await generateSingleDoc(module, complexityReport);
    case 'sections':
      return await generateSectionedDoc(module, complexityReport);
    case 'nested':
      return await generateNestedDocs(module, complexityReport, currentDepth);
    default:
      throw new Error(`Unknown strategy type: ${strategy.type}`);
  }
}

/**
 * Generates a single document for simple modules.
 * Output path: wiki/zh/${module.name}.md
 *
 * @param {Object} module - Module information
 * @param {Object} complexityReport - Complexity analysis report
 * @returns {Promise<string>} Path to generated file
 */
async function generateSingleDoc(module, complexityReport) {
  const outputPath = `wiki/zh/${module.name}.md`;
  const dir = path.dirname(outputPath);

  // Ensure directory exists
  await mkdir(dir);

  const content = `# ${module.name}

## 概述

${generateOverview(module, complexityReport)}

## API

${generateAPIContent(module, complexityReport)}

## 使用示例

${generateExamples(module, complexityReport)}
`;

  await fs.writeFile(outputPath, content, 'utf-8');
  return outputPath;
}

/**
 * Generates a sectioned document for medium complexity modules.
 * Output path: wiki/zh/${module.name}/README.md
 *
 * @param {Object} module - Module information
 * @param {Object} complexityReport - Complexity analysis report
 * @param {Object} complexityReport.strategy - Strategy configuration
 * @param {string[]} complexityReport.strategy.sections - Array of section names to generate
 * @param {Object} complexityReport.metrics - Code metrics
 * @returns {Promise<string>} Path to generated file
 */
async function generateSectionedDoc(module, complexityReport) {
  const outputPath = `wiki/zh/${module.name}/README.md`;
  const dir = path.dirname(outputPath);

  // Create directory structure
  await mkdir(dir);

  // Get sections from strategy, fallback to default if not present
  const sections = complexityReport.strategy.sections || ['概述', 'API', '示例'];

  // Build content with dynamic sections
  let content = `# ${module.name}\n`;

  // Add each section
  for (const section of sections) {
    content += `\n## ${section}\n\n`;
    content += generateSectionContent(section, module, complexityReport);
  }

  // Add summary section if not already included
  if (!sections.includes('总结')) {
    content += `\n## 总结\n\n`;
    content += generateSummary(module, complexityReport);
  }

  await fs.writeFile(outputPath, content, 'utf-8');
  return outputPath;
}

/**
 * Generates nested documents for complex modules with submodules.
 * Output path: wiki/zh/${module.name}/README.md (container document)
 *
 * Recursively generates sub-module documents based on their complexity:
 * - Complex sub-modules (type='nested'): Continue nesting
 * - Simple sub-modules: Generate single document
 *
 * Max depth limit prevents infinite recursion.
 *
 * @param {Object} module - Module information including name, id, path, entryFile, files
 * @param {Object} complexityReport - Complexity analysis report with strategy info
 * @param {number} [depth=0] - Current recursion depth (starts at 0)
 * @returns {Promise<string>} Path to generated container file
 */
async function generateNestedDocs(module, complexityReport, depth = 0) {
  const outputPath = `wiki/zh/${module.name}/README.md`;
  const outputDir = path.dirname(outputPath);
  const maxDepth = complexityReport.strategy?.maxDepth || 3;

  // Max depth check to prevent infinite recursion
  if (depth >= maxDepth) {
    console.warn(`Max depth ${maxDepth} reached at module ${module.name}, stopping recursion`);
    return outputPath;
  }

  // Create directory structure
  await mkdir(outputDir);

  // Generate container README using the dedicated helper function
  const content = generateContainerREADME(module, complexityReport);
  await fs.writeFile(outputPath, content, 'utf-8');
  console.log(`Generated nested container: ${outputPath} (depth: ${depth})`);

  // Recursively generate sub-modules if they exist
  const subModules = complexityReport.strategy?.subModules;
  if (subModules && subModules.length > 0) {
    for (const subModule of subModules) {
      try {
        // Load complexity report for sub-module from file system
        const subReport = await loadComplexityReport(subModule.id || subModule.name);

        // Create enriched sub-module info with parent context
        const enrichedSubModule = {
          id: subModule.id || subModule.name,
          name: subModule.name,
          path: subModule.path || `${module.path}/${subModule.name}`,
          entryFile: subModule.entryFile,
          files: subModule.files || [],
          parentId: module.id,
          parentName: module.name,
        };

        // Decide strategy based on sub-module complexity
        if (subReport.strategy?.type === 'nested') {
          // Continue nesting for complex sub-modules
          await generateNestedDocs(enrichedSubModule, subReport, depth + 1);
        } else {
          // Generate single document for simple sub-modules
          await generateSingleDoc(enrichedSubModule, subReport);
        }
      } catch (error) {
        console.error(`Error generating documentation for sub-module ${subModule.name}:`, error.message);
        // Continue with other sub-modules
      }
    }
  }

  return outputPath;
}

/**
 * Generates container README content for nested document strategy.
 * This serves as the main entry point and index for the module documentation.
 *
 * The container includes:
 * - Overview of the module
 * - Architecture design description
 * - Navigation links to sub-modules
 * - Quick start guide
 * - Document structure information
 * - Summary and reasoning for chosen strategy
 *
 * @param {Object} module - Module information including name, id, path
 * @param {Object} complexityReport - Complexity analysis report
 * @returns {string} Generated markdown content for container README
 */
function generateContainerREADME(module, complexityReport) {
  const strategy = complexityReport.strategy || {};
  const subModules = strategy.subModules || [];
  const maxDepth = strategy.maxDepth || 3;
  const metrics = complexityReport.metrics || {};

  let content = `# ${module.name}\n\n`;

  // Overview section
  content += `## 概述\n\n`;
  content += `${module.name}是一个复杂模块，采用嵌套文档结构组织。\n\n`;

  if (metrics.lines || metrics.exports || metrics.functions) {
    content += `**复杂度指标**:\n\n`;
    content += `- 代码行数: ${metrics.lines || 'N/A'}\n`;
    content += `- 导出数量: ${metrics.exports || 'N/A'}\n`;
    content += `- 函数数量: ${metrics.functions || 'N/A'}\n`;
    content += `- 类数量: ${metrics.classes || 'N/A'}\n`;
    content += `- 依赖数量: ${metrics.dependencies || 'N/A'}\n`;
    content += `- 使用场景: ${metrics.useCases || 'N/A'}\n\n`;
  }

  // Architecture section
  content += `## 架构设计\n\n`;
  content += `${module.name}模块的整体架构设计如下:\n\n`;

  if (metrics.hasSubModules) {
    content += `- 包含子模块结构\n`;
  }
  if (metrics.hasComplexLogic) {
    content += `- 包含复杂业务逻辑\n`;
  }
  if (subModules.length > 0) {
    content += `- 由 ${subModules.length} 个子模块组成\n`;
  }
  content += `\n`;

  // Sub-modules section with navigation
  if (subModules.length > 0) {
    content += `## 子模块\n\n`;
    content += `本模块包含以下子模块:\n\n`;

    for (const subModule of subModules) {
      const subModuleFileName = `${subModule.name}.md`;
      content += `- [${subModule.name}](./${subModuleFileName})\n`;
    }
    content += `\n`;
  }

  // Quick start section
  content += `## 快速开始\n\n`;
  content += generateQuickStart(module, complexityReport);
  content += `\n`;

  // Document structure info
  content += `## 文档结构\n\n`;
  content += `- 文档策略: ${strategy.description || '嵌套文档模式'}\n`;
  content += `- 最大嵌套深度: ${maxDepth}\n`;
  content += `- 当前子模块数: ${subModules.length}\n\n`;

  // Summary section
  content += `## 总结\n\n`;
  content += `${module.name}是一个功能丰富的复杂模块，`;
  content += `通过清晰的子模块划分和层级结构，便于开发者理解和使用。\n\n`;

  // Reasoning
  if (complexityReport.reasoning?.reasons && complexityReport.reasoning.reasons.length > 0) {
    content += `**采用嵌套文档的原因**: ${complexityReport.reasoning.reasons.join('、')}\n`;
  }

  return content;
}

/**
 * Loads complexity report for a given module ID.
 * Searches through multiple possible report locations:
 * - reports/complexity/
 * - .cache/wiki-generator/complexity/
 * - wiki/.cache/complexity/
 * - tmp/complexity/
 *
 * If no report is found, creates a default report using createSubModuleReport.
 *
 * @param {string} moduleId - Module identifier (name or ID)
 * @returns {Promise<Object>} Complexity report object
 */
async function loadComplexityReport(moduleId) {
  const possiblePaths = [
    path.join('reports', 'complexity', `${moduleId}.json`),
    path.join('.cache', 'wiki-generator', 'complexity', `${moduleId}.json`),
    path.join('wiki', '.cache', 'complexity', `${moduleId}.json`),
    path.join('tmp', 'complexity', `${moduleId}.json`),
  ];

  for (const reportPath of possiblePaths) {
    try {
      const fileContent = await fs.readFile(reportPath, 'utf-8');
      const report = JSON.parse(fileContent);
      console.log(`Loaded complexity report for ${moduleId} from ${reportPath}`);
      return report;
    } catch (error) {
      // File doesn't exist or can't be read, try next path
      continue;
    }
  }

  // If no report found, create a default report
  console.warn(`No complexity report found for ${moduleId}, using default`);
  return createSubModuleReport({ name: moduleId });
}

/**
 * Generates content for a specific section type.
 * Supports: 概述, 组件, 函数, 类, 核心逻辑, 使用示例, API, 架构设计, 配置选项, 最佳实践
 *
 * @param {string} section - Section name/type
 * @param {Object} module - Module information
 * @param {Object} complexityReport - Complexity analysis report
 * @param {Object} complexityReport.metrics - Code metrics
 * @returns {string} Generated section content
 */
function generateSectionContent(section, module, complexityReport) {
  const { metrics } = complexityReport;

  switch (section) {
    case '概述':
      return generateOverview(module, complexityReport);

    case '组件':
      return generateComponentsContent(module, complexityReport);

    case '函数':
      return generateFunctionsContent(module, complexityReport);

    case '类':
      return generateClassesContent(module, complexityReport);

    case '核心逻辑':
      return generateCoreLogicContent(module, complexityReport);

    case '使用示例':
      return generateExamples(module, complexityReport);

    case 'API':
      return generateAPIContent(module, complexityReport);

    case '架构设计':
      return generateArchitectureContent(module, complexityReport);

    case '配置选项':
      return generateConfigContent(module, complexityReport);

    case '最佳实践':
      return generateBestPractices(module, complexityReport);

    default:
      // For unknown sections, generate a placeholder
      return `本模块的${section}相关内容。\n\n具体实现请查看源代码：\`${module.path || module.entryFile || module.name}\`\n`;
  }
}

/**
 * Generates overview section content.
 *
 * @param {Object} module - Module information
 * @param {Object} complexityReport - Complexity analysis report
 * @param {Object} complexityReport.metrics - Code metrics
 * @param {Object} complexityReport.reasoning - Strategy reasoning
 * @returns {string} Overview content
 */
function generateOverview(module, complexityReport) {
  const { metrics, reasoning } = complexityReport;

  let content = `${module.name}模块`;

  if (metrics) {
    content += `包含约 ${metrics.lines || 0} 行代码`;

    if (metrics.exports > 0) {
      content += `，导出 ${metrics.exports} 个成员`;
    }

    if (metrics.components > 0) {
      content += `，包含 ${metrics.components} 个组件`;
    }

    if (metrics.functions > 0) {
      content += `，定义了 ${metrics.functions} 个函数`;
    }

    if (metrics.classes > 0) {
      content += `，包含 ${metrics.classes} 个类`;
    }
  }

  content += `。\n\n`;

  // Add reasoning context
  if (reasoning && reasoning.reasons && reasoning.reasons.length > 0) {
    content += `**复杂度分析**：${reasoning.reasons.join('，')}。\n\n`;
  }

  if (module.path || module.entryFile) {
    content += `**源码位置**：\`${module.path || module.entryFile}\`\n`;
  }

  return content;
}

/**
 * Generates components section content.
 *
 * @param {Object} module - Module information
 * @param {Object} complexityReport - Complexity analysis report
 * @param {Object} complexityReport.metrics - Code metrics
 * @returns {string} Components content
 */
function generateComponentsContent(module, complexityReport) {
  const { metrics } = complexityReport;

  if (!metrics || metrics.components === 0) {
    return `本模块未定义独立组件。\n`;
  }

  let content = `本模块包含 ${metrics.components} 个组件。\n\n`;
  content += `### 组件列表\n\n`;
  content += `| 组件名 | 类型 | 描述 |\n`;
  content += `|--------|------|------|\n`;
  content += `| ${module.name}Component | React/Vue | 主组件 |\n`;

  return content;
}

/**
 * Generates functions section content.
 *
 * @param {Object} module - Module information
 * @param {Object} complexityReport - Complexity analysis report
 * @param {Object} complexityReport.metrics - Code metrics
 * @returns {string} Functions content
 */
function generateFunctionsContent(module, complexityReport) {
  const { metrics } = complexityReport;

  if (!metrics || !metrics.functions || metrics.functions === 0) {
    return `本模块未定义独立函数。\n`;
  }

  let content = `本模块定义了 ${metrics.functions} 个函数。\n\n`;
  content += `### 函数列表\n\n`;
  content += `| 函数名 | 参数 | 返回值 | 描述 |\n`;
  content += `|--------|------|--------|------|\n`;
  content += `| main | - | any | 主函数 |\n`;

  return content;
}

/**
 * Generates classes section content.
 *
 * @param {Object} module - Module information
 * @param {Object} complexityReport - Complexity analysis report
 * @param {Object} complexityReport.metrics - Code metrics
 * @returns {string} Classes content
 */
function generateClassesContent(module, complexityReport) {
  const { metrics } = complexityReport;

  if (!metrics || !metrics.classes || metrics.classes === 0) {
    return `本模块未定义类。\n`;
  }

  let content = `本模块包含 ${metrics.classes} 个类。\n\n`;
  content += `### 类列表\n\n`;
  content += `| 类名 | 说明 |\n`;
  content += `|------|------|\n`;
  content += `| ${module.name}Service | 服务类 |\n`;

  return content;
}

/**
 * Generates core logic section content.
 *
 * @param {Object} module - Module information
 * @param {Object} complexityReport - Complexity analysis report
 * @returns {string} Core logic content
 */
function generateCoreLogicContent(module, complexityReport) {
  let content = `本模块的核心逻辑处理流程。\n\n`;
  content += `### 主要流程\n\n`;
  content += `1. **输入处理**：接收并验证输入参数\n`;
  content += `2. **核心计算**：执行主要业务逻辑\n`;
  content += `3. **结果输出**：返回处理结果\n\n`;
  content += `详细实现请查看源码文件：\`${module.entryFile || module.path}\`\n`;

  return content;
}

/**
 * Generates API reference section content.
 *
 * @param {Object} module - Module information
 * @param {Object} complexityReport - Complexity analysis report
 * @returns {string} API content
 */
function generateAPIContent(module, complexityReport) {
  const { metrics } = complexityReport;

  let content = ``;

  if (metrics && metrics.exports > 0) {
    content += `本模块导出 ${metrics.exports} 个成员。\n\n`;
  }

  content += `### 导出列表\n\n`;
  content += `| 名称 | 类型 | 描述 |\n`;
  content += `|------|------|------|\n`;

  if (metrics) {
    if (metrics.functions > 0) {
      content += `| [函数列表] | function | ${metrics.functions} 个函数 |\n`;
    }
    if (metrics.classes > 0) {
      content += `| [类列表] | class | ${metrics.classes} 个类 |\n`;
    }
    if (metrics.components > 0) {
      content += `| [组件列表] | component | ${metrics.components} 个组件 |\n`;
    }
  }

  content += `\n详细 API 文档请查看具体章节。\n`;

  return content;
}

/**
 * Generates architecture/design section content.
 *
 * @param {Object} module - Module information
 * @param {Object} complexityReport - Complexity analysis report
 * @returns {string} Architecture content
 */
function generateArchitectureContent(module, complexityReport) {
  let content = `### 模块架构\n\n`;
  content += `\`\`\`\n`;
  content += `${module.name}\n`;
  content += `├── 输入处理\n`;
  content += `├── 核心逻辑\n`;
  content += `└── 输出处理\n`;
  content += `\`\`\`\n\n`;

  if (complexityReport.metrics && complexityReport.metrics.hasSubModules) {
    content += `本模块包含子模块，采用分层架构设计。\n`;
  }

  return content;
}

/**
 * Generates configuration options section content.
 *
 * @param {Object} module - Module information
 * @param {Object} complexityReport - Complexity analysis report
 * @returns {string} Configuration content
 */
function generateConfigContent(module, complexityReport) {
  let content = `### 配置项\n\n`;
  content += `| 配置项 | 类型 | 默认值 | 说明 |\n`;
  content += `|--------|------|--------|------|\n`;
  content += `| enabled | boolean | true | 是否启用 |\n`;
  content += `| timeout | number | 5000 | 超时时间(ms) |\n`;

  return content;
}

/**
 * Generates usage examples section content.
 *
 * @param {Object} module - Module information
 * @param {Object} complexityReport - Complexity analysis report
 * @returns {string} Examples content
 */
function generateExamples(module, complexityReport) {
  let content = `### 基础用法\n\n`;
  content += `\`\`\`javascript\n`;
  content += `import { ${module.name} } from '${module.path || module.name}';\n\n`;
  content += `// 使用示例\n`;
  content += `const result = ${module.name}.process();\n`;
  content += `console.log(result);\n`;
  content += `\`\`\`\n\n`;

  content += `### 进阶用法\n\n`;
  content += `\`\`\`javascript\n`;
  content += `import { ${module.name}, configure } from '${module.path || module.name}';\n\n`;
  content += `// 配置选项\n`;
  content += `configure({\n`;
  content += `  timeout: 10000,\n`;
  content += `  retries: 3\n`;
  content += `});\n\n`;
  content += `// 使用\n`;
  content += `const result = await ${module.name}.processAsync(data);\n`;
  content += `\`\`\`\n`;

  return content;
}

/**
 * Generates best practices section content.
 *
 * @param {Object} module - Module information
 * @param {Object} complexityReport - Complexity analysis report
 * @returns {string} Best practices content
 */
function generateBestPractices(module, complexityReport) {
  let content = `### 推荐用法\n\n`;
  content += `1. **初始化配置**：在使用前进行必要的配置\n`;
  content += `2. **错误处理**：始终使用 try-catch 处理异常\n`;
  content += `3. **资源清理**：使用完毕后及时释放资源\n\n`;
  content += `### 注意事项\n\n`;
  content += `- 确保环境兼容\n`;
  content += `- 注意内存使用\n`;
  content += `- 遵循编码规范\n`;

  return content;
}

/**
 * Generates quick start section content.
 *
 * @param {Object} module - Module information
 * @param {Object} complexityReport - Complexity analysis report
 * @returns {string} Quick start content
 */
function generateQuickStart(module, complexityReport) {
  let content = `### 安装\n\n`;
  content += `\`\`\`bash\n`;
  content += `npm install ${module.name}\n`;
  content += `# 或\n`;
  content += `yarn add ${module.name}\n`;
  content += `\`\`\`\n\n`;

  content += `### 基本使用\n\n`;
  content += `\`\`\`javascript\n`;
  content += `import { ${module.name} } from '${module.path || module.name}';\n\n`;
  content += `// 快速开始\n`;
  content += `${module.name}.init();\n`;
  content += `\`\`\`\n`;

  return content;
}

/**
 * Generates summary section content.
 *
 * @param {Object} module - Module information
 * @param {Object} complexityReport - Complexity analysis report
 * @returns {string} Summary content
 */
function generateSummary(module, complexityReport) {
  const { reasoning } = complexityReport;

  let content = `本模块(${module.name})`;

  if (reasoning && reasoning.recommendation) {
    content += `采用${reasoning.recommendation}生成文档。`;
  }

  content += `\n\n`;
  content += `### 要点回顾\n\n`;
  content += `- 模块复杂度：${complexityReport.score || '中等'}\n`;
  content += `- 文档策略：${complexityReport.strategy ? complexityReport.strategy.description : '章节拆分'}\n`;
  content += `- 适用场景：${complexityReport.metrics && complexityReport.metrics.useCases ? complexityReport.metrics.useCases + '种' : '多种'}\n`;

  return content;
}

/**
 * Creates a simplified complexity report for a submodule.
 * Used during recursive nested document generation or when loading fails.
 *
 * @param {Object} subModule - Submodule information
 * @param {string} subModule.name - Submodule name
 * @param {number} [subModule.complexity] - Submodule complexity score
 * @param {string} [subModule.strategy] - Submodule strategy type
 * @returns {Object} Simplified complexity report for submodule
 */
function createSubModuleReport(subModule) {
  const complexity = subModule.complexity || 30;

  // Determine appropriate strategy for submodule based on complexity
  let strategyType = subModule.strategy || 'sections';
  if (complexity < 30) strategyType = 'single';
  else if (complexity >= 60) strategyType = 'nested';

  return {
    score: complexity,
    metrics: {
      lines: 0,
      exports: 0,
      functions: 0,
      classes: 0,
      components: 0,
      dependencies: 0,
      hasSubModules: false,
      hasComplexLogic: false,
      useCases: 0,
    },
    strategy: {
      type: strategyType,
      description: strategyType === 'single' ? '单文档模式' :
                   strategyType === 'nested' ? '嵌套文档模式' : '章节拆分模式',
      sections: strategyType === 'single' ? ['概述', 'API', '示例'] :
                ['概述', '组件', '函数', '使用示例'],
      maxDepth: 1,
    },
    reasoning: {
      score: complexity,
      strategy: strategyType,
      reasons: ['子模块'],
      recommendation: '继承父模块策略',
    },
  };
}

/**
 * Creates directory recursively if it doesn't exist.
 *
 * @param {string} dirPath - Directory path to create
 * @returns {Promise<void>}
 */
async function mkdir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
    }
  }
}

// Export all public functions
module.exports = {
  generateDocs,
  generateSingleDoc,
  generateSectionedDoc,
  generateNestedDocs,
  generateContainerREADME,
  loadComplexityReport,
  generateSectionContent,
  generateOverview,
  generateComponentsContent,
  generateFunctionsContent,
  generateClassesContent,
  generateCoreLogicContent,
  generateAPIContent,
  generateArchitectureContent,
  generateConfigContent,
  generateExamples,
  generateBestPractices,
  generateQuickStart,
  generateSummary,
  createSubModuleReport,
};
