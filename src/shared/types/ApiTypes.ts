import { SessionData } from './SessionTypes';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

export interface AuthResponse {
  user: UserData;
  accessToken: string;
  refreshToken: string;
}

export interface UserData {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: 'google' | 'github';
  createdAt: string;
  updatedAt: string;
}

export interface SessionResponse {
  session: SessionData;
}

export interface SessionsResponse {
  sessions: SessionData[];
  pagination: PaginationInfo;
}

export interface ScreenshotResponse {
  screenshotId: string;
  url: string;
}

export interface ReportResponse {
  content: string;
  format: 'markdown' | 'json' | 'html';
  filename: string;
}
