export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  extensions: string[];
  keywords: string[];
}

export class CodeAnalysisService {
  private readonly languagePatterns: Map<string, { keywords: string[]; extensions: string[]; patterns: RegExp[] }>;

  constructor() {
    this.languagePatterns = this.initializeLanguagePatterns();
  }

  async detectLanguage(code: string): Promise<string> {
    const result = await this.analyzeCode(code);
    
    // Return the language with highest confidence
    return result.language;
  }

  async analyzeCode(code: string): Promise<LanguageDetectionResult> {
    const lines = code.split('\n');
    const trimmedCode = code.trim();
    
    if (!trimmedCode) {
      return { language: 'text', confidence: 0, extensions: [], keywords: [] };
    }

    const scores = new Map<string, number>();
    const detectedKeywords = new Map<string, string[]>();

    // Analyze each language pattern
    for (const [language, pattern] of this.languagePatterns) {
      let score = 0;
      const foundKeywords: string[] = [];

      // Check for file extensions in comments or shebangs
      if (pattern.extensions.length > 0) {
        const extensionMatch = trimmedCode.match(/\.(?:[a-zA-Z0-9]+)$/m);
        if (extensionMatch && pattern.extensions.includes(extensionMatch[1])) {
          score += 50;
        }
      }

      // Check for shebangs
      if (trimmedCode.startsWith('#!')) {
        const shebang = trimmedCode.split('\n')[0];
        if (this.matchesShebang(shebang, language)) {
          score += 40;
        }
      }

      // Check for language-specific keywords
      for (const keyword of pattern.keywords) {
        // Escape special regex characters to prevent invalid patterns
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
        const matches = trimmedCode.match(regex);
        if (matches) {
          score += matches.length * 2;
          foundKeywords.push(keyword);
        }
      }

      // Check for language-specific patterns
      for (const patternRegex of pattern.patterns) {
        if (patternRegex.test(trimmedCode)) {
          score += 10;
        }
      }

      // Check for language-specific syntax structures
      score += this.analyzeSyntaxStructure(trimmedCode, language);

      scores.set(language, score);
      detectedKeywords.set(language, foundKeywords);
    }

    // Find the language with highest score
    let bestLanguage = 'text';
    let bestScore = 0;

    for (const [language, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        bestLanguage = language;
      }
    }

    // Calculate confidence based on score and number of lines
    const confidence = Math.min(100, Math.max(0, bestScore / Math.max(1, lines.length) * 10));

    return {
      language: bestLanguage,
      confidence: Math.round(confidence),
      extensions: this.languagePatterns.get(bestLanguage)?.extensions || [],
      keywords: detectedKeywords.get(bestLanguage) || []
    };
  }

