import express from 'express';
import rateLimit from 'express-rate-limit';
import { type MiddlewareConfigFn } from 'wasp/server';

// ---------------------------------------------------------------------------
// A2: Rate limiting — prevent brute-force login and API abuse
// ---------------------------------------------------------------------------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => req.method === 'OPTIONS',
});

const actionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => req.method === 'OPTIONS',
});

const queryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => req.method === 'OPTIONS',
});

export const serverMiddlewareFn: MiddlewareConfigFn = (middlewareConfig) => {
  // Increase JSON body limit to support base64-encoded file uploads (5MB file ≈ 6.67MB base64)
  middlewareConfig.set('express.json', express.json({ limit: '8mb' }));

  // Rate limiting by route pattern
  middlewareConfig.set('rateLimitAuth', (req: any, res: any, next: any) => {
    const p: string = req.path || '';
    if (p.startsWith('/auth/')) return authLimiter(req, res, next);
    if (req.method === 'POST' && p.startsWith('/operations/')) return actionLimiter(req, res, next);
    if (req.method === 'GET' && p.startsWith('/operations/')) return queryLimiter(req, res, next);
    next();
  });

  // Replace the default cors middleware with one that allows open CORS on widget routes.
  // The chatbot widget is embedded on external sites and needs Access-Control-Allow-Origin: *.
  const defaultCors = middlewareConfig.get('cors');
  middlewareConfig.set('cors', (req: any, res: any, next: any) => {
    const path: string = req.path || '';
    if (path.startsWith('/api/inbox/widget')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
      next();
    } else if (defaultCors) {
      defaultCors(req, res, next);
    } else {
      next();
    }
  });

  return middlewareConfig;
};
