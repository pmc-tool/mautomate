import { useMemo } from "react";
import { Link, useParams } from "react-router";
import { getDocPageBySlug, useQuery } from "wasp/client/operations";
import { ChevronRight, FileText, ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "../client/utils";

function formatDate(dateString: string | Date | null | undefined) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : null;
}

export default function DocsPageDetailPage() {
  const { categorySlug, pageSlug } = useParams<{
    categorySlug: string;
    pageSlug: string;
  }>();

  const args = useMemo(
    () => (categorySlug && pageSlug ? { categorySlug, pageSlug } : undefined),
    [categorySlug, pageSlug],
  );

  const { data: page, isLoading, error } = useQuery(getDocPageBySlug, args, {
    enabled: !!args,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16 text-center">
        <FileText size={48} className="mx-auto mb-4 text-muted-foreground/30" />
        <p className="font-medium">Page not found</p>
        <Link
          to="/docs"
          className="mt-3 inline-block text-sm text-primary hover:underline"
        >
          ← Back to Documentation
        </Link>
      </div>
    );
  }

  const pages: any[] = page.category?.pages || [];
  const currentIndex = pages.findIndex((p: any) => p.slug === pageSlug);
  const prevPage = currentIndex > 0 ? pages[currentIndex - 1] : null;
  const nextPage =
    currentIndex < pages.length - 1 ? pages[currentIndex + 1] : null;
  const youtubeId = page.videoUrl ? extractYouTubeId(page.videoUrl) : null;
  const authorLabel =
    page.author?.username || page.author?.email || "mAutomate";

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:py-14">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/docs" className="hover:text-foreground transition-colors">
          Documentation
        </Link>
        <ChevronRight size={14} />
        <Link
          to={`/docs/${categorySlug}`}
          className="hover:text-foreground transition-colors"
        >
          {page.category?.name}
        </Link>
        <ChevronRight size={14} />
        <span className="text-foreground font-medium truncate max-w-xs">
          {page.title}
        </span>
      </nav>

      <div className="flex gap-10">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">
            <Link
              to={`/docs/${categorySlug}`}
              className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              {page.category?.icon && (
                <span className="text-base">{page.category.icon}</span>
              )}
              {page.category?.name}
            </Link>
            <nav className="space-y-0.5">
              {pages.map((p: any) => (
                <Link
                  key={p.id}
                  to={`/docs/${categorySlug}/${p.slug}`}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-sm transition-all",
                    p.slug === pageSlug
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {p.title}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <article className="min-w-0 flex-1">
          <header className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              {page.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <time>{formatDate(page.publishedAt || page.createdAt)}</time>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
              <span>{authorLabel}</span>
            </div>
            {page.excerpt && (
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                {page.excerpt}
              </p>
            )}
          </header>

          {/* YouTube embed */}
          {youtubeId && (
            <div className="mb-10 aspect-video w-full overflow-hidden rounded-xl border shadow-sm">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}`}
                className="h-full w-full"
                allowFullScreen
                title={page.title}
              />
            </div>
          )}

          {/* Content */}
          <div
            className="prose prose-neutral max-w-none dark:prose-invert prose-headings:scroll-mt-20 prose-a:text-primary prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />

          {/* Prev / Next navigation */}
          {(prevPage || nextPage) && (
            <div className="mt-12 grid gap-4 border-t pt-8 sm:grid-cols-2">
              {prevPage ? (
                <Link
                  to={`/docs/${categorySlug}/${prevPage.slug}`}
                  className="group flex items-center gap-3 rounded-xl border p-4 transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
                >
                  <ArrowLeft
                    size={18}
                    className="shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors"
                  />
                  <div className="min-w-0">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Previous
                    </span>
                    <p className="mt-0.5 text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {prevPage.title}
                    </p>
                  </div>
                </Link>
              ) : (
                <div />
              )}

              {nextPage && (
                <Link
                  to={`/docs/${categorySlug}/${nextPage.slug}`}
                  className="group flex items-center justify-end gap-3 rounded-xl border p-4 transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
                >
                  <div className="min-w-0 text-right">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Next
                    </span>
                    <p className="mt-0.5 text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {nextPage.title}
                    </p>
                  </div>
                  <ArrowRight
                    size={18}
                    className="shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors"
                  />
                </Link>
              )}
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
