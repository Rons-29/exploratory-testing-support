#!/usr/bin/env node

/**
 * Chrome拡張機能の自動リロードスクリプト
 * ビルド完了後にChrome拡張機能を自動的にリロードします
 */

const fs = require('fs');
const path = require('path');

class ExtensionReloader {
  constructor() {
    this.extensionId = null;
    this.manifestPath = path.join(__dirname, '../dist/manifest.json');
    this.isWatching = false;
  }

  /**
   * 拡張機能の自動リロードを開始
   */
  start() {
    console.log('🔄 Chrome拡張機能の自動リロードを開始します...');
    
    // manifest.jsonの監視を開始
    this.watchManifest();
    
    // ビルド完了の通知を待機
    this.waitForBuild();
  }

  /**
   * manifest.jsonの変更を監視
   */
  watchManifest() {
    if (!fs.existsSync(this.manifestPath)) {
      console.log('⚠️  manifest.jsonが見つかりません。ビルドを待機中...');
      return;
    }

    console.log('👀 manifest.jsonの変更を監視中...');
    
    fs.watchFile(this.manifestPath, (curr, prev) => {
      if (curr.mtime > prev.mtime) {
        console.log('📦 ビルドが完了しました');
        this.reloadExtension();
      }
    });
  }

  /**
   * ビルド完了を待機
   */
  waitForBuild() {
    const checkInterval = setInterval(() => {
      if (fs.existsSync(this.manifestPath)) {
        clearInterval(checkInterval);
        this.watchManifest();
      }
    }, 1000);
  }

  /**
   * 拡張機能をリロード
   */
  async reloadExtension() {
    try {
      console.log('🔄 拡張機能をリロード中...');
      
      // Chrome拡張機能のリロードは手動で行う必要があります
      // このスクリプトでは通知のみを行います
      this.showReloadNotification();
      
    } catch (error) {
      console.error('❌ 拡張機能のリロードに失敗しました:', error.message);
    }
  }

  /**
   * リロード通知を表示
   */
  showReloadNotification() {
    console.log('\n' + '='.repeat(60));
    console.log('🔄 拡張機能のリロードが必要です');
    console.log('='.repeat(60));
    console.log('📋 手順:');
    console.log('1. Chromeで chrome://extensions/ を開く');
    console.log('2. 探索的テスト支援拡張機能の「再読み込み」ボタンをクリック');
    console.log('3. または、Ctrl+R (Cmd+R) でページをリロード');
    console.log('='.repeat(60));
    console.log('💡 ヒント: 開発中は拡張機能のページを開いたままにしておくと便利です');
    console.log('='.repeat(60) + '\n');
  }

  /**
   * 監視を停止
   */
  stop() {
    if (fs.existsSync(this.manifestPath)) {
      fs.unwatchFile(this.manifestPath);
    }
    this.isWatching = false;
    console.log('🛑 拡張機能の自動リロードを停止しました');
  }
}

// スクリプトの実行
if (require.main === module) {
  const reloader = new ExtensionReloader();
  
  // プロセス終了時のクリーンアップ
  process.on('SIGINT', () => {
    console.log('\n🛑 プロセスを終了します...');
    reloader.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 プロセスを終了します...');
    reloader.stop();
    process.exit(0);
  });

  // 自動リロードを開始
  reloader.start();
}

module.exports = ExtensionReloader;
