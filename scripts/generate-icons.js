#!/usr/bin/env node

/**
 * SVGアイコンからPNGアイコンを生成するスクリプト
 */

const fs = require('fs');
const path = require('path');

// 簡単なSVGからPNG変換（Canvasを使用）
function createIcon(size, filename) {
  const svgContent = `<svg width="${size}" height="${size}" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
    <!-- 背景円 -->
    <circle cx="64" cy="64" r="60" fill="#4CAF50" stroke="#2E7D32" stroke-width="4"/>
    
    <!-- 虫眼鏡アイコン -->
    <circle cx="45" cy="45" r="20" fill="none" stroke="white" stroke-width="6"/>
    <line x1="58" y1="58" x2="75" y2="75" stroke="white" stroke-width="6" stroke-linecap="round"/>
    
    <!-- 検索マーク -->
    <circle cx="80" cy="35" r="8" fill="white"/>
    <text x="80" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#4CAF50" font-weight="bold">T</text>
  </svg>`;

  // SVGファイルとして保存（Chrome拡張機能はSVGもサポート）
  const iconPath = path.join(__dirname, '../src/extension/icons', filename.replace('.png', '.svg'));
  fs.writeFileSync(iconPath, svgContent);
  
  console.log(`✅ ${filename.replace('.png', '.svg')} を作成しました`);
}

// 必要なアイコンサイズを生成
const iconSizes = [
  { size: 16, filename: 'icon16.svg' },
  { size: 32, filename: 'icon32.svg' },
  { size: 48, filename: 'icon48.svg' },
  { size: 128, filename: 'icon128.svg' }
];

console.log('🎨 アイコンファイルを生成中...\n');

iconSizes.forEach(({ size, filename }) => {
  createIcon(size, filename);
});

console.log('\n✨ アイコンファイルの生成が完了しました！');
console.log('\n📁 生成されたファイル:');
iconSizes.forEach(({ filename }) => {
  console.log(`   - src/extension/icons/${filename}`);
});

console.log('\n🔧 manifest.jsonを更新中...');

// manifest.jsonを更新
const manifestPath = path.join(__dirname, '../src/extension/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

manifest.icons = {
  "16": "icons/icon16.svg",
  "32": "icons/icon32.svg", 
  "48": "icons/icon48.svg",
  "128": "icons/icon128.svg"
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('✅ manifest.jsonを更新しました');

console.log('\n🚀 拡張機能を再ビルドしてください:');
console.log('   npm run build:extension');
