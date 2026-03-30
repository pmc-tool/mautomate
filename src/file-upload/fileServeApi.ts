import { type MiddlewareConfigFn } from 'wasp/server';
import { s3Client } from './s3Utils';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export const fileServeMiddleware: MiddlewareConfigFn = (middlewareConfig) => {
  return middlewareConfig;
};

export const serveFile = async (req: any, res: any, context: any) => {
  const { userId, fileId } = req.params;

  if (!userId || !fileId) {
    res.status(400).json({ error: 'Missing file key' });
    return;
  }

  // fileId may or may not include extension.
  // Build the s3Key prefix and look up from DB to get the exact key.
  const urlKey = `${userId}/${fileId}`;

  try {
    // First try the exact key (if extension is included in URL)
    let s3Key = urlKey;

    // If the URL doesn't have an extension, look up from DB
    if (!fileId.includes('.')) {
      const file = await context.entities.File.findFirst({
        where: { s3Key: { startsWith: urlKey } },
        select: { s3Key: true },
      });
      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }
      s3Key = file.s3Key;
    }

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_FILES_BUCKET!,
      Key: s3Key,
    });

    const response = await s3Client.send(command);

    if (response.ContentType) {
      res.setHeader('Content-Type', response.ContentType);
    }
    if (response.ContentLength) {
      res.setHeader('Content-Length', response.ContentLength);
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    const stream = response.Body as NodeJS.ReadableStream;
    stream.pipe(res);
  } catch (error: any) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      res.status(404).json({ error: 'File not found' });
    } else {
      console.error('[FileServe] ERROR:', error.name, error.message, 'key:', urlKey);
      res.status(500).json({ error: 'Failed to serve file' });
    }
  }
};
