import { useEffect, useState, useRef, useCallback } from "react";
import {
  deleteFile,
  getAllFilesByUser,
  getDownloadFileSignedURL,
  uploadFile,
  useQuery,
} from "wasp/client/operations";
import { api } from "wasp/client/api";
import { type AuthUser } from "wasp/auth";
import type { File } from "wasp/entities";

import {
  Download,
  FileText,
  Film,
  Trash2,
  Upload,
  Image as ImageIcon,
  Search,
  Grid3X3,
  List,
  FolderOpen,
  Loader2,
  CheckCircle,
  Eye,
  HardDrive,
  FileImage,
  FileVideo,
  File as FileIcon,
  CloudUpload,
  MoreVertical,
  X,
} from "lucide-react";
import { Button } from "../client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../client/components/ui/dialog";
import { Input } from "../client/components/ui/input";
import { Badge } from "../client/components/ui/badge";
import { Progress } from "../client/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../client/components/ui/dropdown-menu";
import { toast } from "../client/hooks/use-toast";
import { cn } from "../client/utils";
import UserDashboardLayout from "../user-dashboard/layout/UserDashboardLayout";
import { validateFile } from "./fileUploading";
import { ALLOWED_FILE_TYPES } from "./validation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isImageFile = (type: string) => type.startsWith("image/");
const isVideoFile = (type: string) => type.startsWith("video/");

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getFileExtension(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toUpperCase() : "";
}

