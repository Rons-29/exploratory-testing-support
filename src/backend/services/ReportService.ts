import { DatabaseManager } from '../database/DatabaseManager';
import { Logger } from '../utils/Logger';

export interface ReportData {
  id: string;
  sessionId: string;
  userId: string;
  title: string;
  content: string;
  format: 'html' | 'markdown' | 'json';
  status: 'draft' | 'generated' | 'published';
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
}

export interface ReportOptions {
  includeScreenshots?: boolean;
  includeEvents?: boolean;
  includeLogs?: boolean;
  format?: 'html' | 'markdown' | 'json';
  customFields?: Record<string, unknown>;
}

export interface ReportPaginationOptions {
  userId?: string;
  page: number;
  limit: number;
}

export class ReportService {
  private databaseManager: DatabaseManager;
  private logger: Logger;

  constructor() {
    this.databaseManager = new DatabaseManager();
    this.logger = new Logger();
  }

  public async generateReport(sessionId: string, template: string, options: ReportOptions = {}): Promise<ReportData> {
    try {
      // セッション情報を取得
      const sessionQuery = 'SELECT * FROM sessions WHERE id = $1';
      const sessionResult = await this.databaseManager.query(sessionQuery, [sessionId]);
      
      if (sessionResult.rows.length === 0) {
        throw new Error('Session not found');
      }
      
      const session = sessionResult.rows[0];
      
      // レポートコンテンツを生成
      const content = await this.generateReportContent(session, template, options);
      
      // レポートを保存
      const reportId = this.generateId();
      const insertQuery = `
        INSERT INTO reports (id, session_id, user_id, title, content, format, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `;
      
      const title = `Test Report - ${session.name}`;
      const format = options.format || 'html';
      
      const params = [reportId, sessionId, session.user_id, title, content, format, 'generated'];
      const result = await this.databaseManager.query(insertQuery, params);
      
      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to generate report:', error);
      throw error;
    }
  }

  public async getReport(id: string): Promise<ReportData | null> {
    try {
      const query = 'SELECT * FROM reports WHERE id = $1';
      const result = await this.databaseManager.query(query, [id]);
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      this.logger.error('Failed to get report:', error);
      throw error;
    }
  }

  public async getReports(options: ReportPaginationOptions): Promise<ReportData[]> {
    try {
      const { userId, page, limit } = options;
      const offset = (page - 1) * limit;
      
      let query = 'SELECT * FROM reports';
      const params: unknown[] = [];
      let paramIndex = 1;
      
      if (userId) {
        query += ` WHERE user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);
      
      const result = await this.databaseManager.query(query, params);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get reports:', error);
      throw error;
    }
  }

  public async updateReport(id: string, updateData: Partial<ReportData>): Promise<ReportData> {
    try {
      const fields = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (updateData.title !== undefined) {
        fields.push(`title = $${paramIndex++}`);
        params.push(updateData.title);
      }
      
      if (updateData.content !== undefined) {
        fields.push(`content = $${paramIndex++}`);
        params.push(updateData.content);
      }
      
      if (updateData.status !== undefined) {
        fields.push(`status = $${paramIndex++}`);
        params.push(updateData.status);
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      fields.push(`updated_at = NOW()`);
      params.push(id);

      const query = `
        UPDATE reports 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await this.databaseManager.query(query, params);
      
      if (result.rows.length === 0) {
        throw new Error('Report not found');
      }
      
      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to update report:', error);
      throw error;
    }
  }

  public async deleteReport(id: string): Promise<void> {
    try {
      const query = 'DELETE FROM reports WHERE id = $1';
      const result = await this.databaseManager.query(query, [id]);
      
      if (result.rowCount === 0) {
        throw new Error('Report not found');
      }
    } catch (error) {
      this.logger.error('Failed to delete report:', error);
      throw error;
    }
  }

  public async exportReport(id: string, format: string): Promise<string> {
    try {
      const report = await this.getReport(id);
      
      if (!report) {
        throw new Error('Report not found');
      }
      
      switch (format.toLowerCase()) {
        case 'json':
          return JSON.stringify(report, null, 2);
        case 'html':
          return this.generateHtmlReport(report);
        case 'csv':
          return this.generateCsvReport(report);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      this.logger.error('Failed to export report:', error);
      throw error;
    }
  }

  private async generateReportContent(session: any, template: string, options: ReportOptions): Promise<string> {
    // 基本的なレポートテンプレート
    const basicTemplate = `
# Test Report: ${session.name}

## Session Information
- **Session ID**: ${session.id}
- **Start Time**: ${session.start_time}
- **End Time**: ${session.end_time || 'Still Active'}
- **Status**: ${session.status}

## Summary
This report contains the results of exploratory testing session.

## Events
${options.includeEvents ? 'Events will be included here' : 'Events not included'}

## Screenshots
${options.includeScreenshots ? 'Screenshots will be included here' : 'Screenshots not included'}

## Logs
${options.includeLogs ? 'Logs will be included here' : 'Logs not included'}
    `;
    
    return basicTemplate.trim();
  }

  private generateHtmlReport(report: ReportData): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${report.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; }
        h2 { color: #666; }
        .metadata { background: #f5f5f5; padding: 20px; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>${report.title}</h1>
    <div class="metadata">
        <p><strong>Report ID:</strong> ${report.id}</p>
        <p><strong>Generated:</strong> ${report.createdAt}</p>
        <p><strong>Status:</strong> ${report.status}</p>
    </div>
    <div class="content">
        ${report.content.replace(/\n/g, '<br>')}
    </div>
</body>
</html>
    `;
  }

  private generateCsvReport(report: ReportData): string {
    return `Report ID,Title,Status,Created At,Updated At
${report.id},"${report.title}",${report.status},${report.createdAt},${report.updatedAt}`;
  }

  private generateId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
