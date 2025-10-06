import { SessionManager } from './SessionManager';

export interface Screenshot {
  id: string;
  timestamp: string;
  dataUrl: string;
  url: string;
  type: 'manual' | 'error' | 'milestone';
  note?: string;
}

export class ScreenshotCapture {
  private sessionManager: SessionManager;

  constructor() {
    this.sessionManager = new SessionManager();
  }

  /**
   * 手動でスクリーンショットを撮影
   */
  public async captureManual(note?: string): Promise<Screenshot> {
    try {
      const screenshot = await this.captureScreenshot('manual', note);
      await this.saveScreenshot(screenshot);
      return screenshot;
    } catch (error) {
      console.error('Failed to capture manual screenshot:', error);
      throw error;
    }
  }

  /**
   * エラー発生時に自動でスクリーンショットを撮影
   */
  public async captureOnError(error: Error): Promise<Screenshot> {
    try {
      const screenshot = await this.captureScreenshot('error', `Error: ${error.message}`);
      await this.saveScreenshot(screenshot);
      return screenshot;
    } catch (err) {
      console.error('Failed to capture error screenshot:', err);
      throw err;
    }
  }

  /**
   * マイルストーン時にスクリーンショットを撮影
   */
  public async captureMilestone(milestone: string): Promise<Screenshot> {
    try {
      const screenshot = await this.captureScreenshot('milestone', milestone);
      await this.saveScreenshot(screenshot);
      return screenshot;
    } catch (error) {
      console.error('Failed to capture milestone screenshot:', error);
      throw error;
    }
  }

  /**
   * スクリーンショットを撮影
   */
  private async captureScreenshot(type: Screenshot['type'], note?: string): Promise<Screenshot> {
    return new Promise((resolve, reject) => {
      try {
        // 現在のタブのスクリーンショットを取得
        chrome.tabs.captureVisibleTab(undefined as any, { format: 'png' }, (dataUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          const screenshot: Screenshot = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            dataUrl,
            url: window.location.href,
            type,
            note
          };

          resolve(screenshot);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * スクリーンショットをセッションに保存
   */
  private async saveScreenshot(screenshot: Screenshot): Promise<void> {
    try {
      await this.sessionManager.addEvent({
        type: 'screenshot',
        timestamp: screenshot.timestamp,
        data: screenshot
      });
    } catch (error) {
      console.error('Failed to save screenshot:', error);
      throw error;
    }
  }

  /**
   * スクリーンショットをダウンロード
   */
  public async downloadScreenshot(screenshot: Screenshot): Promise<void> {
    try {
      const link = document.createElement('a');
      link.download = `screenshot_${screenshot.id}.png`;
      link.href = screenshot.dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to download screenshot:', error);
      throw error;
    }
  }

  /**
   * スクリーンショットの一覧を取得
   */
  public async getScreenshots(): Promise<Screenshot[]> {
    try {
      const session = await this.sessionManager.getCurrentSession();
      if (!session) return [];

      return session.events
        .filter(event => event.type === 'screenshot')
        .map(event => event.data as Screenshot)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Failed to get screenshots:', error);
      return [];
    }
  }

  private generateId(): string {
    return `screenshot_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
}
