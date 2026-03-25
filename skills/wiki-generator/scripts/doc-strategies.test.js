/**
 * Test Suite for Doc Strategies
 *
 * Tests generateSectionedDoc and other documentation generation functions.
 */

const fs = require('fs').promises;
const path = require('path');
const {
  generateDocs,
  generateSingleDoc,
  generateSectionedDoc,
  generateNestedDocs,
  generateSectionContent,
  generateOverview,
  generateComponentsContent,
  generateFunctionsContent,
  generateClassesContent,
  generateCoreLogicContent,
  generateExamples,
  createSubModuleReport,
} = require('./doc-strategies');

// Test result tracking
const testResults = [];

function assert(condition, testName) {
  if (condition) {
    testResults.push({ name: testName, status: 'PASS' });
    console.log(`✓ ${testName}`);
  } else {
    testResults.push({ name: testName, status: 'FAIL' });
    console.log(`✗ ${testName}`);
  }
}

async function runTests() {
  console.log('=== Doc Strategies Test Suite ===\n');

  // Test 1: generateSectionContent - 概述
  console.log('--- Test 1: generateSectionContent (概述) ---');
  const module1 = { name: 'TestModule', path: 'src/test' };
  const report1 = {
    metrics: { lines: 100, exports: 5, functions: 3, classes: 2, components: 0, useCases: 2 },
    reasoning: { reasons: ['中等复杂度'], recommendation: '章节拆分模式' },
    strategy: { type: 'sections' },
  };
  const overviewContent = generateSectionContent('概述', module1, report1);
  assert(overviewContent.includes('TestModule模块'), 'Should include module name');
  assert(overviewContent.includes('100'), 'Should include line count');
  assert(overviewContent.includes('中等复杂度'), 'Should include complexity reasoning');

  // Test 2: generateSectionContent - 组件
  console.log('\n--- Test 2: generateSectionContent (组件) ---');
  const report2 = {
    metrics: { components: 2 },
    strategy: { type: 'sections' },
  };
  const componentsContent = generateSectionContent('组件', module1, report2);
  assert(componentsContent.includes('2 个组件'), 'Should mention component count');
  assert(componentsContent.includes('组件列表'), 'Should include component list table');

  // Test 3: generateSectionContent - 函数
  console.log('\n--- Test 3: generateSectionContent (函数) ---');
  const report3 = {
    metrics: { functions: 5 },
    strategy: { type: 'sections' },
  };
  const functionsContent = generateSectionContent('函数', module1, report3);
  assert(functionsContent.includes('5 个函数'), 'Should mention function count');
  assert(functionsContent.includes('函数列表'), 'Should include function list table');

  // Test 4: generateSectionContent - 类
  console.log('\n--- Test 4: generateSectionContent (类) ---');
  const report4 = {
    metrics: { classes: 1 },
    strategy: { type: 'sections' },
  };
  const classesContent = generateSectionContent('类', module1, report4);
  assert(classesContent.includes('1 个类'), 'Should mention class count');
  assert(classesContent.includes('类列表'), 'Should include class list table');

  // Test 5: generateSectionContent - 核心逻辑
  console.log('\n--- Test 5: generateSectionContent (核心逻辑) ---');
  const coreLogicContent = generateSectionContent('核心逻辑', module1, report1);
  assert(coreLogicContent.includes('核心逻辑'), 'Should mention core logic');
  assert(coreLogicContent.includes('主要流程'), 'Should include main flow');

  // Test 6: generateSectionContent - 使用示例
  console.log('\n--- Test 6: generateSectionContent (使用示例) ---');
  const examplesContent = generateSectionContent('使用示例', module1, report1);
  assert(examplesContent.includes('基础用法'), 'Should include basic usage');
  assert(examplesContent.includes('```javascript'), 'Should include code blocks');
  assert(examplesContent.includes('import'), 'Should include import statement');

  // Test 7: generateSectionContent - unknown section
  console.log('\n--- Test 7: generateSectionContent (unknown) ---');
  const unknownContent = generateSectionContent('自定义章节', module1, report1);
  assert(unknownContent.includes('自定义章节'), 'Should handle unknown sections gracefully');

  // Test 8: generateOverview
  console.log('\n--- Test 8: generateOverview ---');
  const overview = generateOverview(module1, report1);
  assert(overview.includes('TestModule'), 'Overview should include module name');
  assert(overview.includes('100 行代码'), 'Overview should include line count');

  // Test 9: createSubModuleReport
  console.log('\n--- Test 9: createSubModuleReport ---');
  const subModule = { name: 'sub', complexity: 45, strategy: 'sections' };
  const subReport = createSubModuleReport(subModule);
  assert(subReport.score === 45, 'Should preserve complexity score');
  assert(subReport.strategy.type === 'sections', 'Should preserve strategy type');
  assert(subReport.strategy.sections.includes('概述'), 'Should include default sections');

  // Test 10: createSubModuleReport (low complexity)
  console.log('\n--- Test 10: createSubModuleReport (low complexity) ---');
  const subModuleLow = { name: 'simple', complexity: 20 };
  const subReportLow = createSubModuleReport(subModuleLow);
  assert(subReportLow.strategy.type === 'single', 'Low complexity should use single strategy');

  // Test 11: createSubModuleReport (high complexity)
  console.log('\n--- Test 11: createSubModuleReport (high complexity) ---');
  const subModuleHigh = { name: 'complex', complexity: 75 };
  const subReportHigh = createSubModuleReport(subModuleHigh);
  assert(subReportHigh.strategy.type === 'nested', 'High complexity should use nested strategy');

  // Test 12: Integration test - generateSectionedDoc
  console.log('\n--- Test 12: Integration Test (generateSectionedDoc) ---');
  try {
    const testModule = { name: 'TestSectionedDoc', path: 'src/test' };
    const testReport = {
      score: 45,
      metrics: {
        lines: 300,
        exports: 8,
        functions: 5,
        classes: 2,
        components: 1,
        useCases: 3,
        hasComplexLogic: true,
      },
      strategy: {
        type: 'sections',
        description: '章节拆分模式',
        sections: ['概述', '组件', '函数', '类', '核心逻辑', '使用示例'],
        maxDepth: 1,
      },
      reasoning: {
        score: 45,
        strategy: 'sections',
        reasons: ['中等代码量', '多个导出'],
        recommendation: '章节拆分模式',
      },
    };

    const outputPath = await generateSectionedDoc(testModule, testReport);
    const fileContent = await fs.readFile(outputPath, 'utf-8');

    assert(fileContent.includes('# TestSectionedDoc'), 'Should have main title');
    assert(fileContent.includes('## 概述'), 'Should have overview section');
    assert(fileContent.includes('## 组件'), 'Should have components section');
    assert(fileContent.includes('## 函数'), 'Should have functions section');
    assert(fileContent.includes('## 类'), 'Should have classes section');
    assert(fileContent.includes('## 核心逻辑'), 'Should have core logic section');
    assert(fileContent.includes('## 使用示例'), 'Should have examples section');
    assert(fileContent.includes('## 总结'), 'Should have summary section');

    // Cleanup
    await fs.unlink(outputPath);
    await fs.rmdir(path.dirname(outputPath));

    console.log('  Integration test completed successfully');
  } catch (error) {
    console.error('  Integration test error:', error.message);
    assert(false, 'Integration test should complete without errors');
  }

  // Test 13: generateSectionedDoc with default sections
  console.log('\n--- Test 13: generateSectionedDoc (default sections) ---');
  try {
    const testModule = { name: 'TestDefaultSections', path: 'src/test2' };
    const testReport = {
      score: 35,
      strategy: {
        type: 'sections',
        description: '章节拆分模式',
        // No sections specified - should use defaults
      },
    };

    const outputPath = await generateSectionedDoc(testModule, testReport);
    const fileContent = await fs.readFile(outputPath, 'utf-8');

    assert(fileContent.includes('## 概述'), 'Should have default overview section');
    assert(fileContent.includes('## API'), 'Should have default API section');
    assert(fileContent.includes('## 示例'), 'Should have default examples section');

    // Cleanup
    await fs.unlink(outputPath);
    await fs.rmdir(path.dirname(outputPath));

    console.log('  Default sections test completed successfully');
  } catch (error) {
    console.error('  Default sections test error:', error.message);
    assert(false, 'Default sections test should complete without errors');
  }

  // Summary
  console.log('\n=== Test Summary ===');
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  console.log(`Total: ${testResults.length} tests`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    testResults.filter(r => r.status === 'FAIL').forEach(r => console.log(`  - ${r.name}`));
    process.exit(1);
  } else {
    console.log('\n✓ All tests passed!');
    process.exit(0);
  }
}

runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
