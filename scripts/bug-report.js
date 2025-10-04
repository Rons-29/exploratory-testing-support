#!/usr/bin/env node

/**
 * 不具合報告用プロンプト実行スクリプト
 * 使用方法: npm run bug-report
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🐛 探索的テスト支援 - 不具合報告システム');
console.log('==========================================\n');

// 不具合報告用のプロンプトテンプレート
const bugReportPrompt = `
# 不具合報告のための情報収集

以下の情報を収集して、不具合の詳細を把握します：

## 1. 基本情報
- 不具合の概要
- 再現手順
- 期待される動作
- 実際の動作

## 2. 技術情報
- ブラウザ情報
- 拡張機能の状態
- コンソールエラー
- ネットワーク状況

## 3. 環境情報
- OS情報
- Node.jsバージョン
- 拡張機能バージョン

## 4. ログ収集
- 拡張機能のログ
- バックグラウンドスクリプトのログ
- コンテンツスクリプトのログ

## 5. スクリーンショット
- 不具合発生時の画面
- エラーメッセージの画面
- コンソールの画面

## 6. 修正提案
- 考えられる原因
- 修正方法の提案
- テスト方法の提案

この情報を基に、適切なGitHub Issueを作成し、修正作業を進めます。
`;

// 不具合報告の質問リスト
const questions = [
  {
    key: 'title',
    question: '📝 不具合のタイトルを入力してください:',
    required: true
  },
  {
    key: 'description',
    question: '📋 不具合の詳細を入力してください:',
    required: true
  },
  {
    key: 'steps',
    question: '🔄 再現手順を入力してください:',
    required: true
  },
  {
    key: 'expected',
    question: '✅ 期待される動作を入力してください:',
    required: true
  },
  {
    key: 'actual',
    question: '❌ 実際の動作を入力してください:',
    required: true
  },
  {
    key: 'browser',
    question: '🌐 ブラウザ情報を入力してください (例: Chrome 141.0.0.0):',
    required: false
  },
  {
    key: 'os',
    question: '💻 OS情報を入力してください (例: macOS 14.6.0):',
    required: false
  },
  {
    key: 'console_errors',
    question: '🚨 コンソールエラーがあれば入力してください:',
    required: false
  },
  {
    key: 'screenshots',
    question: '📸 スクリーンショットのパスがあれば入力してください:',
    required: false
  },
  {
    key: 'priority',
    question: '⚡ 優先度を選択してください (1: 低, 2: 中, 3: 高, 4: 緊急):',
    required: true,
    choices: ['1', '2', '3', '4']
  }
];

// 質問を順番に実行
async function collectBugReport() {
  const answers = {};
  
  for (const q of questions) {
    let answer;
    
    do {
      if (q.choices) {
        console.log(`\n${q.question}`);
        console.log(`選択肢: ${q.choices.join(', ')}`);
      } else {
        console.log(`\n${q.question}`);
      }
      
      answer = await new Promise(resolve => {
        rl.question('> ', resolve);
      });
      
      if (q.required && !answer.trim()) {
        console.log('❌ この項目は必須です。入力してください。');
      } else if (q.choices && !q.choices.includes(answer)) {
        console.log(`❌ 有効な選択肢を入力してください: ${q.choices.join(', ')}`);
        answer = null;
      }
    } while (!answer || (q.required && !answer.trim()));
    
    answers[q.key] = answer.trim();
  }
  
  return answers;
}

// GitHub Issueを作成
function createGitHubIssue(answers) {
  const priorityLabels = {
    '1': 'priority:low',
    '2': 'priority:medium', 
    '3': 'priority:high',
    '4': 'priority:critical'
  };
  
  const priorityNames = {
    '1': '低',
    '2': '中',
    '3': '高', 
    '4': '緊急'
  };
  
  const issueBody = `## 不具合の詳細
${answers.description}

## 再現手順
${answers.steps}

## 期待される動作
${answers.expected}

## 実際の動作
${answers.actual}

## 環境情報
- ブラウザ: ${answers.browser || '未入力'}
- OS: ${answers.os || '未入力'}
- 優先度: ${priorityNames[answers.priority]}

## コンソールエラー
\`\`\`
${answers.console_errors || 'なし'}
\`\`\`

## スクリーンショット
${answers.screenshots ? `- ${answers.screenshots}` : 'なし'}

## 追加情報
- 報告日時: ${new Date().toLocaleString('ja-JP')}
- 報告者: 自動生成

---
この不具合報告は自動生成されました。
`;

  const labels = ['bug', priorityLabels[answers.priority]];
  
  try {
    const command = `gh issue create --title "${answers.title}" --body "${issueBody.replace(/"/g, '\\"')}" --label "${labels.join(',')}"`;
    console.log('\n🔧 GitHub Issueを作成中...');
    console.log(`コマンド: ${command}`);
    
    const result = execSync(command, { encoding: 'utf8' });
    console.log('✅ GitHub Issueが作成されました！');
    console.log(result);
    
    return result;
  } catch (error) {
    console.error('❌ GitHub Issueの作成に失敗しました:', error.message);
    return null;
  }
}

// メイン実行
async function main() {
  try {
    console.log(bugReportPrompt);
    console.log('\n' + '='.repeat(50));
    console.log('不具合報告の情報を収集します...\n');
    
    const answers = await collectBugReport();
    
    console.log('\n📊 収集した情報:');
    console.log('================');
    Object.entries(answers).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
    
    console.log('\n🚀 GitHub Issueを作成しますか？ (y/n)');
    const confirm = await new Promise(resolve => {
      rl.question('> ', resolve);
    });
    
    if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
      const result = createGitHubIssue(answers);
      if (result) {
        console.log('\n🎉 不具合報告が完了しました！');
      }
    } else {
      console.log('\n❌ 不具合報告をキャンセルしました。');
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
  } finally {
    rl.close();
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = { collectBugReport, createGitHubIssue };
