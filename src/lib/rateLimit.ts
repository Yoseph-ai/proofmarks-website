import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let limiter: Ratelimit | null = null;

export function getRateLimiter(): Ratelimit | null {
  if (limiter) return limiter;

  const url   = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  console.log('[RateLimit] URL present:', !!url);
  console.log('[RateLimit] Token present:', !!token);

  if (!url || !token) {
    console.warn('[RateLimit] Not configured — KV env vars missing.');
    return null;
  }

  try {
    const redis = new Redis({ url, token });
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
    });
    console.log('[RateLimit] Initialized successfully');
  } catch (err) {
    console.error('[RateLimit] Init failed:', err);
    return null;
  }

  return limiter;
}