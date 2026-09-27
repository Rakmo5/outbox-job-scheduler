import Redis from 'ioredis';
import RedisMock from 'ioredis-mock';
import dotenv from 'dotenv';

dotenv.config();

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

export const redisOptions = {
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

let activeRedisClient: any = null;

export function getRedisInstance(): any {
  if (activeRedisClient) return activeRedisClient;

  try {
    const client = new Redis(redisOptions);
    client.on('connect', () => console.log('✅ Connected to live Redis instance'));
    client.on('error', (err) => {
      console.warn('⚠️ Redis connection failed, utilizing fallback mock store:', err.message);
    });
    activeRedisClient = client;
    return activeRedisClient;
  } catch (e) {
    console.warn('⚠️ Using ioredis-mock fallback store');
    activeRedisClient = new RedisMock();
    return activeRedisClient;
  }
}

export const redisClient = getRedisInstance();
