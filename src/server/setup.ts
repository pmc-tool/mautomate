import type { Application } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from 'wasp/server';
import { getAllBranding } from '../branding/brandingService.js';
import { getDownloadFileSignedURLFromS3, s3Client } from '../file-upload/s3Utils.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';

// ---------------------------------------------------------------------------
// Read app version from VERSION file at startup
// ---------------------------------------------------------------------------
let appVersion = 'unknown';
try {
  const versionPath = path.resolve(process.cwd(), '..', '..', '..', 'VERSION');
  appVersion = fs.readFileSync(versionPath, 'utf-8').trim();
} catch {
  // VERSION file not found — leave as 'unknown'
}

const serverStartTime = Date.now();

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

  // -----------------------------------------------------------------------
  // A1: Health check endpoint — GET /api/health
  // -----------------------------------------------------------------------
  context.app.get('/api/health', async (_req, res) => {
    let dbStatus = 'connected';
    try {
      await prisma.$queryRawUnsafe('SELECT 1');
    } catch {
      dbStatus = 'error';
    }
    const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);
    res.json({
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      uptime: uptimeSeconds,
      db: dbStatus,
      version: appVersion,
      timestamp: new Date().toISOString(),
    });
  });

  // Ensure story videos directory exists
  try {
    fs.mkdirSync(STORY_VIDEOS_DIR, { recursive: true });
    console.log(`[serverSetup] Story videos directory: ${STORY_VIDEOS_DIR}`);
  } catch (err) {
    console.warn(`[serverSetup] Could not create story videos dir: ${err}`);
  }

  // Helper: verify download token for story video/image endpoints
  async function verifyStoryDownloadToken(projectId: string, token: string | undefined): Promise<boolean> {
    if (!token) return false;
    try {
      const project = await prisma.storyProject.findUnique({
        where: { id: projectId },
        select: { metadata: true },
      });
      if (!project?.metadata) return false;
      const meta = project.metadata as Record<string, unknown>;
      return typeof meta.downloadToken === 'string' && meta.downloadToken === token;
    } catch {
      return false;
    }
  }

  const widgetMiddleware = (req: any, res: any, next: any) => {
    const reqPath: string = req.path || '';

    // Serve reference frame images: /api/story-video/:projectId.jpg
    const storyImageMatch = reqPath.match(/^\/api\/story-video\/([a-zA-Z0-9_-]+)\.jpg$/);
    if (storyImageMatch) {
      const projectId = storyImageMatch[1];
      const token = req.query?.token;
      verifyStoryDownloadToken(projectId, token).then((valid) => {
        if (!valid) {
          res.status(403).json({ error: 'Invalid or missing download token' });
          return;
        }
        const imgPath = path.join(STORY_VIDEOS_DIR, `${projectId}.jpg`);
        try {
          if (fs.existsSync(imgPath)) {
            const stat = fs.statSync(imgPath);
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Content-Length', stat.size);
            res.setHeader('Cache-Control', 'private, max-age=86400');
            res.status(200);
            fs.createReadStream(imgPath).pipe(res);
            return;
          }
        } catch (err) {
          console.error(`[serverSetup] Error serving reference image: ${err}`);
        }
        res.status(404).json({ error: 'Image not found' });
      }).catch(() => {
        res.status(500).json({ error: 'Internal error' });
      });
      return;
    }

    // Public share endpoint: /api/story-video/share/:projectId.mp4 (no token, streaming only)
    const shareVideoMatch = reqPath.match(/^\/api\/story-video\/share\/([a-zA-Z0-9_-]+)\.mp4$/);
    if (shareVideoMatch) {
      const projectId = shareVideoMatch[1];
      // Verify project exists and is completed (public share only for finished videos)
      prisma.storyProject.findUnique({
        where: { id: projectId },
        select: { status: true },
      }).then((project) => {
        if (!project || project.status !== 'completed') {
          res.status(404).json({ error: 'Video not found or not yet available' });
          return;
        }
        const videoPath = path.join(STORY_VIDEOS_DIR, `${projectId}.mp4`);
        try {
          if (fs.existsSync(videoPath)) {
            const stat = fs.statSync(videoPath);
            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Content-Length', stat.size);
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Cache-Control', 'public, max-age=86400');
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
          console.error(`[serverSetup] Error serving shared story video: ${err}`);
        }
        res.status(404).json({ error: 'Video not found' });
      }).catch(() => {
        res.status(500).json({ error: 'Internal error' });
      });
      return;
    }

    // Serve stitched story videos: /api/story-video/:projectId.mp4
    const storyVideoMatch = reqPath.match(/^\/api\/story-video\/([a-zA-Z0-9_-]+)\.mp4$/);
    if (storyVideoMatch) {
      const projectId = storyVideoMatch[1];
      const token = req.query?.token;
      verifyStoryDownloadToken(projectId, token).then((valid) => {
        if (!valid) {
          res.status(403).json({ error: 'Invalid or missing download token' });
          return;
        }
        const videoPath = path.join(STORY_VIDEOS_DIR, `${projectId}.mp4`);
        try {
          if (fs.existsSync(videoPath)) {
            const stat = fs.statSync(videoPath);
            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Content-Length', stat.size);
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Cache-Control', 'private, max-age=86400');

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
      }).catch(() => {
        res.status(500).json({ error: 'Internal error' });
      });
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

  // -----------------------------------------------------------------------
  // Branding asset redirect endpoints
  // -----------------------------------------------------------------------
  const brandingAssetMiddleware = async (req: any, res: any, next: any) => {
    const reqPath: string = req.path || '';

    // /api/branding/logo, /api/branding/favicon, /api/branding/og-image
    // Proxies S3 images through the server to avoid Cloudflare hotlink protection
    // blocking direct S3 signed URLs when loaded from <img> tags with Referer headers.
    const brandingMatch = reqPath.match(/^\/api\/branding\/(logo|favicon|og-image)$/);
    if (brandingMatch) {
      try {
        const assetType = brandingMatch[1]; // logo | favicon | og-image
        const branding = await getAllBranding();

        let s3Key = '';
        let directUrl = '';
        if (assetType === 'logo') {
          s3Key = branding['branding.logo_s3key'] || '';
          directUrl = branding['branding.logo_url'] || '';
        } else if (assetType === 'favicon') {
          s3Key = branding['branding.favicon_s3key'] || '';
          directUrl = branding['branding.favicon_url'] || '';
        } else if (assetType === 'og-image') {
          s3Key = branding['branding.og_image_s3key'] || '';
          directUrl = branding['branding.og_image_url'] || '';
        }

        // If S3 key exists, proxy the image through the server
        if (s3Key) {
          const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_FILES_BUCKET,
            Key: s3Key,
          });
          const s3Response = await s3Client.send(command);
          const contentType = s3Response.ContentType || 'image/png';
          res.setHeader('Content-Type', contentType);
          if (s3Response.ContentLength) {
            res.setHeader('Content-Length', s3Response.ContentLength);
          }
          // Cache for 1 hour — matches signed URL expiry
          res.setHeader('Cache-Control', 'public, max-age=3600');
          res.status(200);
          const stream = s3Response.Body as NodeJS.ReadableStream;
          stream.pipe(res);
          return;
        }

        // If direct URL exists, redirect to it
        if (directUrl) {
          res.redirect(302, directUrl);
          return;
        }

        // Fallback: serve static public-banner.webp for og-image if nothing configured
        if (assetType === 'og-image') {
          const buildDir = path.resolve(process.cwd(), '..', '..', '..', 'build');
          const fallback = path.join(buildDir, 'public-banner.webp');
          if (fs.existsSync(fallback)) {
            res.setHeader('Content-Type', 'image/webp');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.status(200);
            fs.createReadStream(fallback).pipe(res);
            return;
          }
        }

        res.status(404).json({ error: 'No branding asset configured' });
        return;
      } catch (err) {
        console.error(`[serverSetup] Error serving branding asset: ${err}`);
        res.status(500).json({ error: 'Failed to load branding asset' });
        return;
      }
    }

    next();
  };

  // -----------------------------------------------------------------------
  // Dynamic meta tag injection middleware (for SPA HTML requests)
  // -----------------------------------------------------------------------
  let indexHtmlCache: string | null = null;

  const metaTagMiddleware = async (req: any, res: any, next: any) => {
    const reqPath: string = req.path || '';

    // Only intercept HTML page requests (not API, not static assets)
    if (
      req.method !== 'GET' ||
      reqPath.startsWith('/api/') ||
      reqPath.startsWith('/auth/') ||
      reqPath.match(/\.\w{2,5}$/) // skip files with extensions (.js, .css, .png, etc.)
    ) {
      return next();
    }

    const accept = req.headers.accept || '';
    if (!accept.includes('text/html')) {
      return next();
    }

    try {
      // Read the built index.html (cache in memory)
      if (!indexHtmlCache) {
        // Server cwd is .wasp/out/server — client build is at ../client/public
        const clientBuildDir = path.resolve(process.cwd(), '..', 'client', 'dist');
        const indexPath = path.join(clientBuildDir, 'index.html');
        if (fs.existsSync(indexPath)) {
          indexHtmlCache = fs.readFileSync(indexPath, 'utf-8');
        }
      }

      if (!indexHtmlCache) {
        return next();
      }

      const branding = await getAllBranding();
      let html = indexHtmlCache;

      const metaTitle = branding['branding.meta_title'] || 'mAutomate';
      const metaDesc = branding['branding.meta_description'] || '';
      const ogTitle = branding['branding.og_title'] || metaTitle;
      const ogDesc = branding['branding.og_description'] || metaDesc;
      const ogUrl = branding['branding.og_url'] || '';
      const twitterCard = branding['branding.twitter_card'] || 'summary_large_image';
      const keywords = branding['branding.keywords'] || '';
      const faviconUrl = (branding['branding.favicon_url'] || branding['branding.favicon_s3key']) ? '/api/branding/favicon' : '';

      // Determine OG image URL — use stable /api/branding/og-image endpoint
      const hasOgImage = branding['branding.og_image_s3key'] || branding['branding.og_image_url'];
      const ogImageUrl = hasOgImage ? `${ogUrl}/api/branding/og-image` : '';

      // Replace <title>
      html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(metaTitle)}</title>`);

      // Replace meta description
      html = html.replace(
        /<meta\s+name=['"]description['"][^>]*>/i,
        `<meta name="description" content="${escapeAttr(metaDesc)}">`
      );

      // Replace meta keywords
      html = html.replace(
        /<meta\s+name=['"]keywords['"][^>]*>/i,
        `<meta name="keywords" content="${escapeAttr(keywords)}">`
      );

      // Replace meta author
      html = html.replace(
        /<meta\s+name=['"]author['"][^>]*>/i,
        `<meta name="author" content="${escapeAttr(metaTitle)}">`
      );

      // Replace OG tags
      html = html.replace(/<meta\s+property=['"]og:title['"][^>]*>/i, `<meta property="og:title" content="${escapeAttr(ogTitle)}">`);
      html = html.replace(/<meta\s+property=['"]og:site_name['"][^>]*>/i, `<meta property="og:site_name" content="${escapeAttr(metaTitle)}">`);
      html = html.replace(/<meta\s+property=['"]og:url['"][^>]*>/i, `<meta property="og:url" content="${escapeAttr(ogUrl)}">`);
      html = html.replace(/<meta\s+property=['"]og:description['"][^>]*>/i, `<meta property="og:description" content="${escapeAttr(ogDesc)}">`);

      if (ogImageUrl) {
        html = html.replace(/<meta\s+property=['"]og:image['"][^>]*>/i, `<meta property="og:image" content="${escapeAttr(ogImageUrl)}">`);
        html = html.replace(/<meta\s+name=['"]twitter:image['"][^>]*>/i, `<meta name="twitter:image" content="${escapeAttr(ogImageUrl)}">`);
      }

      html = html.replace(/<meta\s+name=['"]twitter:card['"][^>]*>/i, `<meta name="twitter:card" content="${escapeAttr(twitterCard)}">`);

      // Replace favicon if configured
      if (faviconUrl) {
        html = html.replace(/<link\s+rel=['"]icon['"][^>]*>/i, `<link rel="icon" type="image/png" href="${escapeAttr(faviconUrl)}">`);
      }

      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(html);
    } catch (err) {
      console.error('[serverSetup] Meta tag injection error:', err);
      // Fall through to default Wasp handler on error
      next();
    }
  };

  // -----------------------------------------------------------------------
  // C1: Client error report endpoint — POST /api/error-report
  // -----------------------------------------------------------------------
  context.app.post('/api/error-report', async (req, res) => {
    try {
      const { message, stack, url } = req.body || {};
      const errorDetail = [message, stack, url ? `URL: ${url}` : ''].filter(Boolean).join('\n');
      await prisma.logs.create({
        data: {
          message: `[Client Error] ${(message || 'Unknown error').slice(0, 500)}`,
          level: 'error',
        },
      });
      console.error('[Client Error Report]', errorDetail.slice(0, 1000));
    } catch (err) {
      console.error('[errorReport] Failed to log client error:', err);
    }
    res.status(200).json({ ok: true });
  });

  // Add the middleware and move it to the front of Express's stack
  // so it runs BEFORE Wasp's router
  context.app.use(widgetMiddleware);
  context.app.use(brandingAssetMiddleware);
  context.app.use(metaTagMiddleware);
  const appAny = context.app as any;
  const stack = appAny._router?.stack || appAny.router?.stack;
  if (stack && stack.length > 1) {
    // Move the last 3 middleware layers (widget, branding, meta) to front
    const meta = stack.pop();
    const brandingAsset = stack.pop();
    const widget = stack.pop();
    stack.unshift(meta);
    stack.unshift(brandingAsset);
    stack.unshift(widget);
  }

  // -----------------------------------------------------------------------
  // C1: Global error handler — catches unhandled errors in Express
  // -----------------------------------------------------------------------
  context.app.use((err: any, req: any, res: any, next: any) => {
    if (res.headersSent) {
      return next(err);
    }
    const message = err?.message || 'Internal Server Error';
    const statusCode = err?.statusCode || err?.status || 500;

    // Log to DB (fire-and-forget)
    prisma.logs.create({
      data: {
        message: `[${statusCode}] ${req.method} ${req.path} — ${message}`.slice(0, 2000),
        level: 'error',
      },
    }).catch(() => {});

    console.error(`[ErrorHandler] ${req.method} ${req.path}`, err?.stack || message);

    if (statusCode >= 500) {
      res.status(statusCode).json({ error: 'Internal Server Error' });
    } else {
      next(err);
    }
  });
};

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Export for use in stitching operations
export { STORY_VIDEOS_DIR };
