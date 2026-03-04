import { useMemo } from "react";
import { useParams } from "react-router";
import { getPublishedHelpArticleBySlug, useQuery } from "wasp/client/operations";
import { Badge } from "../client/components/ui/badge";
import { Card, CardContent } from "../client/components/ui/card";

function formatDate(dateString: string | Date | null | undefined) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ArticlePage() {
  const params = useParams<{ slug?: string }>();
  const slug = params.slug;

  const args = useMemo(() => {
    if (!slug) return undefined;
    return { slug };
  }, [slug]);

  const { data: article, isLoading, error } = useQuery(
    getPublishedHelpArticleBySlug,
    args,
    { enabled: !!args },
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-muted-foreground">Loading article...</p>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Card>
          <CardContent className="space-y-4 p-8">
            <p className="text-destructive">Article not found.</p>
            <a href="/articles" className="text-primary text-sm hover:underline">
              ← Back to Help Center
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  const authorLabel = article.author?.username || article.author?.email || "mAutomate.ai";

  return (
    <article className="mx-auto max-w-4xl px-6 py-12 lg:py-16">
      <a href="/articles" className="text-primary text-sm hover:underline">
        ← Back to Help Center
      </a>

      <header className="mt-5 space-y-3">
        <Badge variant="secondary">{article.category || "General"}</Badge>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{article.title}</h1>
        <p className="text-muted-foreground text-sm">
          {formatDate(article.publishedAt || article.createdAt)} • {authorLabel}
        </p>
      </header>

      {article.coverImageUrl && (
        <img
          src={article.coverImageUrl}
          alt={article.title}
          className="mt-8 max-h-[460px] w-full rounded-lg object-cover"
        />
      )}

      <div className="prose prose-neutral mt-8 max-w-none whitespace-pre-wrap dark:prose-invert">
        {article.content}
      </div>
    </article>
  );
}
