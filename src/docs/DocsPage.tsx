import { Link } from "react-router";
import { getPublishedDocCategories, useQuery } from "wasp/client/operations";
import { BookOpen, ChevronRight, FileText, Search } from "lucide-react";
import { useState, useMemo } from "react";

export default function DocsPage() {
  const { data: categories, isLoading, error } = useQuery(getPublishedDocCategories);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!categories) return [];
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories
      .map((cat: any) => ({
        ...cat,
        pages: (cat.pages || []).filter(
          (p: any) =>
            p.title.toLowerCase().includes(q) ||
            (p.excerpt && p.excerpt.toLowerCase().includes(q)),
        ),
      }))
      .filter(
        (cat: any) =>
          cat.name.toLowerCase().includes(q) ||
          (cat.description && cat.description.toLowerCase().includes(q)) ||
          cat.pages.length > 0,
      );
  }, [categories, search]);

  const totalPages = (categories || []).reduce(
    (sum: number, c: any) => sum + (c.pages?.length ?? 0),
    0,
  );

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-primary" />
            <span className="font-semibold">Docs</span>
          </div>
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Quick search..."
              className="h-8 w-full rounded-lg border bg-muted/50 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
            <span>{categories?.length ?? 0} sections</span>
            <span>{totalPages} pages</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
          <p className="text-sm font-medium text-primary/90 uppercase tracking-widest">Documentation</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Learn mAutomate
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            Everything you need to know — from getting started to advanced workflows and integrations.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center">
            <p className="text-destructive">Failed to load documentation.</p>
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div className="py-16 text-center">
            <FileText size={48} className="mx-auto mb-4 text-muted-foreground/20" />
            {search ? (
              <>
                <p className="font-medium">No results for "{search}"</p>
                <button onClick={() => setSearch("")} className="mt-3 text-sm text-primary hover:underline">
                  Clear search
                </button>
              </>
            ) : (
              <>
                <p className="font-medium">No documentation published yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Check back soon.</p>
              </>
            )}
          </div>
        )}

        {/* Category sections */}
        {!isLoading && !error && filtered.length > 0 && (
          <div className="space-y-8">
            {filtered.map((cat: any) => (
              <section key={cat.id} className="rounded-xl border overflow-hidden">
                {/* Category header */}
                <Link
                  to={`/docs/${cat.slug}`}
                  className="group flex items-center gap-4 bg-muted/40 px-6 py-5 transition-colors hover:bg-muted/60"
                >
                  {cat.icon ? (
                    <span className="text-3xl">{cat.icon}</span>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <BookOpen size={20} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold group-hover:text-primary transition-colors">
                      {cat.name}
                    </h2>
                    {cat.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{cat.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {cat.pages?.length ?? 0} pages
                    </span>
                    <ChevronRight size={16} className="text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>

                {/* Page list (show first 5) */}
                {cat.pages && cat.pages.length > 0 && (
                  <div className="divide-y">
                    {cat.pages.slice(0, 5).map((page: any) => (
                      <Link
                        key={page.id}
                        to={`/docs/${cat.slug}/${page.slug}`}
                        className="group/item flex items-center gap-3 bg-card px-6 py-3 transition-colors hover:bg-muted/30"
                      >
                        <FileText size={14} className="shrink-0 text-muted-foreground/40" />
                        <span className="text-sm font-medium group-hover/item:text-primary transition-colors truncate">
                          {page.title}
                        </span>
                      </Link>
                    ))}
                    {cat.pages.length > 5 && (
                      <Link
                        to={`/docs/${cat.slug}`}
                        className="flex items-center gap-2 px-6 py-3 text-sm text-primary hover:bg-muted/30 transition-colors"
                      >
                        View all {cat.pages.length} pages
                        <ChevronRight size={14} />
                      </Link>
                    )}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
