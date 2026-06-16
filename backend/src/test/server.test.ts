jest.mock('expo-server-sdk', () => {
  return {
    Expo: jest.fn().mockImplementation(() => {
      return {
        chunkPushNotifications: jest.fn().mockReturnValue([]),
        sendPushNotificationsAsync: jest.fn().mockResolvedValue([]),
        isExpoPushToken: jest.fn().mockReturnValue(true),
      };
    }),
  };
});
import request from 'supertest';
import { app } from '../server';

describe('GET /health', () => {
  it('should return 200 OK and status ok', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
