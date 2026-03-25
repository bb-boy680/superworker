/**
 * Test Suite for ComplexityAnalyzer
 *
 * Tests all methods of the ComplexityAnalyzer class with various scenarios.
 */

const fs = require('fs').promises;
const path = require('path');
const { ComplexityAnalyzer } = require('./complexity-analyzer');

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
  console.log('=== ComplexityAnalyzer Test Suite ===\n');

  const analyzer = new ComplexityAnalyzer();

  // Test 1: analyzeFile - simple file
  console.log('--- Test 1: analyzeFile (simple) ---');
  const simpleCode = `export const add = (a, b) => a + b;
export function subtract(a, b) {
  return a - b;
}
`;
  const simpleMetrics = analyzer.analyzeFile(simpleCode);
  assert(simpleMetrics.lines === 5, 'Should count 5 lines');
  assert(simpleMetrics.exports.length === 2, 'Should find 2 exports');
  assert(simpleMetrics.functions.length === 2, 'Should find 2 functions');
  assert(simpleMetrics.classes.length === 0, 'Should find 0 classes');
  assert(simpleMetrics.components.length === 0, 'Should find 0 components');

  // Test 2: analyzeFile - complex file with classes and components
  console.log('\n--- Test 2: analyzeFile (complex) ---');
  const complexCode = `
import React from 'react';

export class DataService {
  async fetchData() {
    return await fetch('/api/data');
  }
}

export const UserComponent: React.FC = () => {
  return <div>User</div>;
};

export const AdminComponent = () => {
  return <div>Admin</div>;
};
`;
  const complexMetrics = analyzer.analyzeFile(complexCode);
  assert(complexMetrics.lines === 17, 'Should count 17 lines');
  assert(complexMetrics.exports.length === 3, 'Should find 3 exports');
  assert(complexMetrics.classes.length === 1, 'Should find 1 class');
  assert(complexMetrics.components.length === 1, 'Should find 1 React component');

  // Test 3: calculateScore - simple module (low score)
  console.log('\n--- Test 3: calculateScore (simple) ---');
  const simpleModuleMetrics = {
    lines: 50,
    exports: 2,
    dependencies: 3,
    hasSubModules: false,
    hasComplexLogic: false,
    useCases: 1,
  };
  const simpleScore = analyzer.calculateScore(simpleModuleMetrics);
  assert(simpleScore < 30, `Simple module score should be < 30 (got ${simpleScore})`);
  assert(simpleScore >= 0, 'Score should be non-negative');

  // Test 4: calculateScore - medium complexity
  console.log('\n--- Test 4: calculateScore (medium) ---');
  const mediumMetrics = {
    lines: 300,
    exports: 8,
    dependencies: 10,
    hasSubModules: false,
    hasComplexLogic: false,
    useCases: 2,
  };
  const mediumScore = analyzer.calculateScore(mediumMetrics);
  assert(mediumScore >= 30 && mediumScore < 60, `Medium complexity score should be 30-60 (got ${mediumScore})`);

  // Test 5: calculateScore - high complexity
  console.log('\n--- Test 5: calculateScore (high) ---');
  const highMetrics = {
    lines: 1200,
    exports: 15,
    dependencies: 20,
    hasSubModules: true,
    hasComplexLogic: true,
    useCases: 4,
  };
  const highScore = analyzer.calculateScore(highMetrics);
  assert(highScore >= 60, `High complexity score should be >= 60 (got ${highScore})`);
  assert(highScore <= 100, 'Score should not exceed 100');

  // Test 6: decideStrategy - single document
  console.log('\n--- Test 6: decideStrategy (single) ---');
  const singleStrategy = analyzer.decideStrategy(20, { components: 0, functions: 2, classes: 0, hasComplexLogic: false });
  assert(singleStrategy.type === 'single', 'Should choose single document strategy');
  assert(singleStrategy.maxDepth === 1, 'Should have maxDepth of 1');
  assert(singleStrategy.sections.includes('概述'), 'Should include 概述 section');

  // Test 7: decideStrategy - sections
  console.log('\n--- Test 7: decideStrategy (sections) ---');
  const sectionsMetrics = { components: 2, functions: 5, classes: 1, hasComplexLogic: true };
  const sectionsStrategy = analyzer.decideStrategy(45, sectionsMetrics);
  assert(sectionsStrategy.type === 'sections', 'Should choose sections strategy');
  assert(sectionsStrategy.sections.includes('组件'), 'Should include 组件 section');
  assert(sectionsStrategy.sections.includes('函数'), 'Should include 函数 section');
  assert(sectionsStrategy.sections.includes('核心逻辑'), 'Should include 核心逻辑 section');

  // Test 8: decideStrategy - nested
  console.log('\n--- Test 8: decideStrategy (nested) ---');
  const nestedMetrics = { hasSubModules: true };
  const nestedStrategy = analyzer.decideStrategy(75, nestedMetrics);
  assert(nestedStrategy.type === 'nested', 'Should choose nested strategy');
  assert(nestedStrategy.maxDepth === 3, 'Should have maxDepth of 3 with submodules');

  // Test 9: detectComplexLogic - nested conditions
  console.log('\n--- Test 9: detectComplexLogic (nested) ---');
  const nestedLogic = `
if (condition) {
  if (nested) {
    doSomething();
  }
}
`;
  assert(analyzer.detectComplexLogic(nestedLogic) === true, 'Should detect nested if statements');

  // Test 10: detectComplexLogic - React hooks
  console.log('\n--- Test 10: detectComplexLogic (hooks) ---');
  const hooksCode = `
useEffect(() => {
  fetchData();
}, [deps]);
`;
  assert(analyzer.detectComplexLogic(hooksCode) === true, 'Should detect React hooks');

  // Test 11: detectComplexLogic - state management
  console.log('\n--- Test 11: detectComplexLogic (state) ---');
  const stateCode = `const store = createStore(reducer);`;
  assert(analyzer.detectComplexLogic(stateCode) === true, 'Should detect state management');

  // Test 12: detectComplexLogic - simple code
  console.log('\n--- Test 12: detectComplexLogic (simple) ---');
  const simpleLogic = `
function add(a, b) {
  return a + b;
}
`;
  assert(analyzer.detectComplexLogic(simpleLogic) === false, 'Should not detect complexity in simple code');

  // Test 13: identifyUseCases - CRUD operations
  console.log('\n--- Test 13: identifyUseCases (CRUD) ---');
  const crudExports = [
    'export const createUser',
    'export const updateUser',
    'export const deleteUser',
    'export const getUser',
    'export const listUsers',
  ];
  const crudMetrics = { exports: crudExports };
  const useCases = analyzer.identifyUseCases('', crudMetrics);
  assert(useCases === 5, `Should identify 5 use cases (got ${useCases})`);

  // Test 14: identifyUseCases - limited operations
  console.log('\n--- Test 14: identifyUseCases (limited) ---');
  const limitedExports = [
    'export const addItem',
    'export const removeItem',
  ];
  const limitedMetrics = { exports: limitedExports };
  const limitedUseCases = analyzer.identifyUseCases('', limitedMetrics);
  assert(limitedUseCases === 2, `Should identify 2 use cases (got ${limitedUseCases})`);

  // Test 15: generateSections - with components and functions
  console.log('\n--- Test 15: generateSections ---');
  const genSectionsMetrics = {
    components: 2,
    functions: 5,
    classes: 1,
    hasComplexLogic: true,
  };
  const sections = analyzer.generateSections(genSectionsMetrics);
  assert(sections[0] === '概述', 'First section should be 概述');
  assert(sections.includes('组件'), 'Should include 组件');
  assert(sections.includes('函数'), 'Should include 函数');
  assert(sections.includes('类'), 'Should include 类');
  assert(sections.includes('核心逻辑'), 'Should include 核心逻辑');
  assert(sections[sections.length - 1] === '使用示例', 'Last section should be 使用示例');

  // Test 16: generateReasoning - complex module
  console.log('\n--- Test 16: generateReasoning ---');
  const reasoningMetrics = {
    lines: 800,
    exports: 10,
    hasSubModules: true,
    hasComplexLogic: true,
    useCases: 4,
  };
  const reasoning = analyzer.generateReasoning(reasoningMetrics, 85, { type: 'nested', description: '嵌套文档模式' });
  assert(reasoning.score === 85, 'Should include correct score');
  assert(reasoning.strategy === 'nested', 'Should include correct strategy');
  assert(reasoning.reasons.length > 0, 'Should have reasons');
  assert(reasoning.reasons.includes('包含子模块'), 'Should mention submodules');
  assert(reasoning.recommendation === '嵌套文档模式', 'Should include recommendation');

  // Test 17: generateReasoning - simple module
  console.log('\n--- Test 17: generateReasoning (simple) ---');
  const simpleReasoningMetrics = {
    lines: 50,
    exports: 2,
    hasSubModules: false,
    hasComplexLogic: false,
    useCases: 1,
  };
  const simpleReasoning = analyzer.generateReasoning(simpleReasoningMetrics, 15, { type: 'single', description: '单文档模式' });
  assert(simpleReasoning.reasons.length === 1, 'Should have one reason for simple module');
  assert(simpleReasoning.reasons[0] === '功能简单', 'Simple module should have 功能简单 as reason');

  // Test 18: extractImports
  console.log('\n--- Test 18: extractImports ---');
  const importCode = `
import React from 'react';
import { useState, useEffect } from 'react';
const fs = require('fs');
`;
  const imports = analyzer.extractImports(importCode);
  assert(imports.length === 3, `Should extract 3 imports (got ${imports.length})`);

  // Test 19: Integration test - create temp files and analyze
  console.log('\n--- Test 19: Integration Test ---');
  try {
    const testDir = path.join(__dirname, 'test-temp');
    const entryFile = path.join(testDir, 'index.js');
    const relatedFile = path.join(testDir, 'utils.js');

    // Create test directory and files
    await fs.mkdir(testDir, { recursive: true });

    const entryContent = `
import { helper } from './utils';
import React from 'react';

export const createUser = (data) => ({ ...data, id: 1 });
export const updateUser = (id, data) => ({ id, ...data });
export const deleteUser = (id) => ({ id, deleted: true });
export const getUser = (id) => ({ id, name: 'User' });
export const listUsers = () => [{ id: 1, name: 'User' }];

export class UserService {
  async fetchAll() {
    return await fetch('/api/users');
  }
}

export const UserCard: React.FC = ({ user }) => {
  return <div>{user.name}</div>;
};
`;

    const utilsContent = `
export const helper = () => console.log('help');
export const formatDate = (d) => d.toISOString();
`;

    await fs.writeFile(entryFile, entryContent);
    await fs.writeFile(relatedFile, utilsContent);

    // Run analysis
    const result = await analyzer.analyze(entryFile, [relatedFile]);

    assert(result.score > 0, 'Should have a positive score');
    assert(result.metrics.lines > 0, 'Should count lines');
    assert(result.metrics.exports >= 7, 'Should count exports');
    assert(result.metrics.components >= 1, 'Should detect components');
    assert(result.metrics.classes >= 1, 'Should detect classes');
    assert(result.metrics.functions >= 5, 'Should detect functions');
    assert(result.metrics.useCases >= 4, 'Should identify use cases');
    assert(result.strategy.type, 'Should have strategy type');
    assert(result.reasoning, 'Should have reasoning');

    // Cleanup
    await fs.unlink(entryFile);
    await fs.unlink(relatedFile);
    await fs.rmdir(testDir);

    console.log('  Integration test completed successfully');
  } catch (error) {
    console.error('  Integration test error:', error.message);
    assert(false, 'Integration test should complete without errors');
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
