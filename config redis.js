import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient;

export async function initializeRedis() {
  try {
    redisClient = createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
      }
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis error:', err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('❌ Redis initialization failed:', error);
    throw error;
  }
}

export function getRedisClient() {
  return redisClient;
}

// Cache utilities
export async function cacheSet(key, value, ttl = 3600) {
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error('❌ Cache set error:', error);
  }
}

export async function cacheGet(key) {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('❌ Cache get error:', error);
    return null;
  }
}

export async function cacheDelete(key) {
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error('❌ Cache delete error:', error);
  }
}

export async function cacheClear(pattern) {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error('❌ Cache clear error:', error);
  }
}

export default { initializeRedis, getRedisClient, cacheSet, cacheGet, cacheDelete, cacheClear };
