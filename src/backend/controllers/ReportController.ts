import { Request, Response, Router } from 'express';
import { ReportService } from '../services/ReportService';
import { Logger } from '../utils/Logger';

export class ReportController {
  private router: Router;
  private reportService: ReportService;
  private logger: Logger;

  constructor() {
    this.router = Router();
    this.reportService = new ReportService();
    this.logger = new Logger();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // レポートの生成
    this.router.post('/generate', this.generateReport.bind(this));
    
    // レポートの取得
    this.router.get('/:id', this.getReport.bind(this));
    
    // レポートの一覧取得
    this.router.get('/', this.getReports.bind(this));
    
    // レポートの更新
    this.router.put('/:id', this.updateReport.bind(this));
    
    // レポートの削除
    this.router.delete('/:id', this.deleteReport.bind(this));
    
    // レポートのエクスポート
    this.router.get('/:id/export/:format', this.exportReport.bind(this));
  }

  private async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, template, options } = req.body;
      
      const report = await this.reportService.generateReport(sessionId, template, options);
      
      res.status(201).json({
        success: true,
        data: report
      });
    } catch (error) {
      this.logger.error('Failed to generate report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate report'
      });
    }
  }

  private async getReport(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const report = await this.reportService.getReport(id);
      
      if (!report) {
        res.status(404).json({
          success: false,
          error: 'Report not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      this.logger.error('Failed to get report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve report'
      });
    }
  }

  private async getReports(req: Request, res: Response): Promise<void> {
    try {
      const { userId, page = 1, limit = 20 } = req.query;
      
      const reports = await this.reportService.getReports({
        userId: userId as string,
        page: Number(page),
        limit: Number(limit)
      });
      
      res.json({
        success: true,
        data: reports,
        pagination: {
          page: Number(page),
          limit: Number(limit)
        }
      });
    } catch (error) {
      this.logger.error('Failed to get reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve reports'
      });
    }
  }

  private async updateReport(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const report = await this.reportService.updateReport(id, updateData);
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      this.logger.error('Failed to update report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update report'
      });
    }
  }

  private async deleteReport(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      await this.reportService.deleteReport(id);
      
      res.json({
        success: true,
        message: 'Report deleted successfully'
      });
    } catch (error) {
      this.logger.error('Failed to delete report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete report'
      });
    }
  }

  private async exportReport(req: Request, res: Response): Promise<void> {
    try {
      const { id, format } = req.params;
      
      const exportData = await this.reportService.exportReport(id, format);
      
      res.setHeader('Content-Type', this.getContentType(format));
      res.setHeader('Content-Disposition', `attachment; filename="report_${id}.${format}"`);
      res.send(exportData);
    } catch (error) {
      this.logger.error('Failed to export report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export report'
      });
    }
  }

  private getContentType(format: string): string {
    switch (format.toLowerCase()) {
      case 'pdf':
        return 'application/pdf';
      case 'json':
        return 'application/json';
      case 'csv':
        return 'text/csv';
      case 'html':
        return 'text/html';
      default:
        return 'application/octet-stream';
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
