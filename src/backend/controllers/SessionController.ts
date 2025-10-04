import { Request, Response, Router } from 'express';
import { SessionService } from '../services/SessionService';
import { Logger } from '../utils/Logger';
import { authenticateToken } from '../middleware/auth';
import '../../shared/types/ExpressTypes';

export class SessionController {
  private sessionService: SessionService;
  private logger: Logger;

  constructor() {
    this.sessionService = new SessionService();
    this.logger = new Logger();
  }

  public getRouter(): Router {
    const router = Router();

    // 拡張機能からのセッション保存（認証なし）
    router.post('/extension', this.createSessionFromExtension.bind(this));

    // 認証が必要なルート
    router.use(authenticateToken);

    // セッション作成
    router.post('/', this.createSession.bind(this));
    
    // セッション取得
    router.get('/:id', this.getSession.bind(this));
    
    // セッション一覧取得
    router.get('/', this.getSessions.bind(this));
    
    // セッション更新
    router.put('/:id', this.updateSession.bind(this));
    
    // セッション削除
    router.delete('/:id', this.deleteSession.bind(this));
    
    // セッション停止
    router.post('/:id/stop', this.stopSession.bind(this));

    return router;
  }

  private async createSessionFromExtension(req: Request, res: Response): Promise<void> {
    try {
      const sessionData = req.body;
      
      // 拡張機能からのセッションデータをそのまま保存
      const session = await this.sessionService.createSessionFromExtension(sessionData);
      
      res.status(201).json({
        success: true,
        session
      });
    } catch (error) {
      this.logger.error('Failed to create session from extension:', error);
      res.status(500).json({ error: 'Failed to create session from extension' });
    }
  }

  private async createSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { name, description } = req.body;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const session = await this.sessionService.createSession({
        userId,
        name: name || 'Untitled Session',
        description: description || ''
      });
      
      res.status(201).json({
        success: true,
        session
      });
    } catch (error) {
      this.logger.error('Failed to create session:', error);
      res.status(500).json({ error: 'Failed to create session' });
    }
  }

  private async getSession(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const session = await this.sessionService.getSession(id, userId);
      
      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      
      res.json({
        success: true,
        session
      });
    } catch (error) {
      this.logger.error('Failed to get session:', error);
      res.status(500).json({ error: 'Failed to get session' });
    }
  }

  private async getSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 20, status } = req.query;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const sessions = await this.sessionService.getSessions(userId, {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        status: status as string
      });
      
      res.json({
        success: true,
        sessions: sessions.data,
        pagination: sessions.pagination
      });
    } catch (error) {
      this.logger.error('Failed to get sessions:', error);
      res.status(500).json({ error: 'Failed to get sessions' });
    }
  }

  private async updateSession(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const updateData = req.body;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const session = await this.sessionService.updateSession(id, userId, updateData);
      
      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      
      res.json({
        success: true,
        session
      });
    } catch (error) {
      this.logger.error('Failed to update session:', error);
      res.status(500).json({ error: 'Failed to update session' });
    }
  }

  private async deleteSession(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const success = await this.sessionService.deleteSession(id, userId);
      
      if (!success) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      
      res.json({ success: true });
    } catch (error) {
      this.logger.error('Failed to delete session:', error);
      res.status(500).json({ error: 'Failed to delete session' });
    }
  }

  private async stopSession(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const session = await this.sessionService.stopSession(id, userId);
      
      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      
      res.json({
        success: true,
        session
      });
    } catch (error) {
      this.logger.error('Failed to stop session:', error);
      res.status(500).json({ error: 'Failed to stop session' });
    }
  }
}
