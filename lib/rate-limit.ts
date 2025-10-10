/**
 * Rate Limiting Utility
 * Simple in-memory rate limiter for API routes
 * For production with multiple instances, consider using Redis (Upstash)
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory storage for rate limiting
const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   * @default 10
   */
  limit?: number;
  
  /**
   * Time window in seconds
   * @default 60 (1 minute)
   */
  windowSeconds?: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier for the client (IP address, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result with remaining count and reset time
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig = {}
): RateLimitResult {
  const { limit = 10, windowSeconds = 60 } = config;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  // Get or create entry for this identifier
  let entry = rateLimitMap.get(identifier);

  // If no entry exists or window has expired, create new entry
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
    };
    rateLimitMap.set(identifier, entry);
  }

  // Increment request count
  entry.count++;

  // Check if limit exceeded
  const success = entry.count <= limit;
  const remaining = Math.max(0, limit - entry.count);

  return {
    success,
    limit,
    remaining,
    reset: entry.resetTime,
  };
}

/**
 * Get client identifier from request
 * Uses IP address from various headers
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from various headers (common in production)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare
  
  // Use the first available IP
  const ip = forwarded?.split(',')[0].trim() || 
             realIp || 
             cfConnectingIp || 
             'unknown';
  
  return ip;
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.reset).toISOString(),
  };
}

