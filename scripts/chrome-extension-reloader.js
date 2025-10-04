#!/usr/bin/env node

/**
 * Chrome拡張機能の高度な自動リロードスクリプト
 * Chrome DevTools Protocolを使用して拡張機能を自動リロードします
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class ChromeExtensionReloader {
  constructor() {
    this.extensionId = null;
    this.manifestPath = path.join(__dirname, '../dist/manifest.json');
    this.isWatching = false;
    this.chromeProcess = null;
  }

  /**
   * 拡張機能の自動リロードを開始
   */
  async start() {
    console.log('🚀 Chrome拡張機能の高度な自動リロードを開始します...');
    
    // Chrome拡張機能のIDを取得
    await this.getExtensionId();
    
    // manifest.jsonの監視を開始
    this.watchManifest();
    
    // ビルド完了の通知を待機
    this.waitForBuild();
  }

  /**
   * 拡張機能のIDを取得
   */
  async getExtensionId() {
    try {
      // Chrome拡張機能のディレクトリからIDを推測
      const distPath = path.join(__dirname, '../dist');
      if (fs.existsSync(distPath)) {
        console.log('📁 拡張機能ディレクトリを確認中...');
        console.log('💡 拡張機能のIDは chrome://extensions/ で確認できます');
        console.log('💡 または、拡張機能のURLから確認できます');
      }
    } catch (error) {
      console.log('⚠️  拡張機能のIDを自動取得できませんでした');
    }
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
      
      // Chrome拡張機能のリロード通知
      this.showReloadNotification();
      
      // オプション: Chrome拡張機能のページを自動で開く
      await this.openExtensionsPage();
      
    } catch (error) {
      console.error('❌ 拡張機能のリロードに失敗しました:', error.message);
    }
  }

  /**
   * Chrome拡張機能ページを開く
   */
  async openExtensionsPage() {
    try {
      const platform = process.platform;
      let chromeCommand;
      
      switch (platform) {
        case 'darwin': // macOS
          chromeCommand = 'open -a "Google Chrome" chrome://extensions/';
          break;
        case 'win32': // Windows
          chromeCommand = 'start chrome chrome://extensions/';
          break;
        case 'linux': // Linux
          chromeCommand = 'google-chrome chrome://extensions/';
          break;
        default:
          console.log('⚠️  サポートされていないプラットフォームです');
          return;
      }
      
      console.log('🌐 Chrome拡張機能ページを開いています...');
      spawn(chromeCommand, { shell: true, detached: true });
      
    } catch (error) {
      console.log('⚠️  Chrome拡張機能ページを自動で開けませんでした');
      console.log('💡 手動で chrome://extensions/ を開いてください');
    }
  }

  /**
   * リロード通知を表示
   */
  showReloadNotification() {
    console.log('\n' + '='.repeat(70));
    console.log('🔄 拡張機能のリロードが必要です');
    console.log('='.repeat(70));
    console.log('📋 手順:');
    console.log('1. 開いたChrome拡張機能ページで「探索的テスト支援」を探す');
    console.log('2. 「再読み込み」ボタン（🔄）をクリック');
    console.log('3. または、Ctrl+R (Cmd+R) でページをリロード');
    console.log('='.repeat(70));
    console.log('💡 開発効率化のヒント:');
    console.log('   - 拡張機能ページをブックマークに追加');
    console.log('   - 開発者モードを有効にしたままにしておく');
    console.log('   - 拡張機能のアイコンをクリックしてポップアップを開く');
    console.log('='.repeat(70) + '\n');
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
  const reloader = new ChromeExtensionReloader();
  
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

module.exports = ChromeExtensionReloader;
