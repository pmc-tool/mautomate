import { useMemo } from "react";
import { Link, useParams } from "react-router";
import { getDocPagesByCategory, getPublishedDocCategories, useQuery } from "wasp/client/operations";
import { ChevronRight, FileText } from "lucide-react";
import { cn } from "../client/utils";

export default function DocsCategoryPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();

  const args = useMemo(() => (categorySlug ? { categorySlug } : undefined), [categorySlug]);

  const { data: category, isLoading, error } = useQuery(getDocPagesByCategory, args, { enabled: !!args });
  const { data: allCategories } = useQuery(getPublishedDocCategories);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16 text-center">
        <FileText size={48} className="mx-auto mb-4 text-muted-foreground/30" />
        <p className="font-medium">Category not found</p>
        <Link to="/docs" className="mt-3 inline-block text-sm text-primary hover:underline">
          ← Back to Documentation
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:py-14">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/docs" className="hover:text-foreground transition-colors">Documentation</Link>
        <ChevronRight size={14} />
        <span className="text-foreground font-medium">{category.name}</span>
      </nav>

      <div className="flex gap-10">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Categories
            </p>
            <nav className="space-y-0.5">
              {(allCategories || []).map((cat: any) => (
                <Link
                  key={cat.id}
                  to={`/docs/${cat.slug}`}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all",
                    cat.slug === categorySlug
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {cat.icon && <span className="text-base">{cat.icon}</span>}
                  {cat.name}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Category header */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              {category.icon && <span className="text-4xl">{category.icon}</span>}
              <div>
                <h1 className="text-2xl font-bold lg:text-3xl">{category.name}</h1>
                {category.description && (
                  <p className="mt-1 text-muted-foreground">{category.description}</p>
                )}
              </div>
            </div>
          </div>

          {(!category.pages || category.pages.length === 0) && (
            <div className="rounded-xl border bg-muted/30 p-10 text-center">
              <FileText size={40} className="mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">No articles published in this category yet.</p>
            </div>
          )}

          {/* Pages list */}
          <div className="space-y-2">
            {(category.pages || []).map((page: any, idx: number) => (
              <Link
                key={page.id}
                to={`/docs/${categorySlug}/${page.slug}`}
                className="group flex items-center gap-4 rounded-xl border bg-card p-5 transition-all duration-200 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
              >
                {/* Number */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  {idx + 1}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium group-hover:text-primary transition-colors">
                    {page.title}
                  </h3>
                  {page.excerpt && (
                    <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                      {page.excerpt}
                    </p>
                  )}
                </div>

                {/* Arrow */}
                <ChevronRight
                  size={18}
                  className="shrink-0 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
