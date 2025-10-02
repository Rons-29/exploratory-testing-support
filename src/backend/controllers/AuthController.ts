import { Request, Response, Router } from 'express';
import { AuthService } from '../services/AuthService';
import { Logger } from '../utils/Logger';

export class AuthController {
  private authService: AuthService;
  private logger: Logger;

  constructor() {
    this.authService = new AuthService();
    this.logger = new Logger();
  }

  public getRouter(): Router {
    const router = Router();

    // Google OAuth認証
    router.post('/google', this.googleAuth.bind(this));
    
    // GitHub OAuth認証
    router.post('/github', this.githubAuth.bind(this));
    
    // トークン検証
    router.get('/verify', this.verifyToken.bind(this));
    
    // リフレッシュトークン
    router.post('/refresh', this.refreshToken.bind(this));
    
    // ログアウト
    router.post('/logout', this.logout.bind(this));

    return router;
  }

  private async googleAuth(req: Request, res: Response): Promise<void> {
    try {
      const { idToken } = req.body;
      
      if (!idToken) {
        res.status(400).json({ error: 'ID token is required' });
        return;
      }

      const result = await this.authService.authenticateWithGoogle(idToken);
      
      res.json({
        success: true,
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
    } catch (error) {
      this.logger.error('Google authentication failed:', error);
      res.status(401).json({ error: 'Authentication failed' });
    }
  }

  private async githubAuth(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.body;
      
      if (!code) {
        res.status(400).json({ error: 'Authorization code is required' });
        return;
      }

      const result = await this.authService.authenticateWithGitHub(code);
      
      res.json({
        success: true,
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
    } catch (error) {
      this.logger.error('GitHub authentication failed:', error);
      res.status(401).json({ error: 'Authentication failed' });
    }
  }

  private async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Invalid authorization header' });
        return;
      }

      const token = authHeader.substring(7);
      const user = await this.authService.verifyToken(token);
      
      res.json({
        success: true,
        user
      });
    } catch (error) {
      this.logger.error('Token verification failed:', error);
      res.status(401).json({ error: 'Invalid token' });
    }
  }

  private async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token is required' });
        return;
      }

      const result = await this.authService.refreshAccessToken(refreshToken);
      
      res.json({
        success: true,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
    } catch (error) {
      this.logger.error('Token refresh failed:', error);
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  }

  private async logout(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        await this.authService.revokeToken(token);
      }
      
      res.json({ success: true });
    } catch (error) {
      this.logger.error('Logout failed:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }
}
