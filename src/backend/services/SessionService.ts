import { DatabaseManager } from '../database/DatabaseManager';
import { Logger } from '../utils/Logger';
import { SessionData, SessionStatus } from '@/shared/types/SessionTypes';
import { PaginatedResponse, PaginationInfo } from '@/shared/types/ApiTypes';

export class SessionService {
  private databaseManager: DatabaseManager;
  private logger: Logger;

  constructor() {
    this.databaseManager = new DatabaseManager();
    this.logger = new Logger();
  }

  public async createSession(sessionData: {
    userId: string;
    name: string;
    description?: string;
  }): Promise<SessionData> {
    try {
      const result = await this.databaseManager.query(
        'INSERT INTO sessions (user_id, name, description, status, start_time) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [sessionData.userId, sessionData.name, sessionData.description || '', SessionStatus.ACTIVE, new Date()]
      );

      return this.mapSessionFromDb(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to create session:', error);
      throw new Error('Failed to create session');
    }
  }

  public async getSession(sessionId: string, userId: string): Promise<SessionData | null> {
    try {
      const result = await this.databaseManager.query(
        'SELECT * FROM sessions WHERE id = $1 AND user_id = $2',
        [sessionId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const session = this.mapSessionFromDb(result.rows[0]);
      
      // 関連データを取得
      session.events = await this.getSessionEvents(sessionId);
      session.screenshots = await this.getSessionScreenshots(sessionId);
      session.flags = await this.getSessionFlags(sessionId);

      return session;
    } catch (error) {
      this.logger.error('Failed to get session:', error);
      throw new Error('Failed to get session');
    }
  }

  public async getSessions(userId: string, options: {
    page: number;
    limit: number;
    status?: string;
  }): Promise<PaginatedResponse<SessionData>> {
    try {
      const offset = (options.page - 1) * options.limit;
      let query = 'SELECT * FROM sessions WHERE user_id = $1';
      const params: any[] = [userId];

      if (options.status) {
        query += ' AND status = $2';
        params.push(options.status);
      }

      query += ' ORDER BY start_time DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(options.limit, offset);

      const result = await this.databaseManager.query(query, params);

      // 総数を取得
      let countQuery = 'SELECT COUNT(*) FROM sessions WHERE user_id = $1';
      const countParams: any[] = [userId];

      if (options.status) {
        countQuery += ' AND status = $2';
        countParams.push(options.status);
      }

      const countResult = await this.databaseManager.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count, 10);

      const sessions = result.rows.map(row => this.mapSessionFromDb(row));

      const pagination: PaginationInfo = {
        page: options.page,
        limit: options.limit,
        total,
        totalPages: Math.ceil(total / options.limit),
        hasNext: options.page < Math.ceil(total / options.limit),
        hasPrev: options.page > 1
      };

      return {
        data: sessions,
        pagination
      };
    } catch (error) {
      this.logger.error('Failed to get sessions:', error);
      throw new Error('Failed to get sessions');
    }
  }

  public async updateSession(sessionId: string, userId: string, updateData: Partial<SessionData>): Promise<SessionData | null> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updateData.name !== undefined) {
        fields.push(`name = $${paramIndex++}`);
        values.push(updateData.name);
      }

      if (updateData.description !== undefined) {
        fields.push(`description = $${paramIndex++}`);
        values.push(updateData.description);
      }

      if (updateData.status !== undefined) {
        fields.push(`status = $${paramIndex++}`);
        values.push(updateData.status);
      }

      if (updateData.endTime !== undefined) {
        fields.push(`end_time = $${paramIndex++}`);
        values.push(updateData.endTime);
      }

      if (updateData.metadata !== undefined) {
        fields.push(`metadata = $${paramIndex++}`);
        values.push(JSON.stringify(updateData.metadata));
      }

      if (fields.length === 0) {
        return await this.getSession(sessionId, userId);
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(sessionId, userId);

      const query = `UPDATE sessions SET ${fields.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex++} RETURNING *`;
      
      const result = await this.databaseManager.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapSessionFromDb(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to update session:', error);
      throw new Error('Failed to update session');
    }
  }

  public async deleteSession(sessionId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.databaseManager.query(
        'DELETE FROM sessions WHERE id = $1 AND user_id = $2',
        [sessionId, userId]
      );

      return result.rowCount > 0;
    } catch (error) {
      this.logger.error('Failed to delete session:', error);
      throw new Error('Failed to delete session');
    }
  }

