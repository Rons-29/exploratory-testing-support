class ReportGenerator {
  private sessionData: any = null;
  private logs: any[] = [];

  constructor() {
    this.initializeEventListeners();
    this.loadData();
  }

  private initializeEventListeners(): void {
    // レポート生成ボタン
    const generateButton = document.getElementById('generateReport');
    generateButton?.addEventListener('click', () => this.generateReport());

    // エクスポートボタン
    const exportButton = document.getElementById('exportReport');
    exportButton?.addEventListener('click', () => this.exportReport());

    // コピーボタン
    const copyButton = document.getElementById('copyReport');
    copyButton?.addEventListener('click', () => this.copyReport());
  }

  private async loadData(): Promise<void> {
    try {
      // セッションデータを読み込み
      const sessionResult = await chrome.storage.local.get('current_session');
      this.sessionData = sessionResult.current_session;

      // ログデータを読み込み
      const logsResult = await chrome.storage.local.get('test_logs');
      this.logs = logsResult.test_logs || [];

      this.updateStats();
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  private updateStats(): void {
    const stats = this.calculateStats();
    
    // 統計情報を表示
    const statsContainer = document.getElementById('statsContainer');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="stat-item">
          <span class="stat-label">総イベント数:</span>
          <span class="stat-value">${stats.totalEvents}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">クリック数:</span>
          <span class="stat-value">${stats.clickCount}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">キー入力数:</span>
          <span class="stat-value">${stats.keydownCount}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">エラー数:</span>
          <span class="stat-value">${stats.errorCount}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">ネットワークエラー数:</span>
          <span class="stat-value">${stats.networkErrorCount}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">スクリーンショット数:</span>
          <span class="stat-value">${stats.screenshotCount}</span>
        </div>
      `;
    }
  }

  private calculateStats(): any {
    const stats = {
      totalEvents: this.logs.length,
      clickCount: 0,
      keydownCount: 0,
      errorCount: 0,
      networkErrorCount: 0,
      screenshotCount: 0
    };

    this.logs.forEach(log => {
      switch (log.type) {
        case 'click':
          stats.clickCount++;
          break;
        case 'keydown':
          stats.keydownCount++;
          break;
        case 'error':
          stats.errorCount++;
          break;
        case 'network_error':
          stats.networkErrorCount++;
          break;
        case 'screenshot':
          stats.screenshotCount++;
          break;
      }
    });

    return stats;
  }

  private generateReport(): void {
    const report = this.createMarkdownReport();
    const reportContainer = document.getElementById('reportContainer');
    
    if (reportContainer) {
      reportContainer.innerHTML = `<pre>${report}</pre>`;
    }
  }

  private createMarkdownReport(): string {
    const stats = this.calculateStats();
    const sessionInfo = this.sessionData ? {
      id: this.sessionData.id,
      status: this.sessionData.status,
      startTime: new Date(this.sessionData.startTime).toLocaleString(),
      endTime: this.sessionData.endTime ? new Date(this.sessionData.endTime).toLocaleString() : '進行中'
    } : null;

    let report = '# 探索的テストレポート\n\n';
    
    if (sessionInfo) {
      report += `## セッション情報\n`;
      report += `- **セッションID**: ${sessionInfo.id}\n`;
      report += `- **ステータス**: ${sessionInfo.status}\n`;
      report += `- **開始時刻**: ${sessionInfo.startTime}\n`;
      report += `- **終了時刻**: ${sessionInfo.endTime}\n\n`;
    }

    report += `## 統計情報\n`;
    report += `- **総イベント数**: ${stats.totalEvents}\n`;
    report += `- **クリック数**: ${stats.clickCount}\n`;
    report += `- **キー入力数**: ${stats.keydownCount}\n`;
    report += `- **エラー数**: ${stats.errorCount}\n`;
    report += `- **ネットワークエラー数**: ${stats.networkErrorCount}\n`;
    report += `- **スクリーンショット数**: ${stats.screenshotCount}\n\n`;

    report += `## イベント詳細\n\n`;
    
    if (this.logs.length === 0) {
      report += 'イベントが記録されていません。\n';
    } else {
      this.logs.forEach((log, index) => {
        const timestamp = new Date(log.timestamp).toLocaleString();
        report += `### ${index + 1}. ${log.type} (${timestamp})\n`;
        report += `- **メッセージ**: ${log.message}\n`;
        report += `- **URL**: ${log.url}\n`;
        if (log.details) {
          report += `- **詳細**: \`${JSON.stringify(log.details)}\`\n`;
        }
        report += '\n';
      });
    }

    return report;
  }

  private exportReport(): void {
    const report = this.createMarkdownReport();
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `test_report_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  private async copyReport(): Promise<void> {
    const report = this.createMarkdownReport();
    
    try {
      await navigator.clipboard.writeText(report);
      alert('レポートをクリップボードにコピーしました');
    } catch (error) {
      console.error('Failed to copy report:', error);
      alert('コピーに失敗しました');
    }
  }
}

// レポートジェネレーターを初期化
document.addEventListener('DOMContentLoaded', () => {
  new ReportGenerator();
});