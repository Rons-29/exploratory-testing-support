import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserData } from '@/shared/types/ApiTypes';

export interface AuthenticatedRequest extends Request {
  user?: UserData;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // ユーザー情報をリクエストに追加
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      provider: decoded.provider
    } as UserData;

    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        provider: decoded.provider
      } as UserData;
    }

    next();
  } catch (error) {
    // オプショナル認証なので、エラーでも続行
    next();
  }
};
