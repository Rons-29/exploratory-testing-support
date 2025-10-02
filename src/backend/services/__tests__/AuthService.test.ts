import { AuthService } from '../AuthService';
import { DatabaseManager } from '../../database/DatabaseManager';

// Mock DatabaseManager
jest.mock('../../database/DatabaseManager');
const MockedDatabaseManager = jest.mocked(require('../../database/DatabaseManager').DatabaseManager);

// Mock bcrypt
jest.mock('bcryptjs');
const bcrypt = require('bcryptjs');

// Mock jwt
jest.mock('jsonwebtoken');
const jwt = require('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;
  let mockDatabaseManager: any;

  beforeEach(() => {
    mockDatabaseManager = {
      query: jest.fn()
    };
    
    MockedDatabaseManager.mockImplementation(() => mockDatabaseManager);
    authService = new AuthService();
    
    jest.clearAllMocks();
  });

  describe('authenticateWithGoogle', () => {
    it('should authenticate existing Google user', async () => {
      const mockGoogleUser = {
        sub: 'google123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg'
      };

      const mockDbUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        provider: 'google',
        provider_id: 'google123',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      // Mock verifyGoogleToken
      jest.spyOn(authService as any, 'verifyGoogleToken').mockResolvedValue(mockGoogleUser);
      
      // Mock findUserByProvider
      jest.spyOn(authService as any, 'findUserByProvider').mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        avatar: 'https://example.com/avatar.jpg',
        provider: 'google',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      });

      // Mock generateAccessToken
      jest.spyOn(authService as any, 'generateAccessToken').mockReturnValue('access-token');
      
      // Mock generateRefreshToken
      jest.spyOn(authService as any, 'generateRefreshToken').mockResolvedValue('refresh-token');

      const result = await authService.authenticateWithGoogle('id-token');

      expect(result).toEqual({
        user: expect.objectContaining({
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User'
        }),
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      });
    });

    it('should create new Google user if not exists', async () => {
      const mockGoogleUser = {
        sub: 'google456',
        email: 'newuser@example.com',
        name: 'New User',
        picture: 'https://example.com/new-avatar.jpg'
      };

      const mockDbUser = {
        id: 'user456',
        email: 'newuser@example.com',
        name: 'New User',
        avatar_url: 'https://example.com/new-avatar.jpg',
        provider: 'google',
        provider_id: 'google456',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      // Mock verifyGoogleToken
      jest.spyOn(authService as any, 'verifyGoogleToken').mockResolvedValue(mockGoogleUser);
      
      // Mock findUserByProvider (user not found)
      jest.spyOn(authService as any, 'findUserByProvider').mockResolvedValue(null);
      
      // Mock createUser
      jest.spyOn(authService as any, 'createUser').mockResolvedValue({
        id: 'user456',
        email: 'newuser@example.com',
        name: 'New User',
        avatar: 'https://example.com/new-avatar.jpg',
        provider: 'google',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      });

      // Mock generateAccessToken
      jest.spyOn(authService as any, 'generateAccessToken').mockReturnValue('access-token');
      
      // Mock generateRefreshToken
      jest.spyOn(authService as any, 'generateRefreshToken').mockResolvedValue('refresh-token');

      const result = await authService.authenticateWithGoogle('id-token');

      expect(result).toEqual({
        user: expect.objectContaining({
          id: 'user456',
          email: 'newuser@example.com',
          name: 'New User'
        }),
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      });
    });

    it('should throw error for invalid Google token', async () => {
      jest.spyOn(authService as any, 'verifyGoogleToken').mockRejectedValue(new Error('Invalid token'));

      await expect(authService.authenticateWithGoogle('invalid-token')).rejects.toThrow('Authentication failed');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token and return user', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        provider: 'google',
        provider_id: 'google123',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      jwt.verify.mockReturnValue({
        userId: 'user123',
        email: 'test@example.com',
        provider: 'google'
      });

      mockDatabaseManager.query.mockResolvedValue({
        rows: [mockUser]
      });

      const result = await authService.verifyToken('valid-token');

      expect(result).toEqual({
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        avatar: 'https://example.com/avatar.jpg',
        provider: 'google',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      });
    });

    it('should throw error for invalid token', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.verifyToken('invalid-token')).rejects.toThrow('Invalid token');
    });

    it('should throw error for non-existent user', async () => {
      jwt.verify.mockReturnValue({
        userId: 'nonexistent',
        email: 'test@example.com',
        provider: 'google'
      });

      mockDatabaseManager.query.mockResolvedValue({
        rows: []
      });

      await expect(authService.verifyToken('valid-token')).rejects.toThrow('Invalid token');
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh valid refresh token', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        provider: 'google',
        provider_id: 'google123',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      bcrypt.hash.mockResolvedValue('hashed-token');

      mockDatabaseManager.query.mockResolvedValueOnce({
        rows: [mockUser]
      });

      mockDatabaseManager.query.mockResolvedValueOnce({
        rowCount: 1
      });

      // Mock generateAccessToken
      jest.spyOn(authService as any, 'generateAccessToken').mockReturnValue('new-access-token');
      
      // Mock generateRefreshToken
      jest.spyOn(authService as any, 'generateRefreshToken').mockResolvedValue('new-refresh-token');

      const result = await authService.refreshAccessToken('refresh-token');

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      });
    });

    it('should throw error for invalid refresh token', async () => {
      bcrypt.hash.mockResolvedValue('hashed-token');

      mockDatabaseManager.query.mockResolvedValue({
        rows: []
      });

      await expect(authService.refreshAccessToken('invalid-refresh-token')).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('revokeToken', () => {
    it('should revoke token successfully', async () => {
      jwt.verify.mockReturnValue({
        userId: 'user123',
        email: 'test@example.com',
        provider: 'google'
      });

      mockDatabaseManager.query.mockResolvedValue({
        rowCount: 1
      });

      await authService.revokeToken('access-token');

      expect(mockDatabaseManager.query).toHaveBeenCalledWith(
        'DELETE FROM refresh_tokens WHERE user_id = $1',
        ['user123']
      );
    });

    it('should handle invalid token gracefully', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Should not throw error
      await authService.revokeToken('invalid-token');
    });
  });
});
