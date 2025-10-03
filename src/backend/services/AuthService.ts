import bcrypt from 'bcryptjs';
import { sign, verify, type SignOptions, type Secret, type JwtPayload } from 'jsonwebtoken';
import { DatabaseManager } from '../database/DatabaseManager';
import { Logger } from '../utils/Logger';
import { UserData } from '../../shared/types/ApiTypes';

interface AccessTokenPayload extends JwtPayload {
  userId: string;
  email: string;
  provider: string;
}

interface RefreshTokenPayload extends JwtPayload {
  userId: string;
  type: 'refresh';
}

const getJwtSecret = (): Secret => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not set in environment variables');
  }
  return secret as Secret;
};

export class AuthService {
  private databaseManager: DatabaseManager;
  private logger: Logger;

  constructor() {
    this.databaseManager = new DatabaseManager();
    this.logger = new Logger();
  }

  public async authenticateWithGoogle(idToken: string): Promise<{
    user: UserData;
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      // Google IDトークンの検証（実際の実装ではgoogle-auth-libraryを使用）
      const googleUser = await this.verifyGoogleToken(idToken);
      
      // ユーザーの存在確認または作成
      let user = await this.findUserByProvider('google', googleUser.sub);
      
      if (!user) {
        user = await this.createUser({
          email: googleUser.email,
          name: googleUser.name,
          avatar: googleUser.picture,
          provider: 'google',
          providerId: googleUser.sub
        });
      }

      // トークンの生成
      const accessToken = this.generateAccessToken(user);
      const refreshToken = await this.generateRefreshToken(user.id);

      return {
        user,
        accessToken,
        refreshToken
      };
    } catch (error) {
      this.logger.error('Google authentication failed:', error);
      throw new Error('Authentication failed');
    }
  }

  public async authenticateWithGitHub(code: string): Promise<{
    user: UserData;
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      // GitHub OAuth認証（実際の実装ではoctokitを使用）
      const githubUser = await this.exchangeGitHubCode(code);
      
      // ユーザーの存在確認または作成
      let user = await this.findUserByProvider('github', githubUser.id.toString());
      
      if (!user) {
        user = await this.createUser({
          email: githubUser.email,
          name: githubUser.name || githubUser.login,
          avatar: githubUser.avatar_url,
          provider: 'github',
          providerId: githubUser.id.toString()
        });
      }

      // トークンの生成
      const accessToken = this.generateAccessToken(user);
      const refreshToken = await this.generateRefreshToken(user.id);

      return {
        user,
        accessToken,
        refreshToken
      };
    } catch (error) {
      this.logger.error('GitHub authentication failed:', error);
      throw new Error('Authentication failed');
    }
  }

  public async verifyToken(token: string): Promise<UserData> {
    try {
      const decoded = verify(token, getJwtSecret()) as AccessTokenPayload;
      
      const result = await this.databaseManager.query(
        'SELECT * FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return this.mapUserFromDb(result.rows[0]);
    } catch (error) {
      this.logger.error('Token verification failed:', error);
      throw new Error('Invalid token');
    }
  }

  public async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      const tokenHash = await bcrypt.hash(refreshToken, 10);
      
      const result = await this.databaseManager.query(
        'SELECT rt.*, u.* FROM refresh_tokens rt JOIN users u ON rt.user_id = u.id WHERE rt.token_hash = $1 AND rt.expires_at > NOW()',
        [tokenHash]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid refresh token');
      }

      const user = this.mapUserFromDb(result.rows[0]);
      
      // 新しいトークンを生成
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = await this.generateRefreshToken(user.id);

      // 古いリフレッシュトークンを削除
      await this.databaseManager.query(
        'DELETE FROM refresh_tokens WHERE token_hash = $1',
        [tokenHash]
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      this.logger.error('Token refresh failed:', error);
      throw new Error('Invalid refresh token');
    }
  }

  public async revokeToken(token: string): Promise<void> {
    try {
      const decoded = verify(token, getJwtSecret()) as AccessTokenPayload;
      
      // リフレッシュトークンを削除
      await this.databaseManager.query(
        'DELETE FROM refresh_tokens WHERE user_id = $1',
        [decoded.userId]
      );
    } catch (error) {
      this.logger.error('Token revocation failed:', error);
      // エラーでも成功として扱う（トークンが無効な場合）
    }
  }

  private async findUserByProvider(provider: string, providerId: string): Promise<UserData | null> {
    const result = await this.databaseManager.query(
      'SELECT * FROM users WHERE provider = $1 AND provider_id = $2',
      [provider, providerId]
    );

    return result.rows.length > 0 ? this.mapUserFromDb(result.rows[0]) : null;
  }

  private async createUser(userData: {
    email: string;
    name: string;
    avatar?: string;
    provider: string;
    providerId: string;
  }): Promise<UserData> {
    const result = await this.databaseManager.query(
      'INSERT INTO users (email, name, avatar_url, provider, provider_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userData.email, userData.name, userData.avatar, userData.provider, userData.providerId]
    );

    return this.mapUserFromDb(result.rows[0]);
  }

  private generateAccessToken(user: UserData): string {
    const payload = { 
      userId: user.id,
      email: user.email,
      provider: user.provider
    };
    return sign(payload, getJwtSecret(), { 
      expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as any
    });
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const payload = { userId, type: 'refresh' as const };
    const token = sign(payload, getJwtSecret(), { 
      expiresIn: (process.env.REFRESH_TOKEN_EXPIRES_IN ?? '30d') as any
    });

    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30日後

    await this.databaseManager.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiresAt]
    );

    return token;
  }

  private mapUserFromDb(row: any): UserData {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      avatar: row.avatar_url,
      provider: row.provider,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private async verifyGoogleToken(idToken: string): Promise<any> {
    // 実際の実装ではgoogle-auth-libraryを使用
    // ここでは簡略化した実装
    throw new Error('Google token verification not implemented');
  }

  private async exchangeGitHubCode(code: string): Promise<any> {
    // 実際の実装ではoctokitを使用
    // ここでは簡略化した実装
    throw new Error('GitHub code exchange not implemented');
  }
}
