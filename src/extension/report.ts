interface LogEntry {
  id: string;
  type: string;
  message: string;
  timestamp: number;
  details?: any;
  element?: string;
  url?: string;
  level?: string;
}

interface ReportData {
  sessionId: string;
  startTime: string;
  endTime: string;
  duration: number;
  stats: {
    total: number;
    click: number;
    key: number;
    console: number;
    network: number;
    networkError: number;
    error: number;
    screenshot: number;
    flag: number;
  };
  report: string;
}

class ReportViewer {
  private reportData: ReportData | null = null;

  constructor() {
    this.initializeEventListeners();
    this.loadReport();
  }

  private initializeEventListeners(): void {
    // レポート再生成
    const generateBtn = document.getElementById('generateReport');
    generateBtn?.addEventListener('click', () => {
      this.generateReport();
    });

    // クリップボードにコピー
    const copyBtn = document.getElementById('copyReport');
    copyBtn?.addEventListener('click', () => {
      this.copyToClipboard();
    });

    // ファイルとしてダウンロード
    const downloadBtn = document.getElementById('downloadReport');
    downloadBtn?.addEventListener('click', () => {
      this.downloadReport();
    });

    // レポートをクリア
    const clearBtn = document.getElementById('clearReport');
    clearBtn?.addEventListener('click', () => {
      this.clearReport();
    });
  }

  private async loadReport(): Promise<void> {
    try {
      console.log('Report: Sending EXPORT_REPORT message to background script...');
      // バックグラウンドスクリプトからレポートを取得
      const response = await chrome.runtime.sendMessage({ type: 'EXPORT_REPORT' });
      console.log('Report: Received response from background script:', response);
      
      if (response && response.success) {
        const logs = response.logs || [];
        console.log('Raw logs from background:', logs);
        console.log('Logs length:', logs.length);
        const stats = this.calculateStats(logs);
        console.log('Calculated stats:', stats);
        
        this.reportData = {
          sessionId: 'N/A',
          startTime: 'N/A',
          endTime: 'N/A',
          duration: 0,
          stats: stats,
          report: response.report || 'レポートが生成されませんでした'
        };
        
        console.log('Report data loaded:', this.reportData);
        this.displayReport();
        this.updateStats();
      } else {
        console.error('Report: Failed to get report from background script:', response);
        this.showError('レポートの取得に失敗しました: ' + (response?.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to load report:', error);
      this.showError('レポートの読み込みに失敗しました: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  private async generateReport(): Promise<void> {
    try {
      const reportContent = document.getElementById('reportContent');
      if (reportContent) {
        reportContent.innerHTML = `
          <div class="loading">
            <h3>レポートを再生成中...</h3>
            <p>しばらくお待ちください</p>
          </div>
        `;
      }

      await this.loadReport();
    } catch (error) {
      console.error('Failed to generate report:', error);
      this.showError('レポートの再生成に失敗しました');
    }
  }

  private displayReport(): void {
    const reportContent = document.getElementById('reportContent');
    if (!reportContent || !this.reportData) return;

    reportContent.innerHTML = this.reportData.report;
  }

  private updateStats(): void {
    if (!this.reportData) {
      console.log('Report data is null, cannot update stats');
      return;
    }

    const stats = this.reportData.stats;
    console.log('Updating stats with data:', stats);
    
    this.updateStatElement('totalEvents', stats.total);
    this.updateStatElement('clickEvents', stats.click);
    this.updateStatElement('keyEvents', stats.key);
    this.updateStatElement('consoleEvents', stats.console);
    this.updateStatElement('networkEvents', stats.network);
    this.updateStatElement('networkErrorEvents', stats.networkError);
    this.updateStatElement('errorEvents', stats.error);
    this.updateStatElement('screenshotEvents', stats.screenshot);
    this.updateStatElement('flagEvents', stats.flag);

    // 統計サマリーを表示
    const statsSummary = document.getElementById('statsSummary');
    if (statsSummary) {
      statsSummary.style.display = 'grid';
    }
  }

  private updateStatElement(id: string, value: number): void {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value.toString();
    }
  }

  private calculateStats(logs: LogEntry[]): any {
    return {
      total: logs.length,
      click: logs.filter(log => log.type === 'click').length,
      key: logs.filter(log => log.type === 'keydown').length,
      console: logs.filter(log => log.type === 'console').length,
      network: logs.filter(log => log.type === 'network').length,
      networkError: logs.filter(log => log.type === 'network_error').length,
      error: logs.filter(log => log.type === 'error' || (log.type === 'console' && log.details?.level === 'error')).length,
      screenshot: logs.filter(log => log.type === 'screenshot').length,
      flag: logs.filter(log => log.type === 'flag').length
    };
  }

  private async copyToClipboard(): Promise<void> {
    if (!this.reportData) {
      this.showError('コピーするレポートがありません');
      return;
    }

    try {
      await navigator.clipboard.writeText(this.reportData.report);
      this.showCopySuccess();
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      this.showError('クリップボードへのコピーに失敗しました');
    }
  }

  private downloadReport(): void {
    if (!this.reportData) {
      this.showError('ダウンロードするレポートがありません');
      return;
    }

    try {
      const blob = new Blob([this.reportData.report], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exploratory-test-report-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download report:', error);
      this.showError('レポートのダウンロードに失敗しました');
    }
  }

  private clearReport(): void {
    if (confirm('レポートをクリアしますか？')) {
      const reportContent = document.getElementById('reportContent');
      if (reportContent) {
        reportContent.innerHTML = `
          <div class="loading">
            <h3>レポートがクリアされました</h3>
            <p>「レポート再生成」ボタンをクリックして新しいレポートを生成してください</p>
          </div>
        `;
      }

      const statsSummary = document.getElementById('statsSummary');
      if (statsSummary) {
        statsSummary.style.display = 'none';
      }

      this.reportData = null;
    }
  }

  private showCopySuccess(): void {
    const copySuccess = document.getElementById('copySuccess');
    if (copySuccess) {
      copySuccess.classList.add('show');
      setTimeout(() => {
        copySuccess.classList.remove('show');
      }, 3000);
    }
  }

  private showError(message: string): void {
    const reportContent = document.getElementById('reportContent');
    if (reportContent) {
      reportContent.innerHTML = `
        <div class="error">
          <h3>エラーが発生しました</h3>
          <p>${message}</p>
        </div>
      `;
    }
  }
}

// レポートビューアを初期化
const reportViewer = new ReportViewer();
