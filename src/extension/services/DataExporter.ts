import { SessionManager } from './SessionManager';
import { SessionData, SessionStatus } from '../../shared/types/SessionTypes';

export interface ExportOptions {
  includeScreenshots?: boolean;
  includeLogs?: boolean;
  includeEvents?: boolean;
  format?: 'json' | 'csv' | 'markdown';
}

export class DataExporter {
  private sessionManager: SessionManager;

  constructor() {
    this.sessionManager = new SessionManager();
  }

  /**
   * セッションをJSON形式でエクスポート
   */
  public async exportAsJSON(sessionId: string, options: ExportOptions = {}): Promise<void> {
    try {
      const session = await this.sessionManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const exportData = this.prepareExportData(session, options);
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // ファイルをダウンロード
      this.downloadFile(jsonString, `session_${sessionId}.json`, 'application/json');
    } catch (error) {
      console.error('Failed to export session as JSON:', error);
      throw error;
    }
  }

  /**
   * 現在のセッションをJSON形式でエクスポート
   */
  public async exportCurrentSession(options: ExportOptions = {}): Promise<void> {
    try {
      const session = await this.sessionManager.getCurrentSession();
      if (!session) {
        throw new Error('No active session found');
      }

      await this.exportAsJSON(session.id, options);
    } catch (error) {
      console.error('Failed to export current session:', error);
      throw error;
    }
  }

  /**
   * セッションをCSV形式でエクスポート
   */
  public async exportAsCSV(sessionId: string, options: ExportOptions = {}): Promise<void> {
    try {
      const session = await this.sessionManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const csvString = this.convertToCSV(session, options);
      this.downloadFile(csvString, `session_${sessionId}.csv`, 'text/csv');
    } catch (error) {
      console.error('Failed to export session as CSV:', error);
      throw error;
    }
  }

  /**
   * セッションをMarkdown形式でエクスポート
   */
  public async exportAsMarkdown(sessionId: string, options: ExportOptions = {}): Promise<void> {
    try {
      const session = await this.sessionManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const markdownString = this.convertToMarkdown(session, options);
      this.downloadFile(markdownString, `session_${sessionId}.md`, 'text/markdown');
    } catch (error) {
      console.error('Failed to export session as Markdown:', error);
      throw error;
    }
  }

  /**
   * Webアプリにデータを送信
   */
  public async sendToWebApp(sessionData: SessionData): Promise<boolean> {
    try {
      // Webアプリのエンドポイントに送信
      const response = await fetch('https://your-webapp.com/api/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to send data to Web app:', error);
      return false;
    }
  }

  /**
   * 現在のセッションをWebアプリに送信
   */
  public async sendCurrentSessionToWebApp(): Promise<boolean> {
    try {
      const session = await this.sessionManager.getCurrentSession();
      if (!session) {
        throw new Error('No active session found');
      }

      return await this.sendToWebApp(session);
    } catch (error) {
      console.error('Failed to send current session to Web app:', error);
      return false;
    }
  }

  /**
   * エクスポート用のデータを準備
   */
  private prepareExportData(session: SessionData, options: ExportOptions): any {
    const baseData = {
      id: session.id,
      status: session.status,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration,
      url: session.url,
      title: session.title,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    };

    if (options.includeEvents !== false) {
      baseData.events = session.events;
    }

    if (options.includeLogs !== false) {
      baseData.logs = session.logs;
    }

    if (options.includeScreenshots !== false) {
      baseData.screenshots = session.events
        .filter(event => event.type === 'screenshot')
        .map(event => event.data);
    }

    return baseData;
  }

  /**
   * セッションをCSV形式に変換
   */
  private convertToCSV(session: SessionData, options: ExportOptions): string {
    const headers = ['Timestamp', 'Type', 'Message', 'URL'];
    const rows = [headers.join(',')];

    if (options.includeEvents !== false) {
      session.events.forEach(event => {
        const row = [
          event.timestamp,
          event.type,
          JSON.stringify(event.data).replace(/"/g, '""'),
          session.url
        ];
        rows.push(row.map(cell => `"${cell}"`).join(','));
      });
    }

    return rows.join('\n');
  }

  /**
   * セッションをMarkdown形式に変換
   */
  private convertToMarkdown(session: SessionData, options: ExportOptions): string {
    let markdown = `# Session Report: ${session.id}\n\n`;
    markdown += `**Status:** ${session.status}\n`;
    markdown += `**Start Time:** ${session.startTime}\n`;
    markdown += `**End Time:** ${session.endTime}\n`;
    markdown += `**Duration:** ${session.duration}ms\n`;
    markdown += `**URL:** ${session.url}\n\n`;

    if (options.includeEvents !== false) {
      markdown += `## Events (${session.events.length})\n\n`;
      session.events.forEach(event => {
        markdown += `### ${event.type}\n`;
        markdown += `**Time:** ${event.timestamp}\n`;
        markdown += `**Data:** \`${JSON.stringify(event.data)}\`\n\n`;
      });
    }

    if (options.includeLogs !== false && session.logs) {
      markdown += `## Logs (${session.logs.length})\n\n`;
      session.logs.forEach(log => {
        markdown += `**${log.level}:** ${log.message}\n`;
        markdown += `**Time:** ${log.timestamp}\n\n`;
      });
    }

    return markdown;
  }

  /**
   * ファイルをダウンロード
   */
  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    
    URL.revokeObjectURL(url);
  }
}
