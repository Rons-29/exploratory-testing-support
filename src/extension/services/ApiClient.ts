import { SessionData } from '@/shared/types/SessionTypes';
import { ApiResponse } from '@/shared/types/ApiTypes';

export class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor() {
    // Chrome拡張機能では環境変数が利用できないため、定数を使用
    this.baseUrl = 'http://localhost:3000/api';
    this.loadAccessToken();
  }

  public async authenticate(provider: 'google' | 'github', token: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/${provider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          [provider === 'google' ? 'idToken' : 'code']: token 
        })
      });

      const data = await response.json();
      
      if (data.success && data.accessToken) {
        this.accessToken = data.accessToken;
        await this.saveAccessToken(data.accessToken);
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public async saveSession(sessionData: SessionData): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify(sessionData)
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public async uploadSession(sessionData: SessionData): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify(sessionData)
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public async getSessions(page = 1, limit = 20): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public async getSession(sessionId: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public async updateSession(sessionId: string, updateData: Partial<SessionData>): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify(updateData)
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public async deleteSession(sessionId: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public async uploadScreenshot(screenshotData: string): Promise<ApiResponse<{ screenshotId: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/screenshots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({ 
          data: screenshotData,
          timestamp: new Date().toISOString(),
          url: typeof window !== 'undefined' ? window.location.href : 'chrome-extension://' + chrome.runtime.id
        })
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public async exportReport(sessionId: string, format: 'markdown' | 'json' | 'html' = 'markdown'): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/reports/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({ 
          sessionId,
          format
        })
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public async verifyToken(): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public async refreshToken(): Promise<ApiResponse<any>> {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        return {
          success: false,
          error: 'No refresh token available'
        };
      }

      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      const data = await response.json();
      
      if (data.success && data.accessToken) {
        this.accessToken = data.accessToken;
        await this.saveAccessToken(data.accessToken);
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public async logout(): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (response.ok) {
        this.accessToken = null;
        await this.clearTokens();
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  private async loadAccessToken(): Promise<void> {
    try {
      const result = await chrome.storage.local.get('access_token');
      this.accessToken = result.access_token || null;
    } catch (error) {
      console.error('Failed to load access token:', error);
    }
  }

  private async saveAccessToken(token: string): Promise<void> {
    try {
      await chrome.storage.local.set({ access_token: token });
    } catch (error) {
      console.error('Failed to save access token:', error);
    }
  }

  private async getRefreshToken(): Promise<string | null> {
    try {
      const result = await chrome.storage.local.get('refresh_token');
      return result.refresh_token || null;
    } catch (error) {
      console.error('Failed to get refresh token:', error);
      return null;
    }
  }

  private async clearTokens(): Promise<void> {
    try {
      await chrome.storage.local.remove(['access_token', 'refresh_token']);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }
}
