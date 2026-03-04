import { useState, useRef, useCallback } from "react";
import { uploadFile } from "wasp/client/operations";
import { validateFile } from "../fileUploading";
import { Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Progress } from "../../client/components/ui/progress";
import { toast } from "../../client/hooks/use-toast";

interface UploadDropZoneProps {
  onUploadComplete: (file: { id: string; name: string; type: string; s3Key: string }) => void;
  accept?: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function UploadDropZone({ onUploadComplete, accept = "image/*,video/*,application/pdf" }: UploadDropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    try {
      validateFile(file);
    } catch (err: any) {
      toast({ title: "Invalid file", description: err.message, variant: "destructive" });
      return;
    }

    setUploading(true);
    setUploadStatus("uploading");
    setProgress(10);

    try {
      const base64Data = await fileToBase64(file);
      setProgress(40);

      const result = await uploadFile({
        data: base64Data,
        fileName: file.name,
        fileType: file.type,
      });
      setProgress(100);
      setUploadStatus("success");

      toast({ title: "Uploaded", description: `${file.name} uploaded successfully.` });
      onUploadComplete(result);

      // Reset after brief success state
      setTimeout(() => {
        setUploadStatus("idle");
        setProgress(0);
      }, 1500);
    } catch (err: any) {
      setUploadStatus("error");
      toast({ title: "Upload failed", description: err?.message ?? "Failed to upload file.", variant: "destructive" });
      setTimeout(() => {
        setUploadStatus("idle");
        setProgress(0);
      }, 2000);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : uploadStatus === "success"
              ? "border-green-400 bg-green-50 dark:bg-green-900/10"
              : uploadStatus === "error"
                ? "border-red-400 bg-red-50 dark:bg-red-900/10"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
        }`}
      >
        {uploadStatus === "uploading" ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : uploadStatus === "success" ? (
          <CheckCircle className="h-8 w-8 text-green-500" />
        ) : uploadStatus === "error" ? (
          <AlertCircle className="h-8 w-8 text-red-500" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground" />
        )}

        <div className="text-center">
          <p className="text-sm font-medium">
            {uploadStatus === "uploading"
              ? "Uploading..."
              : uploadStatus === "success"
                ? "Upload complete!"
                : uploadStatus === "error"
                  ? "Upload failed"
                  : "Drag files here or click to browse"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Images, videos, PDFs up to 5MB
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
        />
      </div>

      {uploadStatus === "uploading" && (
        <Progress value={progress} className="h-2" />
      )}
    </div>
  );
}
