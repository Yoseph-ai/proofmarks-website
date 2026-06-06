import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

let rateLimiter: Ratelimit | null = null;
let anchorLimiter: Ratelimit | null = null;

// For the verify endpoint (100 requests per minute)
export function getRateLimiter(): Ratelimit | null {
  if (rateLimiter) return rateLimiter;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    console.warn('Rate limiting disabled: missing Vercel KV environment variables');
    return null;
  }
  try {
    rateLimiter = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(100, '60 s'),
      analytics: true,
    });
    return rateLimiter;
  } catch (err) {
    console.error('Failed to initialize rate limiter:', err);
    return null;
  }
}

// For the anchor endpoint (5 requests per minute, stricter)
export function getAnchorRateLimiter(): Ratelimit | null {
  if (anchorLimiter) return anchorLimiter;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    console.warn('Anchor rate limiting disabled: missing Vercel KV environment variables');
    return null;
  }
  try {
    anchorLimiter = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      analytics: true,
    });
    return anchorLimiter;
  } catch (err) {
    console.error('Failed to initialize anchor rate limiter:', err);
    return null;
  }
}