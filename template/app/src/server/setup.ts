import type { Application } from 'express';
import path from 'path';
import fs from 'fs';

// Cache the widget JS in memory (read once at startup)
let widgetJsCache: string | null = null;

function getWidgetJs(): string | null {
  if (widgetJsCache) return widgetJsCache;
  try {
    // Server cwd is .wasp/out/server — go up 3 levels to reach project root
    const buildDir = path.resolve(process.cwd(), '..', '..', '..', 'build');
    widgetJsCache = fs.readFileSync(path.join(buildDir, 'mAutomate-widget.js'), 'utf-8');
    return widgetJsCache;
  } catch {
    return null;
  }
}

export const serverSetup = (context: { app: Application }) => {
  // Pre-load widget JS into memory
  getWidgetJs();

  const widgetMiddleware = (req: any, res: any, next: any) => {
    const reqPath: string = req.path || '';

    // Serve widget JS via /api/ path — nginx proxies /api/* to Node,
    // bypassing Cloudflare/nginx static file caching entirely.
    // Path has no .js extension because nginx regex catches *.js before /api/ proxy.
    if (
      reqPath === '/api/inbox/widget-script' ||
      reqPath === '/chatbot-widget.js' ||
      reqPath === '/mAutomate-widget.js'
    ) {
      const js = getWidgetJs();
      if (js) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).send(js);
        return;
      }
      next();
      return;
    }

    // CORS for widget API routes
    if (reqPath.startsWith('/api/inbox/widget')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
    }

    next();
  };

  // Add the middleware and move it to the front of Express's stack
  // so it runs BEFORE Wasp's router
  context.app.use(widgetMiddleware);
  const appAny = context.app as any;
  const stack = appAny._router?.stack || appAny.router?.stack;
  if (stack && stack.length > 1) {
    const myLayer = stack.pop();
    stack.unshift(myLayer);
  }
};
