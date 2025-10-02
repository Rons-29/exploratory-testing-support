import { Pool, PoolClient } from 'pg';
import { Logger } from '../utils/Logger';

export class DatabaseManager {
  private pool: Pool;
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.setupEventHandlers();
  }

  public async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.logger.info('Database connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.pool.end();
      this.logger.info('Database disconnected successfully');
    } catch (error) {
      this.logger.error('Failed to disconnect from database:', error);
      throw error;
    }
  }

  public async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      this.logger.debug(`Query executed in ${duration}ms: ${text.substring(0, 100)}...`);
      return result;
    } catch (error) {
      this.logger.error(`Query failed: ${text.substring(0, 100)}...`, error);
      throw error;
    }
  }

  public async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async initializeSchema(): Promise<void> {
    try {
      // スキーマファイルを読み込んで実行
      const fs = require('fs');
      const path = require('path');
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      await this.query(schema);
      this.logger.info('Database schema initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database schema:', error);
      throw error;
    }
  }

  public async checkHealth(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1');
      return result.rows.length > 0;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  public async getStats(): Promise<{
    totalConnections: number;
    idleConnections: number;
    waitingClients: number;
  }> {
    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingClients: this.pool.waitingCount
    };
  }

  private setupEventHandlers(): void {
    this.pool.on('connect', (client) => {
      this.logger.debug('New client connected to database');
    });

    this.pool.on('error', (err) => {
      this.logger.error('Unexpected error on idle client:', err);
    });

    this.pool.on('remove', (client) => {
      this.logger.debug('Client removed from pool');
    });
  }
}
