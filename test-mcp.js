#!/usr/bin/env node

// Simple test script to verify MCP server functionality
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing Gowright MCP Server...\n');

// Test 1: Check if server starts
console.log('1. Testing server startup...');
const serverPath = join(__dirname, 'dist', 'index.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let hasError = false;

server.stdout.on('data', (data) => {
  output += data.toString();
});

server.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
  hasError = true;
});

// Send a simple MCP request to list tools
const listToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
};

setTimeout(() => {
  console.log('2. Sending tools/list request...');
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  
  setTimeout(() => {
    server.kill();
    
    if (hasError) {
      console.log('❌ Server test failed with errors');
      process.exit(1);
    }
    
    if (output.includes('generate_test') && output.includes('analyze_project')) {
      console.log('✅ Server test passed - tools are available');
      console.log('✅ MCP server is ready for use!');
      
      console.log('\n📋 Available tools:');
      console.log('  - generate_test');
      console.log('  - run_test');
      console.log('  - generate_config');
      console.log('  - validate_openapi');
      console.log('  - setup_project');
      console.log('  - analyze_project');
      
      console.log('\n🚀 To use with Kiro:');
      console.log('Add this to your .kiro/settings/mcp.json:');
      console.log(JSON.stringify({
        mcpServers: {
          gowright: {
            command: "uvx",
            args: ["gowright-mcp-server@latest"],
            disabled: false,
            autoApprove: ["generate_test", "generate_config", "analyze_project"]
          }
        }
      }, null, 2));
      
    } else {
      console.log('❌ Server test failed - expected tools not found');
      console.log('Output:', output);
      process.exit(1);
    }
  }, 2000);
}, 1000);