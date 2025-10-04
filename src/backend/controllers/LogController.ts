import { Request, Response, Router } from 'express';
import { LogService } from '../services/LogService';
import { Logger } from '../utils/Logger';

export class LogController {
  private router: Router;
  private logService: LogService;
  private logger: Logger;

  constructor() {
    this.router = Router();
    this.logService = new LogService();
    this.logger = new Logger();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // ログの取得
    this.router.get('/:sessionId', this.getLogs.bind(this));
    
    // ログの作成
    this.router.post('/', this.createLog.bind(this));
    
    // ログの更新
    this.router.put('/:id', this.updateLog.bind(this));
    
    // ログの削除
    this.router.delete('/:id', this.deleteLog.bind(this));
    
    // ログの検索
    this.router.get('/search/:sessionId', this.searchLogs.bind(this));
  }

  private async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { page = 1, limit = 50, level } = req.query;

      const logs = await this.logService.getLogsBySession(
        sessionId,
        {
          page: Number(page),
          limit: Number(limit),
          level: level as string
        }
      );

      res.json({
        success: true,
        data: logs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: logs.length
        }
      });
    } catch (error) {
      this.logger.error('Failed to get logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve logs'
      });
    }
  }

  private async createLog(req: Request, res: Response): Promise<void> {
    try {
      const logData = req.body;
      
      const log = await this.logService.createLog(logData);
      
      res.status(201).json({
        success: true,
        data: log
      });
    } catch (error) {
      this.logger.error('Failed to create log:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create log'
      });
    }
  }

  private async updateLog(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const log = await this.logService.updateLog(id, updateData);
      
      res.json({
        success: true,
        data: log
      });
    } catch (error) {
      this.logger.error('Failed to update log:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update log'
      });
    }
  }

  private async deleteLog(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      await this.logService.deleteLog(id);
      
      res.json({
        success: true,
        message: 'Log deleted successfully'
      });
    } catch (error) {
      this.logger.error('Failed to delete log:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete log'
      });
    }
  }

  private async searchLogs(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { query, level, startDate, endDate } = req.query;
      
      const logs = await this.logService.searchLogs(sessionId, {
        query: query as string,
        level: level as string,
        startDate: startDate as string,
        endDate: endDate as string
      });
      
      res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      this.logger.error('Failed to search logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search logs'
      });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
