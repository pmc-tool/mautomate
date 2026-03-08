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

// Persistent directory for stitched story videos
const STORY_VIDEOS_DIR = path.resolve(
  process.env.STORY_VIDEOS_DIR || path.join(process.cwd(), '..', '..', '..', 'story-videos')
);

export const serverSetup = (context: { app: Application }) => {
  // Pre-load widget JS into memory
  getWidgetJs();

  // Ensure story videos directory exists
  try {
    fs.mkdirSync(STORY_VIDEOS_DIR, { recursive: true });
    console.log(`[serverSetup] Story videos directory: ${STORY_VIDEOS_DIR}`);
  } catch (err) {
    console.warn(`[serverSetup] Could not create story videos dir: ${err}`);
  }

  const widgetMiddleware = (req: any, res: any, next: any) => {
    const reqPath: string = req.path || '';

    // Serve stitched story videos: /api/story-video/:projectId.mp4
    const storyVideoMatch = reqPath.match(/^\/api\/story-video\/([a-zA-Z0-9_-]+)\.mp4$/);
    if (storyVideoMatch) {
      const projectId = storyVideoMatch[1];
      const videoPath = path.join(STORY_VIDEOS_DIR, `${projectId}.mp4`);
      try {
        if (fs.existsSync(videoPath)) {
          const stat = fs.statSync(videoPath);
          res.setHeader('Content-Type', 'video/mp4');
          res.setHeader('Content-Length', stat.size);
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Cache-Control', 'public, max-age=86400');

          // Support range requests for video seeking
          const range = req.headers.range;
          if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
            res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
            res.setHeader('Content-Length', end - start + 1);
            res.status(206);
            fs.createReadStream(videoPath, { start, end }).pipe(res);
          } else {
            res.status(200);
            fs.createReadStream(videoPath).pipe(res);
          }
          return;
        }
      } catch (err) {
        console.error(`[serverSetup] Error serving story video: ${err}`);
      }
      res.status(404).json({ error: 'Video not found' });
      return;
    }

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

// Export for use in stitching operations
export { STORY_VIDEOS_DIR };
