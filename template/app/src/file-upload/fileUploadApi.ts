import express from 'express';
import { type MiddlewareConfigFn } from 'wasp/server';
import { uploadFileToS3, getS3Key } from './s3Utils';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from './validation';

export const fileUploadMiddleware: MiddlewareConfigFn = (middlewareConfig) => {
  // Replace the default JSON body parser with a raw parser so we receive
  // the file as a Buffer instead of parsed JSON.
  middlewareConfig.set('express.json', express.raw({ type: '*/*', limit: '6mb' }));
  return middlewareConfig;
};

export const fileUploadProxy = async (req: any, res: any, context: any) => {
  if (!context.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const rawFileName = req.headers['x-file-name'] as string;
  const fileName = rawFileName ? decodeURIComponent(rawFileName) : '';
  const fileType = req.headers['content-type'] as string;

  if (!fileName || !fileType) {
    res.status(400).json({ error: 'Missing file name or type' });
    return;
  }

  if (!ALLOWED_FILE_TYPES.includes(fileType as any)) {
    res.status(400).json({ error: 'Invalid file type' });
    return;
  }

  const buffer = req.body as Buffer;
  if (!buffer || buffer.length === 0) {
    res.status(400).json({ error: 'No file data received' });
    return;
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    res.status(400).json({ error: 'File too large' });
    return;
  }

  const s3Key = getS3Key(fileName, context.user.id);

  try {
    await uploadFileToS3({ buffer, s3Key, contentType: fileType });
  } catch (error) {
    console.error('S3 upload failed:', error);
    res.status(500).json({ error: 'Failed to upload file to storage' });
    return;
  }

  const file = await context.entities.File.create({
    data: {
      name: fileName,
      s3Key,
      type: fileType,
      user: { connect: { id: context.user.id } },
    },
  });

  res.json(file);
};
