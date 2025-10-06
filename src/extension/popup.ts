import { PopupController } from './ui/PopupController';

// ポップアップの初期化
const popupController = new PopupController();

// DOM読み込み完了後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    popupController.initialize();
  });
} else {
  popupController.initialize();
}

// ページアンロード時にクリーンアップ
window.addEventListener('beforeunload', () => {
  popupController.destroy();
});