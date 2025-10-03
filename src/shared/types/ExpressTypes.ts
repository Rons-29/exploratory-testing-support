import { Request } from 'express';
import { UserData } from './ApiTypes';

// Express Request型を拡張してuserプロパティを追加
declare global {
  namespace Express {
    interface Request {
      user?: UserData;
    }
  }
}

export {};