  private initializeLanguagePatterns(): Map<string, { keywords: string[]; extensions: string[]; patterns: RegExp[] }> {
    const patterns = new Map();

    // JSON
    patterns.set('json', {
      keywords: ['{', '}', '[', ']', '"', ':', ',', 'true', 'false', 'null'],
      extensions: ['json', 'jsonc'],
      patterns: [
        /^\s*\{/m,
        /^\s*\[/m,
        /"[^"]*"\s*:/,
        /:\s*"[^"]*"/,
        /:\s*\{/,
        /:\s*\[/,
        /:\s*(true|false|null)/,
        /:\s*\d+/
      ]
    });

    // JavaScript/TypeScript
    patterns.set('typescript', {
      keywords: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'import', 'export', 'async', 'await', 'interface', 'type', 'enum', 'namespace', 'declare', 'module'],
      extensions: ['ts', 'tsx', 'd.ts'],
      patterns: [
        /function\s+\w+\s*\(/,
        /=>/,
        /import\s+.*\s+from/,
        /export\s+(default\s+)?(function|class|const|let|var|interface|type|enum)/,
        /interface\s+\w+/,
        /type\s+\w+/,
        /enum\s+\w+/,
        /declare\s+module/
      ]
    });

    // JavaScript (fallback)
    patterns.set('javascript', {
      keywords: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'import', 'export', 'async', 'await'],
      extensions: ['js', 'jsx', 'mjs'],
      patterns: [
        /function\s+\w+\s*\(/,
        /=>/,
        /import\s+.*\s+from/,
        /export\s+(default\s+)?(function|class|const|let|var)/
      ]
    });

    // Python
    patterns.set('python', {
      keywords: ['def', 'class', 'import', 'from', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with', 'as'],
      extensions: ['py', 'pyw', 'pyi'],
      patterns: [
        /def\s+\w+\s*\(/,
        /class\s+\w+/,
        /import\s+\w+/,
        /from\s+\w+\s+import/,
        /if\s+__name__\s*==\s*['"]__main__['"]/
      ]
    });

    // Java
    patterns.set('java', {
      keywords: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'static', 'final', 'void', 'int', 'String'],
      extensions: ['java'],
      patterns: [
        /public\s+class\s+\w+/,
        /public\s+static\s+void\s+main/,
        /import\s+java\./,
        /System\.out\.println/
      ]
    });

    // C/C++
    patterns.set('cpp', {
      keywords: ['#include', '#define', 'int', 'main', 'void', 'char', 'float', 'double', 'if', 'else', 'for', 'while', 'return'],
      extensions: ['c', 'cpp', 'cc', 'cxx', 'h', 'hpp'],
      patterns: [
        /#include\s*[<"][^>"]*[>"]/,
        /int\s+main\s*\(/,
        /std::/,
        /cout\s*<</
      ]
    });

    // C#
    patterns.set('csharp', {
      keywords: ['using', 'namespace', 'class', 'public', 'private', 'protected', 'static', 'void', 'int', 'string', 'var', 'foreach'],
      extensions: ['cs'],
      patterns: [
        /using\s+System/,
        /namespace\s+\w+/,
        /public\s+class\s+\w+/,
        /Console\.WriteLine/
      ]
    });

    // Go
    patterns.set('go', {
      keywords: ['package', 'import', 'func', 'var', 'const', 'type', 'struct', 'interface', 'if', 'else', 'for', 'range', 'return'],
      extensions: ['go'],
      patterns: [
        /package\s+main/,
        /func\s+main\s*\(/,
        /import\s*\(/,
        /fmt\.Println/
      ]
    });

    // Rust
    patterns.set('rust', {
      keywords: ['fn', 'let', 'mut', 'struct', 'enum', 'impl', 'trait', 'use', 'mod', 'pub', 'if', 'else', 'for', 'while', 'match'],
      extensions: ['rs'],
      patterns: [
        /fn\s+main\s*\(/,
        /let\s+mut\s+\w+/,
        /println!/,
        /use\s+std::/
      ]
    });

    // PHP
    patterns.set('php', {
      keywords: ['<?php', 'function', 'class', 'public', 'private', 'protected', 'echo', 'print', 'if', 'else', 'foreach', 'while'],
      extensions: ['php'],
      patterns: [
        /<\?php/,
        /function\s+\w+\s*\(/,
        /echo\s+/,
        /\$\w+/
      ]
    });

    // Ruby
    patterns.set('ruby', {
      keywords: ['def', 'class', 'module', 'require', 'include', 'extend', 'attr_accessor', 'if', 'else', 'elsif', 'end', 'do'],
      extensions: ['rb'],
      patterns: [
        /def\s+\w+/,
        /class\s+\w+/,
        /require\s+['"]/,
        /puts\s+/
      ]
    });

    // Swift
    patterns.set('swift', {
      keywords: ['import', 'class', 'struct', 'enum', 'func', 'var', 'let', 'if', 'else', 'guard', 'for', 'while', 'switch'],
      extensions: ['swift'],
      patterns: [
        /import\s+\w+/,
        /func\s+\w+\s*\(/,
        /class\s+\w+/,
        /print\s*\(/
      ]
    });

    // Kotlin
    patterns.set('kotlin', {
      keywords: ['fun', 'class', 'object', 'interface', 'val', 'var', 'if', 'else', 'when', 'for', 'while', 'return'],
      extensions: ['kt', 'kts'],
      patterns: [
        /fun\s+main\s*\(/,
        /class\s+\w+/,
        /println\s*\(/,
        /import\s+\w+/
      ]
    });

    // HTML
    patterns.set('html', {
      keywords: ['<!DOCTYPE', '<html', '<head', '<body', '<div', '<span', '<p', '<a', '<img', '<script', '<style'],
      extensions: ['html', 'htm'],
      patterns: [
        /<!DOCTYPE\s+html/,
        /<html[^>]*>/,
        /<head[^>]*>/,
        /<body[^>]*>/
      ]
    });

    // CSS
    patterns.set('css', {
      keywords: ['color', 'background', 'margin', 'padding', 'border', 'font', 'display', 'position', 'width', 'height'],
      extensions: ['css'],
      patterns: [
        /\{[^}]*\}/,
        /[a-zA-Z-]+\s*:/,
        /@media/,
        /@import/
      ]
    });

    // SQL
    patterns.set('sql', {
      keywords: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'TABLE', 'JOIN', 'GROUP BY'],
      extensions: ['sql'],
      patterns: [
        /SELECT\s+.+\s+FROM/i,
        /INSERT\s+INTO/i,
        /CREATE\s+TABLE/i,
        /UPDATE\s+\w+\s+SET/i
      ]
    });

    // Shell/Bash
    patterns.set('shell', {
      keywords: ['#!/bin/bash', '#!/bin/sh', 'echo', 'export', 'source', 'if', 'then', 'else', 'fi', 'for', 'while', 'do'],
      extensions: ['sh', 'bash', 'zsh'],
      patterns: [
        /#!\/bin\/(bash|sh|zsh)/,
        /echo\s+/,
        /export\s+\w+/,
        /if\s+\[/
      ]
    });

    return patterns;
  }

  private matchesShebang(shebang: string, language: string): boolean {
    const shebangPatterns: { [key: string]: RegExp[] } = {
      'python': [/python/, /python3/],
      'shell': [/bash/, /sh/, /zsh/],
      'ruby': [/ruby/],
      'perl': [/perl/],
      'node': [/node/],
      'php': [/php/]
    };

    const patterns = shebangPatterns[language];
    if (!patterns) return false;

    return patterns.some(pattern => pattern.test(shebang));
  }

  private analyzeSyntaxStructure(code: string, language: string): number {
    let score = 0;

    switch (language) {
      case 'typescript':
        // Check for TypeScript-specific patterns
        if (code.includes('interface') || code.includes('type') || code.includes('enum')) score += 10;
        if (code.includes('{') && code.includes('}')) score += 5;
        if (code.includes('(') && code.includes(')')) score += 5;
        if (code.includes(';')) score += 3;
        if (code.includes('import') || code.includes('export')) score += 5;
        break;
      
      case 'javascript':
        // Check for common JS patterns
        if (code.includes('{') && code.includes('}')) score += 5;
        if (code.includes('(') && code.includes(')')) score += 5;
        if (code.includes(';')) score += 3;
        if (code.includes('import') || code.includes('export')) score += 5;
        break;
      
      case 'python':
        // Check for Python indentation and colons
        if (code.includes(':')) score += 5;
        if (code.includes('    ') || code.includes('\t')) score += 3;
        break;
      
      case 'java':
        // Check for Java patterns
        if (code.includes('{') && code.includes('}')) score += 5;
        if (code.includes(';')) score += 5;
        if (code.includes('public') || code.includes('private')) score += 3;
        break;
      
      case 'cpp':
        // Check for C++ patterns
        if (code.includes('#include')) score += 5;
        if (code.includes('{') && code.includes('}')) score += 5;
        if (code.includes(';')) score += 3;
        break;
      
      case 'html':
        // Check for HTML tags
        if (code.includes('<') && code.includes('>')) score += 5;
        if (code.includes('</')) score += 3;
        break;
      
      case 'css':
        // Check for CSS patterns
        if (code.includes('{') && code.includes('}')) score += 5;
        if (code.includes(':')) score += 5;
        if (code.includes(';')) score += 3;
        break;
    }

    return score;
  }
}
