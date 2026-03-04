import { useMemo } from "react";
import { FileImage, FileVideo, FileText, File as FileIcon, Check } from "lucide-react";

interface FileItem {
  id: string;
  name: string;
  type: string;
  s3Key: string;
  createdAt: Date;
}

interface FileGridProps {
  files: FileItem[];
  signedUrlMap: Record<string, string>;
  selectedFileId: string | null;
  onSelect: (file: FileItem) => void;
  searchQuery: string;
  sortBy: "newest" | "oldest" | "name";
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return FileImage;
  if (type.startsWith("video/")) return FileVideo;
  if (type === "application/pdf") return FileText;
  return FileIcon;
}

function formatDate(dateStr: Date) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncateName(name: string, max = 20) {
  if (name.length <= max) return name;
  const ext = name.lastIndexOf(".");
  if (ext > 0) {
    const base = name.slice(0, ext);
    const extension = name.slice(ext);
    const remain = max - extension.length - 3;
    if (remain > 0) return base.slice(0, remain) + "..." + extension;
  }
  return name.slice(0, max - 3) + "...";
}

export function FileGrid({
  files,
  signedUrlMap,
  selectedFileId,
  onSelect,
  searchQuery,
  sortBy,
}: FileGridProps) {
  const filtered = useMemo(() => {
    let result = files;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [files, searchQuery, sortBy]);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        {searchQuery.trim() ? (
          <>
            <FileIcon className="mb-2 h-8 w-8" />
            <p className="text-sm">No files match "{searchQuery}"</p>
          </>
        ) : (
          <>
            <FileIcon className="mb-2 h-8 w-8" />
            <p className="text-sm font-medium">No files yet</p>
            <p className="mt-1 text-xs">Upload your first file using the Upload tab</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
      {filtered.map((file) => {
        const isSelected = selectedFileId === file.id;
        const url = signedUrlMap[file.s3Key];
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");
        const Icon = getFileIcon(file.type);

        return (
          <button
            key={file.id}
            onClick={() => onSelect(file)}
            className={`group relative flex flex-col overflow-hidden rounded-lg border-2 transition-all ${
              isSelected
                ? "border-primary ring-2 ring-primary/30"
                : "border-transparent hover:border-muted-foreground/30"
            }`}
          >
            {/* Thumbnail */}
            <div className="relative aspect-square w-full overflow-hidden bg-muted">
              {isImage && url ? (
                <img
                  src={url}
                  alt={file.name}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              ) : isVideo ? (
                <div className="flex h-full w-full items-center justify-center">
                  <FileVideo className="h-8 w-8 text-muted-foreground" />
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Icon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}

              {/* Selected checkmark */}
              {isSelected && (
                <div className="absolute right-1 top-1 rounded-full bg-primary p-0.5">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </div>

            {/* File info */}
            <div className="p-1.5">
              <p className="truncate text-left text-[11px] font-medium leading-tight" title={file.name}>
                {truncateName(file.name)}
              </p>
              <p className="text-left text-[10px] text-muted-foreground">
                {formatDate(file.createdAt)}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
