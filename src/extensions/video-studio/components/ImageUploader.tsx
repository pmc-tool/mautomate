import { useState, useRef, useCallback } from "react";
import { uploadFile, getDownloadFileSignedURL } from "wasp/client/operations";
import { cn } from "../../../client/utils";
import { Button } from "../../../client/components/ui/button";
import { Progress } from "../../../client/components/ui/progress";
import { Upload, Loader2, X, ImageIcon } from "lucide-react";

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  label?: string;
  description?: string;
  className?: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ImageUploader({
  value,
  onChange,
  label = "Upload Image",
  description = "Drag & drop an image or click to browse",
  className,
}: ImageUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const file = files[0];
      if (!file.type.startsWith("image/")) return;

      // Local preview
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);
      setUploading(true);
      setProgress(10);

      try {
        const base64Data = await fileToBase64(file);
        setProgress(40);

        const result = await uploadFile({
          data: base64Data,
          fileName: file.name,
          fileType: file.type,
        });
        setProgress(80);

        // Get signed URL for fal.ai
        const signedUrl = await getDownloadFileSignedURL({ s3Key: result.s3Key });
        setProgress(100);

        setPreviewUrl(signedUrl);
        onChange(signedUrl);
      } catch {
        setPreviewUrl(null);
        onChange(undefined);
      } finally {
        setUploading(false);
        setProgress(0);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onChange],
  );

  const handleRemove = () => {
    setPreviewUrl(null);
    onChange(undefined);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-foreground text-sm font-medium">{label}</label>
      )}

      {previewUrl && !uploading ? (
        <div className="relative inline-block">
          <img
            src={previewUrl}
            alt="Upload preview"
            className="h-40 max-w-full rounded-lg border object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -right-2 -top-2 h-6 w-6"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onClick={() => !uploading && inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
          )}
        >
          {uploading ? (
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
          ) : (
            <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
              <ImageIcon className="text-muted-foreground h-6 w-6" />
            </div>
          )}
          <div className="text-center">
            <p className="text-foreground text-sm font-medium">
              {uploading ? "Uploading..." : description}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              PNG, JPG, WebP up to 5MB
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={uploading}
          />
        </div>
      )}

      {uploading && <Progress value={progress} className="h-1.5" />}
    </div>
  );
}
