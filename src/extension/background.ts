import { BackgroundService } from './services/BackgroundService';

// Background Serviceのインスタンスを作成
const backgroundService = new BackgroundService();

// メッセージリスナーを設定
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  return backgroundService.handleMessage(message, sender, sendResponse);
});

// タブ更新リスナーを設定
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  backgroundService.handleTabUpdate(tabId, changeInfo, tab);
});

// 拡張機能のインストール/更新時の処理
chrome.runtime.onInstalled.addListener((details) => {
  console.log('探索的テスト支援: Extension installed/updated', details);
});

// 拡張機能の起動時の処理
chrome.runtime.onStartup.addListener(() => {
  console.log('探索的テスト支援: Extension started');
});