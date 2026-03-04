import { useMemo } from "react";
import { useParams } from "react-router";
import { Link as WaspRouterLink } from "wasp/client/router";
import { getPublishedBlogPostBySlug, useQuery } from "wasp/client/operations";
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

export default function BlogPostPage() {
  const params = useParams<{ slug?: string }>();
  const slug = params.slug;

  const args = useMemo(() => {
    if (!slug) return undefined;
    return { slug };
  }, [slug]);

  const { data: post, isLoading, error } = useQuery(
    getPublishedBlogPostBySlug,
    args,
    { enabled: !!args },
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-muted-foreground">Loading post...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Card>
          <CardContent className="space-y-4 p-8">
            <p className="text-destructive">Post not found.</p>
            <WaspRouterLink to="/blog" className="text-primary text-sm hover:underline">
              ← Back to Blog
            </WaspRouterLink>
          </CardContent>
        </Card>
      </div>
    );
  }

  const authorLabel = post.author?.username || post.author?.email || "mAutomate.ai";

  return (
    <article className="mx-auto max-w-3xl px-6 py-12 lg:py-16">
      <WaspRouterLink to="/blog" className="text-primary text-sm hover:underline">
        ← Back to Blog
      </WaspRouterLink>

      <header className="mt-5 space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1>
        <p className="text-muted-foreground text-sm">
          {formatDate(post.publishedAt || post.createdAt)} • {authorLabel}
        </p>
      </header>

      {post.coverImageUrl && (
        <img
          src={post.coverImageUrl}
          alt={post.title}
          className="mt-8 max-h-[420px] w-full rounded-lg object-cover"
        />
      )}

      <div className="prose prose-neutral mt-8 max-w-none whitespace-pre-wrap dark:prose-invert">
        {post.content}
      </div>
    </article>
  );
}
