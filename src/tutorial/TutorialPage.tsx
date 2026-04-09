import { useState, useMemo } from "react";
import { getPublishedTutorials, useQuery } from "wasp/client/operations";
import { Search, Video } from "lucide-react";
import { Skeleton } from "../client/components/ui/skeleton";

export default function TutorialPage() {
  const { data: tutorials, isLoading, error } = useQuery(getPublishedTutorials);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!tutorials) return [];
    if (!search.trim()) return tutorials;
    const q = search.toLowerCase();
    return tutorials.filter((t: any) => t.title.toLowerCase().includes(q));
  }, [tutorials, search]);

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tutorials</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Learn how to use the platform with video guides
            </p>
          </div>
          <div className="relative sm:w-64">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tutorials..."
              className="h-9 w-full rounded-lg border bg-muted/50 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border bg-card shadow-sm"
              >
                <Skeleton className="aspect-video w-full rounded-none bg-muted-foreground/15" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-5 w-3/4 bg-muted-foreground/15" />
                  <Skeleton className="h-4 w-1/2 bg-muted-foreground/10" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center">
            <p className="text-destructive">Failed to load tutorials.</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="py-20 text-center">
            <Video size={48} className="mx-auto mb-4 text-muted-foreground/20" />
            {search ? (
              <>
                <p className="font-medium">No results for "{search}"</p>
                <button
                  onClick={() => setSearch("")}
                  className="mt-3 text-sm text-primary hover:underline"
                >
                  Clear search
                </button>
              </>
            ) : (
              <p className="text-muted-foreground">
                No tutorials available yet.
              </p>
            )}
          </div>
        )}

        {/* Tutorial grid */}
        {!isLoading && !error && filtered.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((tutorial: any) => (
              <div
                key={tutorial.id}
                className="overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
              >
                <div
                  className="aspect-video w-full [&>iframe]:h-full [&>iframe]:w-full"
                  dangerouslySetInnerHTML={{ __html: tutorial.embedCode }}
                />
                <div className="p-4">
                  <h3 className="font-semibold leading-snug line-clamp-2">
                    {tutorial.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
