#!/usr/bin/env node

/**
 * テストデバッグスクリプト
 * テストエラーの詳細な分析と解決提案を行う
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestDebugger {
  constructor() {
    this.projectRoot = process.cwd();
    this.testResults = [];
    this.errorPatterns = {
      typeError: /TypeError|型エラー/i,
      asyncError: /async|await|Promise/i,
      mockError: /mock|Mock/i,
      importError: /Cannot find module|import/i,
      jestError: /Jest|jest/i
    };
  }

  /**
   * テストを実行してエラーを分析
   */
  async analyzeTests() {
    console.log('🔍 テストを実行してエラーを分析中...\n');
    
    try {
      const output = execSync('npm test 2>&1', { 
        encoding: 'utf8',
        cwd: this.projectRoot 
      });
      
      this.parseTestOutput(output);
      this.generateReport();
      
    } catch (error) {
      console.error('❌ テスト実行中にエラーが発生しました:', error.message);
      this.parseTestOutput(error.stdout || error.message);
      this.generateReport();
    }
  }

  /**
   * テスト出力を解析
   */
  parseTestOutput(output) {
    const lines = output.split('\n');
    let currentTest = null;
    
    for (const line of lines) {
      // テストスイートの開始
      if (line.includes('FAIL') || line.includes('PASS')) {
        const match = line.match(/(FAIL|PASS)\s+(.+)/);
        if (match) {
          currentTest = {
            status: match[1],
            name: match[2],
            errors: []
          };
          this.testResults.push(currentTest);
        }
      }
      
      // エラーメッセージの検出
      if (line.includes('●') || line.includes('✕')) {
        if (currentTest) {
          currentTest.errors.push(line.trim());
        }
      }
    }
  }

  /**
   * エラーパターンに基づく解決策を提案
   */
  suggestSolutions(test) {
    const solutions = [];
    
    for (const error of test.errors) {
      if (this.errorPatterns.typeError.test(error)) {
        solutions.push({
          type: 'Type Error',
          suggestion: '型安全性を確保するため、any型をunknown型に変更し、適切な型ガードを実装してください',
          example: `
// ❌ 悪い例
const data: any = getData();

// ✅ 良い例  
const data: unknown = getData();
if (typeof data === 'string') {
  // 型安全な処理
}`
        });
      }
      
      if (this.errorPatterns.asyncError.test(error)) {
        solutions.push({
          type: 'Async Error',
          suggestion: '非同期処理が適切に待機されていません。awaitキーワードの使用を確認してください',
          example: `
// ❌ 悪い例
it('should handle async', () => {
  service.asyncMethod(); // awaitなし
});

// ✅ 良い例
it('should handle async', async () => {
  await service.asyncMethod();
});`
        });
      }
      
      if (this.errorPatterns.mockError.test(error)) {
        solutions.push({
          type: 'Mock Error',
          suggestion: 'モックが完全に設定されていません。必要なメソッドを全て定義してください',
          example: `
// ✅ 完全なモック設定
const mockService = {
  method1: jest.fn().mockResolvedValue('result'),
  method2: jest.fn().mockRejectedValue(new Error('Error')),
  // 必要なメソッドを全て定義
};`
        });
      }
    }
    
    return solutions;
  }

  /**
   * レポートを生成
   */
  generateReport() {
    console.log('📊 テスト分析レポート\n');
    console.log('=' .repeat(50));
    
    const failedTests = this.testResults.filter(t => t.status === 'FAIL');
    const passedTests = this.testResults.filter(t => t.status === 'PASS');
    
    console.log(`✅ 成功: ${passedTests.length} テスト`);
    console.log(`❌ 失敗: ${failedTests.length} テスト\n`);
    
    if (failedTests.length > 0) {
      console.log('🔧 失敗したテストの解決策:\n');
      
      failedTests.forEach((test, index) => {
        console.log(`${index + 1}. ${test.name}`);
        console.log('   エラー:', test.errors[0] || '詳細不明');
        
        const solutions = this.suggestSolutions(test);
        if (solutions.length > 0) {
          console.log('   解決策:');
          solutions.forEach(solution => {
            console.log(`   - ${solution.type}: ${solution.suggestion}`);
          });
        }
        console.log('');
      });
    }
    
    // 全体的な推奨事項
    console.log('💡 全体的な推奨事項:');
    console.log('1. TypeScript strict mode の使用');
    console.log('2. ESLint ルールの厳格な設定');
    console.log('3. テストカバレッジの向上');
    console.log('4. エラーハンドリングの統一');
    console.log('5. 定期的なコードレビュー\n');
  }

  /**
   * 設定ファイルのチェック
   */
  checkConfiguration() {
    console.log('⚙️ 設定ファイルのチェック中...\n');
    
    const configFiles = [
      'tsconfig.json',
      'jest.config.js',
      '.eslintrc.json',
      '.prettierrc.json'
    ];
    
    configFiles.forEach(file => {
      const filePath = path.join(this.projectRoot, file);
      if (fs.existsSync(filePath)) {
        console.log(`✅ ${file} が見つかりました`);
      } else {
        console.log(`❌ ${file} が見つかりません`);
      }
    });
    
    console.log('');
  }
}

// メイン実行
async function main() {
  const debugger = new TestDebugger();
  
  console.log('🚀 テストデバッガーを開始します\n');
  
  debugger.checkConfiguration();
  await debugger.analyzeTests();
  
  console.log('✨ 分析完了！');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = TestDebugger;





