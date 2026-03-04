import { useMemo } from "react";
import { getPublishedHelpArticles, useQuery } from "wasp/client/operations";
import { Badge } from "../client/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../client/components/ui/card";

function formatDate(dateString: string | Date | null | undefined) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ArticlesPage() {
  const { data: articles, isLoading, error } = useQuery(getPublishedHelpArticles);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const article of articles || []) {
      const category = article.category || "General";
      if (!map.has(category)) map.set(category, []);
      map.get(category)!.push(article);
    }
    return Array.from(map.entries());
  }, [articles]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Help Center</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl text-base">
          Practical guides for setting up agents, chatbots, workflows, and publishing operations in mAutomate.ai.
        </p>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading articles...</p>}
      {error && <p className="text-destructive">Failed to load help articles.</p>}

      {!isLoading && !error && (!articles || articles.length === 0) && (
        <Card>
          <CardContent className="p-8">
            <p className="text-muted-foreground">No published help articles yet.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && grouped.map(([category, items]) => (
        <section key={category} className="mb-10">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xl font-semibold">{category}</h2>
            <Badge variant="secondary">{items.length}</Badge>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {items.map((article: any) => (
              <Card key={article.id} className="h-full transition-all duration-200 hover:shadow-md">
                {article.coverImageUrl && (
                  <a href={`/articles/${article.slug}`} className="block">
                    <img
                      src={article.coverImageUrl}
                      alt={article.title}
                      className="h-44 w-full rounded-t-lg object-cover"
                    />
                  </a>
                )}
                <CardHeader>
                  <CardTitle className="line-clamp-2 text-xl">
                    <a href={`/articles/${article.slug}`}>{article.title}</a>
                  </CardTitle>
                  <CardDescription>
                    {formatDate(article.publishedAt || article.createdAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-3 text-sm leading-6">
                    {article.excerpt || "Open the article to view the full guide."}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
