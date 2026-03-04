import { type File } from "wasp/entities";
import { HttpError } from "wasp/server";
import {
  type DeleteFile,
  type GetAllFilesByUser,
  type GetDownloadFileSignedURL,
  type GetFileSignedURLsBatch,
  type UploadFile,
} from "wasp/server/operations";

import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import {
  deleteFileFromS3,
  getDownloadFileSignedURLFromS3,
  getS3Key,
  uploadFileToS3,
} from "./s3Utils";
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from "./validation";

export const getAllFilesByUser: GetAllFilesByUser<void, File[]> = async (
  _args,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401);
  }
  return context.entities.File.findMany({
    where: {
      user: {
        id: context.user.id,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getDownloadFileSignedURLInputSchema = z.object({
  s3Key: z.string().nonempty(),
});

type GetDownloadFileSignedURLInput = z.infer<
  typeof getDownloadFileSignedURLInputSchema
>;

export const getDownloadFileSignedURL: GetDownloadFileSignedURL<
  GetDownloadFileSignedURLInput,
  string
> = async (rawArgs, _context) => {
  const { s3Key } = ensureArgsSchemaOrThrowHttpError(
    getDownloadFileSignedURLInputSchema,
    rawArgs,
  );
  return await getDownloadFileSignedURLFromS3({ s3Key });
};

const deleteFileInputSchema = z.object({
  id: z.string(),
});

type DeleteFileInput = z.infer<typeof deleteFileInputSchema>;

export const deleteFile: DeleteFile<DeleteFileInput, File> = async (
  args,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const deletedFile = await context.entities.File.delete({
    where: {
      id: args.id,
      user: {
        id: context.user.id,
      },
    },
  });

  try {
    await deleteFileFromS3({ s3Key: deletedFile.s3Key });
  } catch (error) {
    console.error(
      `S3 deletion failed. Orphaned file s3Key: ${deletedFile.s3Key}`,
      error,
    );
  }

  return deletedFile;
};

const getFileSignedURLsBatchInputSchema = z.object({
  s3Keys: z.array(z.string().nonempty()).max(100),
});

type GetFileSignedURLsBatchInput = z.infer<
  typeof getFileSignedURLsBatchInputSchema
>;

export const getFileSignedURLsBatch: GetFileSignedURLsBatch<
  GetFileSignedURLsBatchInput,
  Record<string, string>
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const { s3Keys } = ensureArgsSchemaOrThrowHttpError(
    getFileSignedURLsBatchInputSchema,
    rawArgs,
  );

  if (s3Keys.length === 0) return {};

  // Verify all s3Keys belong to this user
  const files = await context.entities.File.findMany({
    where: {
      s3Key: { in: s3Keys },
      userId: context.user.id,
    },
    select: { s3Key: true },
  });

  const ownedKeys = new Set(files.map((f) => f.s3Key));

  const entries = await Promise.all(
    s3Keys
      .filter((key) => ownedKeys.has(key))
      .map(async (s3Key) => {
        const url = await getDownloadFileSignedURLFromS3({ s3Key });
        return [s3Key, url] as const;
      }),
  );

  return Object.fromEntries(entries);
};

const uploadFileInputSchema = z.object({
  data: z.string(),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
});

type UploadFileInput = z.infer<typeof uploadFileInputSchema>;

export const uploadFile: UploadFile<UploadFileInput, File> = async (
  rawArgs,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const { data, fileName, fileType } = ensureArgsSchemaOrThrowHttpError(
    uploadFileInputSchema,
    rawArgs,
  );

  if (!ALLOWED_FILE_TYPES.includes(fileType as any)) {
    throw new HttpError(400, `File type '${fileType}' is not supported.`);
  }

  const buffer = Buffer.from(data, "base64");

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new HttpError(400, "File too large.");
  }

  const s3Key = getS3Key(fileName, context.user.id);

  await uploadFileToS3({ buffer, s3Key, contentType: fileType });

  return context.entities.File.create({
    data: {
      name: fileName,
      s3Key,
      type: fileType,
      user: { connect: { id: context.user.id } },
    },
  });
};
