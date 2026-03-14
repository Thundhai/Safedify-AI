import { Response } from 'express';
import type { AuthRequest } from '../auth';
import rateLimit, { RateLimitRequestHandler, ipKeyGenerator } from 'express-rate-limit';

/**
 * Rate limit per user session (token) middleware for Express.
 * Falls back to IP if no token is present.
 *
 * @param options express-rate-limit options
 * @returns Express middleware
 */
export function sessionRateLimit(options: Parameters<typeof rateLimit>[0]): RateLimitRequestHandler {
  return rateLimit({
    ...options,
    keyGenerator: (req: AuthRequest, _res: Response): string => {
      // Try to use user id from req.user (set by authenticate middleware)
      // Fallback to token in Authorization header
      // Fallback to IPv6-safe IP key
      const authHeader = req.headers['authorization'];
      if (req.user && req.user.id) return `user:${req.user.id}`;
      if (authHeader && authHeader.startsWith('Bearer ')) return `token:${authHeader.slice(7)}`;
      // Cast req to Request for ipKeyGenerator compatibility
      return ipKeyGenerator(req as any);
    },
  });
}
