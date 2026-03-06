import { useState } from "react";
import { useSearchParams, Link } from "react-router";
import type { AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import { getVideoGenerations } from "wasp/client/operations";
import UserDashboardLayout from "../../user-dashboard/layout/UserDashboardLayout";
import { VideoCard } from "./components/VideoCard";
import { VideoModal } from "./components/VideoModal";
import { Button } from "../../client/components/ui/button";
import { Card, CardContent } from "../../client/components/ui/card";
import { Badge } from "../../client/components/ui/badge";
import { Skeleton } from "../../client/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "../../client/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../client/components/ui/select";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Film,
  Grid3X3,
  Plus,
  Wand2,
  X,
} from "lucide-react";

import videoCreateImg from "../../client/static/video-studio/video-create.png";

const PAGE_SIZE = 20;

export default function VideoGalleryPage({ user }: { user: AuthUser }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [typeFilter, setTypeFilter] = useState(
    searchParams.get("type") || "all",
  );
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || "all",
  );
  const [page, setPage] = useState(1);
  const [selectedGen, setSelectedGen] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const projectId = searchParams.get("projectId") || undefined;

  const { data, isLoading } = useQuery(getVideoGenerations, {
    type: typeFilter !== "all" ? typeFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    projectId,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  const handleCardClick = (gen: any) => {
    if (gen.status === "completed") {
      setSelectedGen(gen);
      setModalOpen(true);
    } else {
      window.location.href = `/video-studio/video/${gen.id}`;
    }
  };

  return (
    <UserDashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="rounded-xl">
              <Link to="/video-studio">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-md shadow-blue-500/20">
              <Grid3X3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-foreground text-2xl font-bold tracking-tight">
                Video Gallery
              </h1>
              <p className="text-muted-foreground text-xs">
                {data?.total ?? 0} video{(data?.total ?? 0) !== 1 ? "s" : ""} generated
              </p>
            </div>
          </div>
          <Button asChild className="rounded-xl">
            <Link to="/video-studio/generate">
              <Wand2 className="mr-1.5 h-4 w-4" />
              Generate
            </Link>
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
          {/* Type tabs */}
          <Tabs
            value={typeFilter}
            onValueChange={(v) => {
              setTypeFilter(v);
              setPage(1);
            }}
          >
            <TabsList className="bg-muted/50">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="ttv">Text to Video</TabsTrigger>
              <TabsTrigger value="itv">Image to Video</TabsTrigger>
              <TabsTrigger value="avatar">Avatar</TabsTrigger>
              <TabsTrigger value="upscale">Upscale</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Status filter */}
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40 rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          {/* Project filter clear */}
          {projectId && (
            <Button
              variant="secondary"
              size="sm"
              className="rounded-xl"
              onClick={() => {
                searchParams.delete("projectId");
                setSearchParams(searchParams);
              }}
            >
              Project filter
              <X className="ml-1.5 h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden rounded-xl">
                <Skeleton className="aspect-video w-full" />
                <CardContent className="space-y-2 p-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : data?.generations.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.generations.map((gen: any) => (
              <VideoCard
                key={gen.id}
                generation={gen}
                onClick={() => handleCardClick(gen)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16">
            <div className="mb-4">
              <img
                src={videoCreateImg}
                alt="No videos"
                className="h-28 w-auto object-contain opacity-60"
              />
            </div>
            <p className="text-foreground mb-1 text-sm font-medium">
              No videos found
            </p>
            <p className="text-muted-foreground mb-5 text-xs">
              Try adjusting your filters or generate a new video
            </p>
            <Button asChild className="rounded-xl">
              <Link to="/video-studio/generate">
                <Plus className="mr-1.5 h-4 w-4" />
                Generate Video
              </Link>
            </Button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .map((p, i, arr) => {
                const prev = arr[i - 1];
                const showEllipsis = prev !== undefined && p - prev > 1;
                return (
                  <span key={p} className="flex items-center">
                    {showEllipsis && (
                      <span className="text-muted-foreground px-1 text-sm">...</span>
                    )}
                    <Button
                      variant={p === page ? "default" : "outline"}
                      size="icon"
                      onClick={() => setPage(p)}
                      className="h-9 w-9 rounded-xl"
                    >
                      {p}
                    </Button>
                  </span>
                );
              })}

            <Button
              variant="outline"
              size="icon"
              className="rounded-xl"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Video Modal */}
        <VideoModal
          generation={selectedGen}
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) setSelectedGen(null);
          }}
        />
      </div>
    </UserDashboardLayout>
  );
}
