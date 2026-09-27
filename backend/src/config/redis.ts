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
  lazyConnect: true,
};

let activeRedisInstance: any = null;

export function getRedisInstance(): any {
  if (activeRedisInstance) return activeRedisInstance;

  try {
    const realClient = new Redis({
      ...redisOptions,
      retryStrategy: () => null, // don't retry endlessly if Redis server is down
    });

    realClient.on('error', (err) => {
      // Silently catch error
    });

    activeRedisInstance = realClient;
    return activeRedisInstance;
  } catch (e) {
    console.log('💡 Using ioredis-mock for local queue processing');
    activeRedisInstance = new RedisMock();
    return activeRedisInstance;
  }
}

// Fallback Mock Store for offline execution
export const mockRedisClient = new RedisMock();
export const redisClient = mockRedisClient;
