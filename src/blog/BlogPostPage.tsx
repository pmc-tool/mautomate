import { useMemo } from "react";
import { Link, useParams } from "react-router";
import { getPublishedBlogPostBySlug, useQuery } from "wasp/client/operations";
import { ArrowLeft, FileText } from "lucide-react";

function formatDate(dateString: string | Date | null | undefined) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();

  const args = useMemo(() => (slug ? { slug } : undefined), [slug]);

  const { data: post, isLoading, error } = useQuery(
    getPublishedBlogPostBySlug,
    args,
    { enabled: !!args },
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <FileText size={48} className="mx-auto mb-4 text-muted-foreground/30" />
        <p className="font-medium">Post not found</p>
        <Link
          to="/blog"
          className="mt-3 inline-block text-sm text-primary hover:underline"
        >
          Back to Blog
        </Link>
      </div>
    );
  }

  const authorLabel = post.author?.username || post.author?.email || "mAutomate";

  return (
    <article className="mx-auto max-w-3xl px-6 py-10 lg:py-14">
      <Link
        to="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Blog
      </Link>

      <header className="mt-6 mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
          {post.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <time>{formatDate(post.publishedAt || post.createdAt)}</time>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
          <span>{authorLabel}</span>
        </div>
        {post.excerpt && (
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            {post.excerpt}
          </p>
        )}
      </header>

      {post.coverImageUrl && (
        <img
          src={post.coverImageUrl}
          alt={post.title}
          className="mb-10 max-h-[420px] w-full rounded-xl object-cover shadow-sm"
        />
      )}

      <div
        className="prose prose-neutral max-w-none dark:prose-invert prose-headings:scroll-mt-20 prose-a:text-primary prose-img:rounded-xl"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