  public async stopSession(sessionId: string, userId: string): Promise<SessionData | null> {
    try {
      const result = await this.databaseManager.query(
        'UPDATE sessions SET status = $1, end_time = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4 RETURNING *',
        [SessionStatus.COMPLETED, new Date(), sessionId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapSessionFromDb(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to stop session:', error);
      throw new Error('Failed to stop session');
    }
  }

  public async addEvent(sessionId: string, eventData: any): Promise<void> {
    try {
      await this.databaseManager.query(
        'INSERT INTO events (session_id, type, timestamp, data) VALUES ($1, $2, $3, $4)',
        [sessionId, eventData.type, eventData.timestamp, JSON.stringify(eventData.data)]
      );
    } catch (error) {
      this.logger.error('Failed to add event:', error);
      throw new Error('Failed to add event');
    }
  }

  public async addScreenshot(sessionId: string, screenshotData: {
    data: string;
    url: string;
    timestamp: string;
  }): Promise<string> {
    try {
      const result = await this.databaseManager.query(
        'INSERT INTO screenshots (session_id, data, url, timestamp) VALUES ($1, $2, $3, $4) RETURNING id',
        [sessionId, screenshotData.data, screenshotData.url, screenshotData.timestamp]
      );

      return result.rows[0].id;
    } catch (error) {
      this.logger.error('Failed to add screenshot:', error);
      throw new Error('Failed to add screenshot');
    }
  }

  public async addFlag(sessionId: string, flagData: {
    eventId?: string;
    note: string;
    timestamp: string;
  }): Promise<string> {
    try {
      const result = await this.databaseManager.query(
        'INSERT INTO flags (session_id, event_id, note, timestamp) VALUES ($1, $2, $3, $4) RETURNING id',
        [sessionId, flagData.eventId, flagData.note, flagData.timestamp]
      );

      return result.rows[0].id;
    } catch (error) {
      this.logger.error('Failed to add flag:', error);
      throw new Error('Failed to add flag');
    }
  }

  private async getSessionEvents(sessionId: string): Promise<any[]> {
    const result = await this.databaseManager.query(
      'SELECT * FROM events WHERE session_id = $1 ORDER BY timestamp ASC',
      [sessionId]
    );

    return result.rows.map(row => ({
      id: row.id,
      type: row.type,
      timestamp: row.timestamp,
      data: row.data
    }));
  }

  private async getSessionScreenshots(sessionId: string): Promise<any[]> {
    const result = await this.databaseManager.query(
      'SELECT * FROM screenshots WHERE session_id = $1 ORDER BY timestamp ASC',
      [sessionId]
    );

    return result.rows.map(row => ({
      id: row.id,
      data: row.data,
      timestamp: row.timestamp,
      url: row.url
    }));
  }

  private async getSessionFlags(sessionId: string): Promise<any[]> {
    const result = await this.databaseManager.query(
      'SELECT * FROM flags WHERE session_id = $1 ORDER BY timestamp ASC',
      [sessionId]
    );

    return result.rows.map(row => ({
      id: row.id,
      eventId: row.event_id,
      note: row.note,
      timestamp: row.timestamp
    }));
  }

  private mapSessionFromDb(row: any): SessionData {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status as SessionStatus,
      startTime: row.start_time,
      endTime: row.end_time,
      events: [],
      screenshots: [],
      flags: [],
      metadata: row.metadata || {}
    };
  }
}
