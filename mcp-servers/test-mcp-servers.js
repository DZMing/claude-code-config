#!/usr/bin/env node
/**
 * MCP Servers测试脚本
 *
 * 功能：
 * 1. 测试Codex MCP Server的tools/list和tools/call
 * 2. 测试Gemini MCP Server的tools/list和tools/call
 * 3. 验证JSON-RPC 2.0协议格式
 * 4. 验证错误处理机制
 *
 * 使用：
 * node mcp-servers/test-mcp-servers.js
 */

const { spawn } = require('child_process');
const path = require('path');

// 测试结果统计
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * 测试单个MCP Server
 */
async function testMCPServer(serverName, serverPath) {
  console.log(`\n========== 测试 ${serverName} MCP Server ==========\n`);

  // 测试1: tools/list
  await testToolsList(serverName, serverPath);

  // 测试2: tools/call
  await testToolsCall(serverName, serverPath);

  // 测试3: 错误处理
  await testErrorHandling(serverName, serverPath);
}

/**
 * 测试tools/list
 */
async function testToolsList(serverName, serverPath) {
  const testName = `${serverName} - tools/list`;
  console.log(`测试: ${testName}`);

  try {
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    };

    const response = await sendRequest(serverPath, request);

    // 验证响应格式
    if (response.jsonrpc !== '2.0') {
      throw new Error('响应缺少jsonrpc: "2.0"');
    }

    if (response.id !== 1) {
      throw new Error('响应id不匹配');
    }

    if (!response.result || !response.result.tools) {
      throw new Error('响应缺少result.tools');
    }

    if (response.result.tools.length === 0) {
      throw new Error('工具列表为空');
    }

    // 验证工具定义
    const tool = response.result.tools[0];
    if (!tool.name || !tool.description || !tool.inputSchema) {
      throw new Error('工具定义不完整');
    }

    console.log(`✅ ${testName} 通过`);
    console.log(`   工具数量: ${response.result.tools.length}`);
    console.log(`   工具名称: ${response.result.tools.map(t => t.name).join(', ')}\n`);

    results.passed++;
    results.tests.push({ name: testName, status: 'passed' });
  } catch (error) {
    console.log(`❌ ${testName} 失败`);
    console.log(`   错误: ${error.message}\n`);

    results.failed++;
    results.tests.push({ name: testName, status: 'failed', error: error.message });
  }
}

/**
 * 测试tools/call
 */
async function testToolsCall(serverName, serverPath) {
  const testName = `${serverName} - tools/call`;
  console.log(`测试: ${testName}`);

  try {
    const toolName = serverName.toLowerCase();
    const request = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: {
          prompt: '用Python写一个Hello World程序'
        }
      }
    };

    const response = await sendRequest(serverPath, request);

    // 验证响应格式
    if (response.jsonrpc !== '2.0') {
      throw new Error('响应缺少jsonrpc: "2.0"');
    }

    if (response.id !== 2) {
      throw new Error('响应id不匹配');
    }

    if (response.error) {
      throw new Error(`工具调用返回错误: ${response.error.message}`);
    }

    if (!response.result || !response.result.content) {
      throw new Error('响应缺少result.content');
    }

    console.log(`✅ ${testName} 通过`);
    console.log(`   响应长度: ${JSON.stringify(response.result.content).length} 字符`);
    console.log(`   conversationId: ${response.result.conversationId || 'N/A'}\n`);

    results.passed++;
    results.tests.push({ name: testName, status: 'passed' });
  } catch (error) {
    console.log(`❌ ${testName} 失败`);
    console.log(`   错误: ${error.message}\n`);

    results.failed++;
    results.tests.push({ name: testName, status: 'failed', error: error.message });
  }
}

/**
 * 测试错误处理
 */
async function testErrorHandling(serverName, serverPath) {
  const testName = `${serverName} - 错误处理`;
  console.log(`测试: ${testName}`);

  try {
    const request = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: serverName.toLowerCase(),
        arguments: {
          // 缺少必需的prompt参数
        }
      }
    };

    const response = await sendRequest(serverPath, request);

    // 验证错误响应格式
    if (!response.error) {
      throw new Error('缺少参数时应该返回错误');
    }

    if (response.error.code !== -32602) {
      throw new Error(`错误码应该是-32602，实际是${response.error.code}`);
    }

    console.log(`✅ ${testName} 通过`);
    console.log(`   错误码: ${response.error.code}`);
    console.log(`   错误信息: ${response.error.message}\n`);

    results.passed++;
    results.tests.push({ name: testName, status: 'passed' });
  } catch (error) {
    console.log(`❌ ${testName} 失败`);
    console.log(`   错误: ${error.message}\n`);

    results.failed++;
    results.tests.push({ name: testName, status: 'failed', error: error.message });
  }
}

/**
 * 发送请求到MCP Server
 */
function sendRequest(serverPath, request) {
  return new Promise((resolve, reject) => {
    const server = spawn('node', [serverPath], {
      env: { ...process.env },
      cwd: process.cwd()
    });

    let output = '';
    let errorOutput = '';

    // 发送请求
    server.stdin.write(JSON.stringify(request) + '\n');
    server.stdin.end();

    server.stdout.on('data', (data) => {
      output += data.toString();
    });

    server.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    server.on('close', (code) => {
      if (code !== 0 && !output) {
        reject(new Error(`Server退出码${code}: ${errorOutput}`));
        return;
      }

      try {
        // 解析第一行JSON响应
        const lines = output.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
          reject(new Error('Server没有返回响应'));
          return;
        }

        const response = JSON.parse(lines[0]);
        resolve(response);
      } catch (error) {
        reject(new Error(`解析响应失败: ${error.message}`));
      }
    });

    server.on('error', (error) => {
      reject(new Error(`启动Server失败: ${error.message}`));
    });
  });
}

/**
 * 打印测试摘要
 */
function printSummary() {
  console.log('\n========== 测试摘要 ==========\n');
  console.log(`总测试数: ${results.passed + results.failed}`);
  console.log(`通过: ${results.passed}`);
  console.log(`失败: ${results.failed}`);
  console.log(`成功率: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(2)}%\n`);

  if (results.failed > 0) {
    console.log('失败的测试:');
    results.tests
      .filter(t => t.status === 'failed')
      .forEach(t => {
        console.log(`  - ${t.name}: ${t.error}`);
      });
    console.log('');
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('开始测试MCP Servers...\n');

  const codexServerPath = path.join(__dirname, 'codex-server', 'index.js');
  const geminiServerPath = path.join(__dirname, 'gemini-server', 'index.js');

  // 测试Codex MCP Server
  await testMCPServer('Codex', codexServerPath);

  // 测试Gemini MCP Server
  await testMCPServer('Gemini', geminiServerPath);

  // 打印测试摘要
  printSummary();

  // 根据测试结果退出
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('测试脚本执行失败:', error);
  process.exit(1);
});
