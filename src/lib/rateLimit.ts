import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let rateLimiter: Ratelimit | null = null;

export function getRateLimiter(): Ratelimit | null {
  if (rateLimiter) return rateLimiter;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    console.warn('Rate limiting disabled: missing Vercel KV env vars');
    return null;
  }
  try {
    const redisClient = Redis.fromEnv();

    rateLimiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(100, '60 s'),
      analytics: true,
    });
    return rateLimiter;
  } catch (err) {
    console.error('Failed to initialize rate limiter:', err);
    return null;
  }
}
