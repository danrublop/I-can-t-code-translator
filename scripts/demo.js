#!/usr/bin/env node

/**
 * CodeLens Translator Demo Script
 * This script tests the core functionality without running the full Electron app
 */

const axios = require('axios');

// Sample code snippets for testing
const testCodeSnippets = [
  {
    name: 'JavaScript Function',
    code: `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`,
    expectedLanguage: 'javascript'
  },
  {
    name: 'Python Class',
    code: `class Calculator:
    def __init__(self):
        self.result = 0
    
    def add(self, x):
        self.result += x
        return self`,
    expectedLanguage: 'python'
  },
  {
    name: 'Java Method',
    code: `public static int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}`,
    expectedLanguage: 'java'
  },
  {
    name: 'C++ Function',
    code: `#include <iostream>
using namespace std;

int gcd(int a, int b) {
    return b == 0 ? a : gcd(b, a % b);
}`,
    expectedLanguage: 'cpp'
  }
];

// Test Ollama connection
async function testOllamaConnection() {
  console.log('🔌 Testing Ollama connection...');
  
  try {
    const response = await axios.get('http://127.0.0.1:11434/api/tags', {
      timeout: 5000
    });
    
    if (response.status === 200) {
      console.log('✅ Ollama is running and accessible');
      
      // Check available models
      const models = response.data.models || [];
      const mistralModel = models.find((model) => model.name.includes('mistral'));
      
      if (mistralModel) {
        console.log(`✅ Mistral model found: ${mistralModel.name}`);
        return true;
      } else {
        console.log('⚠️  Mistral model not found. Run: ollama pull mistral:latest');
        return false;
      }
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Ollama is not running. Start it with: ollama serve');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('❌ Ollama connection timed out');
    } else {
      console.log(`❌ Ollama connection error: ${error.message}`);
    }
    return false;
  }
  
  return false;
}

// Test code analysis (simplified version)
function analyzeCode(code) {
  const lines = code.split('\n');
  const trimmedCode = code.trim();
  
  if (!trimmedCode) return { language: 'text', confidence: 0 };
  
  const scores = {
    javascript: 0,
    python: 0,
    java: 0,
    cpp: 0
  };
  
  // JavaScript patterns
  if (code.includes('function') || code.includes('const') || code.includes('let')) scores.javascript += 10;
  if (code.includes('=>') || code.includes('import') || code.includes('export')) scores.javascript += 15;
  
  // Python patterns
  if (code.includes('def ') || code.includes('class ') || code.includes('import ')) scores.python += 15;
  if (code.includes(':') && code.includes('    ')) scores.python += 10;
  
  // Java patterns
  if (code.includes('public ') || code.includes('private ') || code.includes('class ')) scores.java += 15;
  if (code.includes(';') && code.includes('{') && code.includes('}')) scores.java += 10;
  
  // C++ patterns
  if (code.includes('#include') || code.includes('using namespace')) scores.cpp += 15;
  if (code.includes('std::') || code.includes('cout')) scores.cpp += 10;
  
  // Find best match
  let bestLanguage = 'text';
  let bestScore = 0;
  
  for (const [language, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestLanguage = language;
    }
  }
  
  const confidence = Math.min(100, Math.max(0, bestScore / Math.max(1, lines.length) * 10));
  
  return { language: bestLanguage, confidence: Math.round(confidence) };
}

// Test AI explanation generation
async function testAIExplanation(code, language) {
  console.log(`🤖 Testing AI explanation for ${language} code...`);
  
  try {
    const prompt = `Explain this ${language} code in simple terms:

\`\`\`${language}
${code}
\`\`\`

Provide a brief explanation of what this code does.`;

    const response = await axios.post('http://127.0.0.1:11434/api/generate', {
      model: 'mistral:latest',
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 500
      }
    }, { timeout: 30000 });

    if (response.data.done && response.data.response) {
      console.log('✅ AI explanation generated successfully');
      console.log('📝 Explanation preview:');
      console.log(response.data.response.substring(0, 200) + '...');
      return true;
    } else {
      console.log('❌ Incomplete AI response');
      return false;
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Ollama is not running');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('❌ AI request timed out');
    } else {
      console.log(`❌ AI request error: ${error.message}`);
    }
    return false;
  }
}

// Run demo tests
async function runDemo() {
  console.log('🚀 CodeLens Translator Demo\n');
  
  // Test Ollama connection
  const ollamaConnected = await testOllamaConnection();
  console.log('');
  
  if (!ollamaConnected) {
    console.log('⚠️  Skipping AI tests due to Ollama connection issues');
    console.log('   Please ensure Ollama is running and Mistral model is available');
    console.log('');
  }
  
  // Test code analysis
  console.log('🔍 Testing code analysis...');
  for (const snippet of testCodeSnippets) {
    const analysis = analyzeCode(snippet.code);
    const status = analysis.language === snippet.expectedLanguage ? '✅' : '⚠️';
    
    console.log(`${status} ${snippet.name}:`);
    console.log(`   Detected: ${analysis.language} (confidence: ${analysis.confidence}%)`);
    console.log(`   Expected: ${snippet.expectedLanguage}`);
    console.log('');
  }
  
  // Test AI explanation if Ollama is available
  if (ollamaConnected) {
    console.log('🤖 Testing AI explanation generation...');
    const testSnippet = testCodeSnippets[0]; // Use JavaScript snippet
    const analysis = analyzeCode(testSnippet.code);
    
    await testAIExplanation(testSnippet.code, analysis.language);
    console.log('');
  }
  
  console.log('🎉 Demo completed!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Ensure Ollama is running: ollama serve');
  console.log('2. Install dependencies: npm install');
  console.log('3. Build the project: npm run build');
  console.log('4. Start the app: npm start');
  console.log('');
  console.log('📚 Check README.md for detailed setup instructions');
}

// Run the demo
if (require.main === module) {
  runDemo().catch(console.error);
}

module.exports = { testOllamaConnection, analyzeCode, testAIExplanation };
