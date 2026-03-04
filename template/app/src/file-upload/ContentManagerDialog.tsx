import { useState, useEffect, useMemo, useCallback } from "react";
import {
  useQuery,
  getAllFilesByUser,
  uploadPostMedia,
} from "wasp/client/operations";
import { api } from "wasp/client/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../client/components/ui/dialog";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../client/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../client/components/ui/select";
import { toast } from "../client/hooks/use-toast";
import {
  Upload,
  ImageIcon,
  VideoIcon,
  Files,
  Search,
  Loader2,
  Check,
} from "lucide-react";
import { UploadDropZone } from "./components/UploadDropZone";
import { FileGrid } from "./components/FileGrid";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContentManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "postMedia" | "url";
  // For "postMedia" mode
  postType?: "social" | "seo";
  postId?: string;
  onPostMediaCreated?: () => void;
  // For "url" mode
  onFileSelected?: (fileUrl: string) => void;
  // Optional filters
  acceptTypes?: ("image" | "video" | "other")[];
  defaultTab?: "upload" | "images" | "videos" | "other";
}

interface FileItem {
  id: string;
  name: string;
  type: string;
  s3Key: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContentManagerDialog({
  open,
  onOpenChange,
  mode,
  postType,
  postId,
  onPostMediaCreated,
  onFileSelected,
  acceptTypes,
  defaultTab = "upload",
}: ContentManagerDialogProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [signedUrlMap, setSignedUrlMap] = useState<Record<string, string>>({});
  const [urlsLoading, setUrlsLoading] = useState(false);

  // Fetch all user files
  const {
    data: files,
    isLoading: filesLoading,
    refetch: refetchFiles,
  } = useQuery(getAllFilesByUser, undefined, { enabled: open });

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
      setSelectedFile(null);
      setSearchQuery("");
      setSortBy("newest");
      setSelecting(false);
    } else {
      setSignedUrlMap({});
    }
  }, [open, defaultTab]);

  // Fetch signed URLs when files change (use raw API like FileUploadPage)
  useEffect(() => {
    if (!files || files.length === 0) return;

    // Only fetch URLs for files we don't have yet
    const missing = (files as FileItem[]).filter((f) => !signedUrlMap[f.s3Key]);
    if (missing.length === 0) return;

    let cancelled = false;
    setUrlsLoading(true);

    Promise.all(
      missing.map(async (f) => {
        try {
          const res = await api.post("/operations/get-download-file-signed-url", {
            json: { s3Key: f.s3Key },
          });
          return { s3Key: f.s3Key, url: res.data.json as string };
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      const newUrls: Record<string, string> = {};
      for (const r of results) {
        if (r) newUrls[r.s3Key] = r.url;
      }
      if (Object.keys(newUrls).length > 0) {
        setSignedUrlMap((prev) => ({ ...prev, ...newUrls }));
      }
    }).finally(() => {
      if (!cancelled) setUrlsLoading(false);
    });

    return () => { cancelled = true; };
  }, [files]);

  // Categorize files
  const { images, videos, other } = useMemo(() => {
    if (!files) return { images: [], videos: [], other: [] };
    const imgs: FileItem[] = [];
    const vids: FileItem[] = [];
    const oth: FileItem[] = [];
    for (const f of files as FileItem[]) {
      if (f.type.startsWith("image/")) imgs.push(f);
      else if (f.type.startsWith("video/")) vids.push(f);
      else oth.push(f);
    }
    return { images: imgs, videos: vids, other: oth };
  }, [files]);

  // Determine which tabs to show
  const showImages = !acceptTypes || acceptTypes.includes("image");
  const showVideos = !acceptTypes || acceptTypes.includes("video");
  const showOther = !acceptTypes || acceptTypes.includes("other");

  // Handle file selection
  const handleSelect = useCallback(async () => {
    if (!selectedFile) return;

    const url = signedUrlMap[selectedFile.s3Key];
    if (!url) {
      toast({ title: "Error", description: "Could not get file URL. Try again.", variant: "destructive" });
      return;
    }

    setSelecting(true);

    if (mode === "postMedia") {
      if (!postType || !postId) {
        toast({ title: "Error", description: "Missing post info.", variant: "destructive" });
        setSelecting(false);
        return;
      }
      try {
        const mediaType = selectedFile.type.startsWith("video/") ? "video" : "image";
        await uploadPostMedia({
          postType,
          postId,
          type: mediaType,
          fileUrl: url,
        });
        toast({ title: "Added", description: "File added to post." });
        onPostMediaCreated?.();
        onOpenChange(false);
      } catch (err: any) {
        toast({ title: "Error", description: err?.message ?? "Failed to add file.", variant: "destructive" });
      }
    } else {
      // "url" mode
      onFileSelected?.(url);
      onOpenChange(false);
    }

    setSelecting(false);
  }, [selectedFile, signedUrlMap, mode, postType, postId, onPostMediaCreated, onFileSelected, onOpenChange]);

  // Handle upload complete — refresh files, switch to relevant tab
  const handleUploadComplete = useCallback(
    (file: { id: string; name: string; type: string; s3Key: string }) => {
      refetchFiles();
      // Auto-switch to the appropriate category tab
      if (file.type.startsWith("image/")) setActiveTab("images");
      else if (file.type.startsWith("video/")) setActiveTab("videos");
      else setActiveTab("other");
    },
    [refetchFiles],
  );

  const isLoading = filesLoading || urlsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Content Manager</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="w-full">
            <TabsTrigger value="upload" className="flex-1 gap-1.5 text-xs">
              <Upload className="h-3.5 w-3.5" />
              Upload
            </TabsTrigger>
            {showImages && (
              <TabsTrigger value="images" className="flex-1 gap-1.5 text-xs">
                <ImageIcon className="h-3.5 w-3.5" />
                Images ({images.length})
              </TabsTrigger>
            )}
            {showVideos && (
              <TabsTrigger value="videos" className="flex-1 gap-1.5 text-xs">
                <VideoIcon className="h-3.5 w-3.5" />
                Videos ({videos.length})
              </TabsTrigger>
            )}
            {showOther && (
              <TabsTrigger value="other" className="flex-1 gap-1.5 text-xs">
                <Files className="h-3.5 w-3.5" />
                Other ({other.length})
              </TabsTrigger>
            )}
          </TabsList>

          {/* Upload tab */}
          <TabsContent value="upload" className="pt-3">
            <UploadDropZone onUploadComplete={handleUploadComplete} />
          </TabsContent>

          {/* Images tab */}
          {showImages && (
            <TabsContent value="images" className="space-y-3 pt-3">
              <FileGridToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortBy={sortBy}
                onSortChange={setSortBy}
              />
              {isLoading ? (
                <LoadingState />
              ) : (
                <div className="max-h-[45vh] overflow-y-auto">
                  <FileGrid
                    files={images}
                    signedUrlMap={signedUrlMap}
                    selectedFileId={selectedFile?.id ?? null}
                    onSelect={setSelectedFile}
                    searchQuery={searchQuery}
                    sortBy={sortBy}
                  />
                </div>
              )}
            </TabsContent>
          )}

          {/* Videos tab */}
          {showVideos && (
            <TabsContent value="videos" className="space-y-3 pt-3">
              <FileGridToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortBy={sortBy}
                onSortChange={setSortBy}
              />
              {isLoading ? (
                <LoadingState />
              ) : (
                <div className="max-h-[45vh] overflow-y-auto">
                  <FileGrid
                    files={videos}
                    signedUrlMap={signedUrlMap}
                    selectedFileId={selectedFile?.id ?? null}
                    onSelect={setSelectedFile}
                    searchQuery={searchQuery}
                    sortBy={sortBy}
                  />
                </div>
              )}
            </TabsContent>
          )}

          {/* Other files tab */}
          {showOther && (
            <TabsContent value="other" className="space-y-3 pt-3">
              <FileGridToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortBy={sortBy}
                onSortChange={setSortBy}
              />
              {isLoading ? (
                <LoadingState />
              ) : (
                <div className="max-h-[45vh] overflow-y-auto">
                  <FileGrid
                    files={other}
                    signedUrlMap={signedUrlMap}
                    selectedFileId={selectedFile?.id ?? null}
                    onSelect={setSelectedFile}
                    searchQuery={searchQuery}
                    sortBy={sortBy}
                  />
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>

        {/* Footer with Select button */}
        {activeTab !== "upload" && (
          <DialogFooter>
            <div className="flex w-full items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {selectedFile ? `Selected: ${selectedFile.name}` : "Select a file to continue"}
              </span>
              <Button
                onClick={handleSelect}
                disabled={!selectedFile || selecting}
              >
                {selecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Select
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FileGridToolbar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
}: {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  sortBy: "newest" | "oldest" | "name";
  onSortChange: (v: "newest" | "oldest" | "name") => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 pl-8 text-xs"
        />
      </div>
      <Select value={sortBy} onValueChange={(v) => onSortChange(v as any)}>
        <SelectTrigger className="h-8 w-[120px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="oldest">Oldest</SelectItem>
          <SelectItem value="name">Name</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
