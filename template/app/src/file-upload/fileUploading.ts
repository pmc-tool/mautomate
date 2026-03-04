import { api } from "wasp/client/api";
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from "./validation";

type AllowedFileTypes = (typeof ALLOWED_FILE_TYPES)[number];
export type FileWithValidType = File & { type: AllowedFileTypes };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadFileWithProgress({
  file,
  setUploadProgressPercent,
}: {
  file: FileWithValidType;
  setUploadProgressPercent: (percentage: number) => void;
}) {
  const base64Data = await fileToBase64(file);

  // Call the operations endpoint directly to support onUploadProgress.
  // The route goes through /operations/* which has proper CORS handling.
  // Wrap in superjson format ({ json: ... }) as expected by Wasp's deserialize.
  return api.post(
    "/operations/upload-file",
    {
      json: {
        data: base64Data,
        fileName: file.name,
        fileType: file.type,
      },
    },
    {
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentage = Math.round(
            (progressEvent.loaded / progressEvent.total) * 100,
          );
          setUploadProgressPercent(percentage);
        }
      },
    },
  );
}

export function validateFile(file: File): FileWithValidType {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File size exceeds ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB limit.`,
    );
  }

  if (!isFileWithAllowedFileType(file)) {
    throw new Error(`File type '${file.type}' is not supported.`);
  }

  return file;
}

function isFileWithAllowedFileType(file: File): file is FileWithValidType {
  return ALLOWED_FILE_TYPES.includes(file.type as AllowedFileTypes);
}
