/**
 * Chrome DevTools MCP サービス
 * chrome-devtools-mcpサーバーとの連携を管理
 */

export interface MCPResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface BrowserSnapshot {
  url: string;
  title: string;
  elements: any[];
  consoleMessages: any[];
  networkRequests: any[];
}

export class DevToolsMCP {
  private mcpServerUrl: string;
  private isConnected: boolean = false;

  constructor(mcpServerUrl: string = 'http://localhost:3001/mcp') {
    this.mcpServerUrl = mcpServerUrl;
  }

  /**
   * MCPサーバーとの接続をテスト
   */
  public async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.mcpServerUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      this.isConnected = response.ok;
      return this.isConnected;
    } catch (error) {
      console.error('MCP connection test failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * ブラウザのスナップショットを取得
   */
  public async getBrowserSnapshot(): Promise<MCPResponse> {
    try {
      const response = await fetch(`${this.mcpServerUrl}/browser/snapshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          includeConsole: true,
          includeNetwork: true,
          includeElements: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Failed to get browser snapshot:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * ページの要素をクリック
   */
  public async clickElement(selector: string): Promise<MCPResponse> {
    try {
      const response = await fetch(`${this.mcpServerUrl}/browser/click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          selector: selector
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Failed to click element:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * テキストを入力
   */
  public async typeText(selector: string, text: string): Promise<MCPResponse> {
    try {
      const response = await fetch(`${this.mcpServerUrl}/browser/type`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          selector: selector,
          text: text
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Failed to type text:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * ページをナビゲート
   */
  public async navigateTo(url: string): Promise<MCPResponse> {
    try {
      const response = await fetch(`${this.mcpServerUrl}/browser/navigate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Failed to navigate:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * スクリーンショットを取得
   */
  public async takeScreenshot(): Promise<MCPResponse> {
    try {
      const response = await fetch(`${this.mcpServerUrl}/browser/screenshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data.screenshot
      };
    } catch (error) {
      console.error('Failed to take screenshot:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * コンソールメッセージを取得
   */
  public async getConsoleMessages(): Promise<MCPResponse> {
    try {
      const response = await fetch(`${this.mcpServerUrl}/browser/console`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data.messages || []
      };
    } catch (error) {
      console.error('Failed to get console messages:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * ネットワークリクエストを取得
   */
  public async getNetworkRequests(): Promise<MCPResponse> {
    try {
      const response = await fetch(`${this.mcpServerUrl}/browser/network`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data.requests || []
      };
    } catch (error) {
      console.error('Failed to get network requests:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * AI分析を実行
   */
  public async analyzeWithAI(context: any): Promise<MCPResponse> {
    try {
      const response = await fetch(`${this.mcpServerUrl}/ai/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          context: context,
          analysisType: 'exploratory_testing'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Failed to analyze with AI:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 接続状態を取得
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}
