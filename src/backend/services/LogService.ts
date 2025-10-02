import { DatabaseManager } from '../database/DatabaseManager';
import { Logger } from '../utils/Logger';
import { LogData } from '@/shared/types/LogTypes';

export interface LogSearchOptions {
  query?: string;
  level?: string;
  startDate?: string;
  endDate?: string;
}

export interface LogPaginationOptions {
  page: number;
  limit: number;
  level?: string;
}

export class LogService {
  private databaseManager: DatabaseManager;
  private logger: Logger;

  constructor() {
    this.databaseManager = new DatabaseManager();
    this.logger = new Logger();
  }

  public async getLogsBySession(sessionId: string, options: LogPaginationOptions): Promise<LogData[]> {
    try {
      const { page, limit, level } = options;
      const offset = (page - 1) * limit;

      let query = `
        SELECT * FROM logs 
        WHERE session_id = $1
      `;
      const params: unknown[] = [sessionId];

      if (level) {
        query += ` AND level = $${params.length + 1}`;
        params.push(level);
      }

      query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await this.databaseManager.query(query, params);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get logs by session:', error);
      throw error;
    }
  }

  public async createLog(logData: Partial<LogData>): Promise<LogData> {
    try {
      const { sessionId, level, message, data, timestamp } = logData;
      
      const query = `
        INSERT INTO logs (id, session_id, level, message, data, timestamp, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
      `;
      
      const id = this.generateId();
      const params = [id, sessionId, level, message, JSON.stringify(data), timestamp || new Date().toISOString()];
      
      const result = await this.databaseManager.query(query, params);
      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to create log:', error);
      throw error;
    }
  }

  public async updateLog(id: string, updateData: Partial<LogData>): Promise<LogData> {
    try {
      const fields = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (updateData.level !== undefined) {
        fields.push(`level = $${paramIndex++}`);
        params.push(updateData.level);
      }
      
      if (updateData.message !== undefined) {
        fields.push(`message = $${paramIndex++}`);
        params.push(updateData.message);
      }
      
      if (updateData.data !== undefined) {
        fields.push(`data = $${paramIndex++}`);
        params.push(JSON.stringify(updateData.data));
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      fields.push(`updated_at = NOW()`);
      params.push(id);

      const query = `
        UPDATE logs 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await this.databaseManager.query(query, params);
      
      if (result.rows.length === 0) {
        throw new Error('Log not found');
      }
      
      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to update log:', error);
      throw error;
    }
  }

  public async deleteLog(id: string): Promise<void> {
    try {
      const query = 'DELETE FROM logs WHERE id = $1';
      const result = await this.databaseManager.query(query, [id]);
      
      if (result.rowCount === 0) {
        throw new Error('Log not found');
      }
    } catch (error) {
      this.logger.error('Failed to delete log:', error);
      throw error;
    }
  }

  public async searchLogs(sessionId: string, options: LogSearchOptions): Promise<LogData[]> {
    try {
      const { query, level, startDate, endDate } = options;
      
      let sqlQuery = 'SELECT * FROM logs WHERE session_id = $1';
      const params: unknown[] = [sessionId];
      let paramIndex = 2;

      if (query) {
        sqlQuery += ` AND (message ILIKE $${paramIndex} OR data::text ILIKE $${paramIndex})`;
        params.push(`%${query}%`);
        paramIndex++;
      }

      if (level) {
        sqlQuery += ` AND level = $${paramIndex}`;
        params.push(level);
        paramIndex++;
      }

      if (startDate) {
        sqlQuery += ` AND timestamp >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        sqlQuery += ` AND timestamp <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      sqlQuery += ' ORDER BY timestamp DESC';

      const result = await this.databaseManager.query(sqlQuery, params);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to search logs:', error);
      throw error;
    }
  }

  private generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