function fileToBase64(file: globalThis.File): Promise<string> {
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

async function fetchSignedUrl(s3Key: string): Promise<string> {
  const res = await api.post("/operations/get-download-file-signed-url", {
    json: { s3Key },
  });
  return res.data.json;
}

type ViewMode = "grid" | "list";
type FilterType = "all" | "images" | "videos" | "documents";

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function FileUploadPage({ user }: { user: AuthUser }) {
  const [fileKeyForS3, setFileKeyForS3] = useState<File["s3Key"]>("");
  const [fileToDelete, setFileToDelete] = useState<Pick<File, "id" | "s3Key" | "name"> | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allUserFiles = useQuery(getAllFilesByUser, undefined, { enabled: false });
  const { isLoading: isDownloadUrlLoading, refetch: refetchDownloadUrl } = useQuery(
    getDownloadFileSignedURL,
    { s3Key: fileKeyForS3 },
    { enabled: false },
  );

  // Fetch preview URLs
  useEffect(() => {
    if (!allUserFiles.data) return;
    const imageFiles = allUserFiles.data.filter((f) => isImageFile(f.type));
    const missing = imageFiles.filter((f) => !previewUrls[f.s3Key]);
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(
      missing.map(async (f) => {
        try {
          const url = await fetchSignedUrl(f.s3Key);
          return { s3Key: f.s3Key, url };
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      const newUrls: Record<string, string> = {};
      for (const r of results) if (r) newUrls[r.s3Key] = r.url;
      if (Object.keys(newUrls).length > 0) setPreviewUrls((prev) => ({ ...prev, ...newUrls }));
    });
    return () => { cancelled = true; };
  }, [allUserFiles.data]);

  useEffect(() => { allUserFiles.refetch(); }, []);

  // Download handler
  useEffect(() => {
    if (fileKeyForS3.length > 0) {
      refetchDownloadUrl()
        .then((urlQuery) => {
          if (urlQuery.status === "success") window.open(urlQuery.data, "_blank");
          else toast({ title: "Error fetching download link", variant: "destructive" });
        })
        .finally(() => setFileKeyForS3(""));
    }
  }, [fileKeyForS3]);

  // File upload handler
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      validateFile(file);
    } catch (err: any) {
      toast({ title: "Invalid file", description: err.message, variant: "destructive" });
      return;
    }
    setUploading(true);
    setUploadProgress(20);
    try {
      const base64Data = await fileToBase64(file);
      setUploadProgress(50);
      await uploadFile({ data: base64Data, fileName: file.name, fileType: file.type });
      setUploadProgress(100);
      toast({ title: "Uploaded", description: `${file.name} uploaded successfully.` });
      allUserFiles.refetch();
      setTimeout(() => { setUploadProgress(0); setUploading(false); }, 800);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message ?? "Failed to upload.", variant: "destructive" });
      setUploading(false);
      setUploadProgress(0);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleDelete = async ({ id, name }: Pick<File, "id" | "name">) => {
    try {
      await deleteFile({ id });
      toast({ title: "Deleted", description: `${name} has been removed.` });
      allUserFiles.refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Error deleting file.", variant: "destructive" });
    } finally {
      setFileToDelete(null);
    }
  };

  // Filter + search
  const files = allUserFiles.data || [];
  const filteredFiles = files.filter((f) => {
    if (filterType === "images" && !isImageFile(f.type)) return false;
    if (filterType === "videos" && !isVideoFile(f.type)) return false;
    if (filterType === "documents" && (isImageFile(f.type) || isVideoFile(f.type))) return false;
    if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Stats
  const imageCount = files.filter((f) => isImageFile(f.type)).length;
  const videoCount = files.filter((f) => isVideoFile(f.type)).length;
  const docCount = files.filter((f) => !isImageFile(f.type) && !isVideoFile(f.type)).length;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  return (
    <UserDashboardLayout user={user}>
      <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto">

        {/* Page Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">File Manager</h1>
            <p className="text-sm text-muted-foreground">
              Upload, organize, and manage your media files
            </p>
          </div>
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2 self-start">
            <CloudUpload className="h-4 w-4" />
            Upload File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={ALLOWED_FILE_TYPES.join(",")}
            onChange={(e) => handleFileUpload(e.target.files)}
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Total Files", value: files.length, icon: HardDrive, color: "text-blue-500" },
            { label: "Images", value: imageCount, icon: FileImage, color: "text-emerald-500" },
            { label: "Videos", value: videoCount, icon: FileVideo, color: "text-purple-500" },
            { label: "Documents", value: docCount, icon: FileIcon, color: "text-orange-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg bg-muted", color)}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Upload Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={cn(
            "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-all duration-200",
            dragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : uploading
                ? "border-primary/50 bg-primary/5"
                : "border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30",
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Uploading...</p>
              <Progress value={uploadProgress} className="h-1.5 w-48" />
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground/60" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drop files here or <span className="text-primary">browse</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  PNG, JPG, MP4, PDF up to 5MB
                </p>
              </div>
            </>
          )}
        </div>

        {/* Toolbar: Filters + Search + View Toggle */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            {(
              [
                { id: "all", label: "All", count: files.length },
                { id: "images", label: "Images", count: imageCount },
                { id: "videos", label: "Videos", count: videoCount },
                { id: "documents", label: "Docs", count: docCount },
              ] as const
            ).map(({ id, label, count }) => (
              <button
                key={id}
                onClick={() => setFilterType(id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  filterType === id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] leading-none",
                  filterType === id ? "bg-primary/10 text-primary" : "bg-muted-foreground/10",
                )}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center rounded-lg border">
              <button
                onClick={() => setViewMode("grid")}
                className={cn("p-1.5 transition-colors", viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn("p-1.5 transition-colors", viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* File Grid / List */}
        {allUserFiles.isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Loading files...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <FolderOpen className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <h3 className="mt-4 text-sm font-semibold">No files found</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {searchQuery ? "Try a different search term" : "Upload your first file to get started"}
            </p>
            {!searchQuery && (
              <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" />
                Upload
              </Button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* ---- Grid View ---- */
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md hover:border-primary/30"
              >
                {/* Thumbnail */}
                <div
                  className="relative aspect-square cursor-pointer bg-muted/50"
                  onClick={() => {
                    if (isImageFile(file.type) && previewUrls[file.s3Key]) {
                      setPreviewFile({ name: file.name, url: previewUrls[file.s3Key] });
                    }
                  }}
                >
                  {isImageFile(file.type) && previewUrls[file.s3Key] ? (
                    <img
                      src={previewUrls[file.s3Key]}
                      alt={file.name}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                      {isImageFile(file.type) ? (
                        <div className="h-8 w-8 animate-pulse rounded bg-muted-foreground/20" />
                      ) : isVideoFile(file.type) ? (
                        <Film className="h-10 w-10 text-purple-400" />
                      ) : (
                        <FileText className="h-10 w-10 text-orange-400" />
                      )}
                      <Badge variant="secondary" className="text-[10px]">
                        {getFileExtension(file.name)}
                      </Badge>
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    {isImageFile(file.type) && previewUrls[file.s3Key] && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewFile({ name: file.name, url: previewUrls[file.s3Key] });
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-800 hover:bg-white transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setFileKeyForS3(file.s3Key); }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-800 hover:bg-white transition-colors"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFileToDelete(file); }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-600 hover:bg-white transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* File info */}
                <div className="px-2.5 py-2">
                  <p className="truncate text-xs font-medium" title={file.name}>{file.name}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {formatDate(file.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ---- List View ---- */
          <div className="rounded-xl border divide-y">
            {/* Header */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_100px_120px_80px] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
              <span>Name</span>
              <span>Type</span>
              <span>Date</span>
              <span className="text-right">Actions</span>
            </div>
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group"
              >
                {/* Thumbnail */}
                <div className="h-9 w-9 flex-shrink-0 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                  {isImageFile(file.type) && previewUrls[file.s3Key] ? (
                    <img
                      src={previewUrls[file.s3Key]}
                      alt={file.name}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover cursor-pointer"
                      onClick={() => setPreviewFile({ name: file.name, url: previewUrls[file.s3Key] })}
                    />
                  ) : isVideoFile(file.type) ? (
                    <Film className="h-4 w-4 text-purple-400" />
                  ) : (
                    <FileText className="h-4 w-4 text-orange-400" />
                  )}
                </div>

                {/* Name */}
                <p className="min-w-0 flex-1 truncate text-sm font-medium" title={file.name}>
                  {file.name}
                </p>

                {/* Type badge */}
                <Badge variant="secondary" className="hidden sm:flex text-[10px] font-normal shrink-0">
                  {getFileExtension(file.name) || file.type.split("/")[1]?.toUpperCase()}
                </Badge>

                {/* Date */}
                <span className="hidden sm:block w-[120px] text-xs text-muted-foreground shrink-0">
                  {formatDate(file.createdAt)}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setFileKeyForS3(file.s3Key)}
                    className="rounded-md p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-foreground transition-all"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      {isImageFile(file.type) && previewUrls[file.s3Key] && (
                        <DropdownMenuItem onClick={() => setPreviewFile({ name: file.name, url: previewUrls[file.s3Key] })}>
                          <Eye className="mr-2 h-3.5 w-3.5" />
                          Preview
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setFileKeyForS3(file.s3Key)}>
                        <Download className="mr-2 h-3.5 w-3.5" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFileToDelete(file)} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {fileToDelete && (
        <Dialog open={!!fileToDelete} onOpenChange={(isOpen) => !isOpen && setFileToDelete(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete file</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{fileToDelete.name}</strong>? This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setFileToDelete(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(fileToDelete)}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Image Preview */}
      {previewFile && (
        <Dialog open={!!previewFile} onOpenChange={(isOpen) => !isOpen && setPreviewFile(null)}>
          <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="text-sm font-medium truncate">{previewFile.name}</p>
              <button onClick={() => setPreviewFile(null)} className="rounded-md p-1 hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-center bg-muted/20 p-4">
              <img
                src={previewFile.url}
                alt={previewFile.name}
                referrerPolicy="no-referrer"
                className="max-h-[70vh] w-auto rounded-md object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </UserDashboardLayout>
  );
}
