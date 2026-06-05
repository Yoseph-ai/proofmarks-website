import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let rateLimiter: Ratelimit | null = null;

export function getRateLimiter(): Ratelimit | null {
  if (rateLimiter) return rateLimiter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn('Rate limiting disabled: missing Upstash environment variables');
    return null;
  }
  try {
    rateLimiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(100, '60 s'),
      analytics: true,
    });
    return rateLimiter;
  } catch (err) {
    console.error('Failed to initialize rate limiter:', err);
    return null;
  }
}
