import express from 'express';
import { type MiddlewareConfigFn } from 'wasp/server';

export const serverMiddlewareFn: MiddlewareConfigFn = (middlewareConfig) => {
  // Increase JSON body limit to support base64-encoded file uploads (5MB file ≈ 6.67MB base64)
  middlewareConfig.set('express.json', express.json({ limit: '8mb' }));

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
