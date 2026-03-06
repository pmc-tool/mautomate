import { useMemo, useState } from "react";
import { Link } from "react-router";
import { getPublishedHelpArticles, useQuery } from "wasp/client/operations";
import { ChevronRight, HelpCircle, Layers, Search } from "lucide-react";

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Getting Started": { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
  Chatbot: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800" },
  Agents: { bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-600 dark:text-violet-400", border: "border-violet-200 dark:border-violet-800" },
  Publishing: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800" },
  Billing: { bg: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-600 dark:text-rose-400", border: "border-rose-200 dark:border-rose-800" },
};

function getCatStyle(cat: string) {
  return CATEGORY_COLORS[cat] || { bg: "bg-gray-50 dark:bg-gray-900/30", text: "text-gray-600 dark:text-gray-400", border: "border-gray-200 dark:border-gray-800" };
}

export default function ArticlesPage() {
  const { data: articles, isLoading, error } = useQuery(getPublishedHelpArticles);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const article of articles || []) {
      const cat = article.category || "General";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(article);
    }
    return Array.from(map.entries());
  }, [articles]);

  const filteredGroups = useMemo(() => {
    let result = grouped;

    if (activeCategory) {
      result = result.filter(([cat]) => cat === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result
        .map(([cat, items]) => [
          cat,
          items.filter(
            (a: any) =>
              a.title.toLowerCase().includes(q) ||
              (a.excerpt && a.excerpt.toLowerCase().includes(q)),
          ),
        ] as [string, any[]])
        .filter(([, items]) => items.length > 0);
    }

    return result;
  }, [grouped, search, activeCategory]);

  const totalArticles = (articles || []).length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-muted/40 border-b">
        <div className="mx-auto max-w-5xl px-6 py-12 lg:py-16">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <HelpCircle size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Help Center</h1>
              <p className="mt-1 text-muted-foreground">
                {totalArticles} articles to help you get the most out of mAutomate
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="mt-6 max-w-xl">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Describe your issue or search for a topic..."
                className="h-12 w-full rounded-xl border bg-background pl-11 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center">
            <p className="text-destructive">Failed to load articles.</p>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* Category pills */}
            {grouped.length > 1 && (
              <div className="mb-8 flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    !activeCategory
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  All
                </button>
                {grouped.map(([cat, items]) => {
                  const style = getCatStyle(cat);
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(isActive ? null : cat)}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                        isActive
                          ? `${style.border} ${style.bg} ${style.text}`
                          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {cat}
                      <span className="ml-1.5 text-xs opacity-60">{items.length}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {filteredGroups.length === 0 && (
              <div className="py-16 text-center">
                <Layers size={40} className="mx-auto mb-3 text-muted-foreground/20" />
                {search ? (
                  <>
                    <p className="font-medium">No results for "{search}"</p>
                    <button onClick={() => setSearch("")} className="mt-3 text-sm text-primary hover:underline">
                      Clear search
                    </button>
                  </>
                ) : (
                  <p className="text-muted-foreground">No articles found.</p>
                )}
              </div>
            )}

            {/* Article groups */}
            {filteredGroups.map(([category, items]) => {
              const style = getCatStyle(category);
              return (
                <section key={category} className="mb-10">
                  <div className="mb-3 flex items-center gap-2">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${style.bg} ${style.text}`}>
                      {category.charAt(0)}
                    </span>
                    <h2 className="text-lg font-semibold">{category}</h2>
                    <span className="text-xs text-muted-foreground">({items.length})</span>
                  </div>
                  <div className="divide-y rounded-xl border overflow-hidden">
                    {items.map((article: any) => (
                      <Link
                        key={article.id}
                        to={`/articles/${article.slug}`}
                        className="group flex items-center gap-4 bg-card px-5 py-4 transition-colors hover:bg-muted/50"
                      >
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium group-hover:text-primary transition-colors">
                            {article.title}
                          </h3>
                          {article.excerpt && (
                            <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                              {article.excerpt}
                            </p>
                          )}
                        </div>
                        <ChevronRight
                          size={16}
                          className="shrink-0 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                        />
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
