import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

let limiter: Ratelimit | null = null;

export function getRateLimiter(): Ratelimit | null {
  if (limiter) return limiter;

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.warn('Rate limiter not configured — KV env vars missing.');
    return null;
  }

  limiter = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute per key
    analytics: true,
  });

  return limiter;
}