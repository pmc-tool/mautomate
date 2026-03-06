import { useMemo, useState } from "react";
import { Link } from "react-router";
import { getPublishedBlogPosts, useQuery } from "wasp/client/operations";
import { ArrowRight, FileText, Search } from "lucide-react";

function formatDate(dateString: string | Date | null | undefined) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function readingTime(content: string) {
  const words = (content || "").replace(/<[^>]*>/g, "").split(/\s+/).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

export default function BlogPage() {
  const { data: posts, isLoading, error } = useQuery(getPublishedBlogPosts);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!posts) return [];
    if (!search.trim()) return posts;
    const q = search.toLowerCase();
    return posts.filter(
      (p: any) =>
        p.title.toLowerCase().includes(q) ||
        (p.excerpt && p.excerpt.toLowerCase().includes(q)),
    );
  }, [posts, search]);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div className="min-h-screen">
      {/* Masthead */}
      <div className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">The mAutomate Blog</h1>
            <p className="text-sm text-muted-foreground">Marketing automation insights & product updates</p>
          </div>
          <div className="relative hidden sm:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-9 w-56 rounded-lg border bg-muted/50 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Mobile search */}
        <div className="mb-6 sm:hidden">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts..."
              className="h-10 w-full rounded-lg border bg-muted/50 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center">
            <p className="text-destructive">Failed to load posts.</p>
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div className="py-20 text-center">
            <FileText size={48} className="mx-auto mb-4 text-muted-foreground/20" />
            {search ? (
              <>
                <p className="font-medium">No results for "{search}"</p>
                <button onClick={() => setSearch("")} className="mt-3 text-sm text-primary hover:underline">
                  Clear search
                </button>
              </>
            ) : (
              <p className="text-muted-foreground">No posts published yet.</p>
            )}
          </div>
        )}

        {/* Featured hero post */}
        {!isLoading && !error && featured && (
          <>
            <Link
              to={`/blog/${featured.slug}`}
              className="group relative block overflow-hidden rounded-2xl"
            >
              <div className="relative h-[420px] w-full">
                {featured.coverImageUrl ? (
                  <img
                    src={featured.coverImageUrl}
                    alt={featured.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5" />
                )}
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-10">
                  <span className="inline-block rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">
                    Featured
                  </span>
                  <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl lg:text-4xl line-clamp-2">
                    {featured.title}
                  </h2>
                  {featured.excerpt && (
                    <p className="mt-3 max-w-2xl text-white/75 line-clamp-2 text-sm sm:text-base">
                      {featured.excerpt}
                    </p>
                  )}
                  <div className="mt-4 flex items-center gap-4 text-sm text-white/60">
                    <time>{formatDate(featured.publishedAt || featured.createdAt)}</time>
                    <span className="h-1 w-1 rounded-full bg-white/40" />
                    <span>{readingTime(featured.content)}</span>
                    {(featured.author?.username || featured.author?.email) && (
                      <>
                        <span className="h-1 w-1 rounded-full bg-white/40" />
                        <span>{featured.author.username || featured.author.email}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Link>

            {/* Post grid */}
            {rest.length > 0 && (
              <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post: any) => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className="group"
                  >
                    {/* Image */}
                    <div className="overflow-hidden rounded-xl">
                      {post.coverImageUrl ? (
                        <img
                          src={post.coverImageUrl}
                          alt={post.title}
                          className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-48 items-center justify-center bg-muted">
                          <FileText size={28} className="text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    {/* Text */}
                    <div className="mt-4">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <time>{formatDate(post.publishedAt || post.createdAt)}</time>
                        <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                        <span>{readingTime(post.content)}</span>
                      </div>
                      <h3 className="mt-2 text-lg font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      {post.excerpt && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {post.excerpt}
                        </p>
                      )}
                      <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                        Read more <ArrowRight size={14} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
