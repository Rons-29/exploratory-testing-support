import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { DatabaseManager } from './database/DatabaseManager';
import { AuthController } from './controllers/AuthController';
import { SessionController } from './controllers/SessionController';
import { LogController } from './controllers/LogController';
import { ReportController } from './controllers/ReportController';
import { Logger } from './utils/Logger';
import '../shared/types/ExpressTypes';

// 環境変数の読み込み
dotenv.config();

class BackendServer {
  private app: express.Application;
  private port: number;
  private databaseManager: DatabaseManager;
  private logger: Logger;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3001', 10);
    this.databaseManager = new DatabaseManager();
    this.logger = new Logger();
  }

  public async initialize(): Promise<void> {
    try {
      // データベース接続（オプショナル）
      try {
        await this.databaseManager.connect();
        this.logger.info('Database connected successfully');
      } catch (dbError) {
        this.logger.warn('Database connection failed, continuing without database:', dbError);
      }

      // ミドルウェアの設定
      this.setupMiddleware();

      // ルートの設定
      this.setupRoutes();

      // エラーハンドリング
      this.setupErrorHandling();

      // サーバー起動
      this.startServer();
    } catch (error) {
      this.logger.error('Failed to initialize server:', error);
      process.exit(1);
    }
  }

  private setupMiddleware(): void {
    // セキュリティヘッダー
    this.app.use(helmet());

    // CORS設定
    this.app.use(
      cors({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true,
      })
    );

    // JSONパーサー
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // ログ出力
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      this.logger.info(`${req.method} ${req.url}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      next();
    });
  }

  private setupRoutes(): void {
    // ヘルスチェック
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // APIルート
    const authController = new AuthController();
    const sessionController = new SessionController();
    const logController = new LogController();
    const reportController = new ReportController();

    // 認証関連
    this.app.use('/api/auth', authController.getRouter());

    // セッション関連
    this.app.use('/api/sessions', sessionController.getRouter());

    // ログ関連
    this.app.use('/api/logs', logController.getRouter());

    // レポート関連
    this.app.use('/api/reports', reportController.getRouter());

    // 404ハンドラー
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({ error: 'Not Found' });
    });
  }

  private setupErrorHandling(): void {
    // エラーハンドリングミドルウェア
    this.app.use((error: any, req: Request, res: Response, next: NextFunction) => {
      this.logger.error('Unhandled error:', error);

      if (res.headersSent) {
        return next(error);
      }

      res.status(error.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
      });
    });

    // プロセス終了時の処理
    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('SIGINT', () => this.gracefulShutdown());
  }

  private startServer(): void {
    this.app.listen(this.port, () => {
      this.logger.info(`Server running on port ${this.port}`);
      this.logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  }

  private async gracefulShutdown(): Promise<void> {
    this.logger.info('Shutting down server...');

    try {
      await this.databaseManager.disconnect();
      this.logger.info('Database disconnected');
      process.exit(0);
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// サーバーを起動
const server = new BackendServer();
server.initialize().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
