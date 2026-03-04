import { Link as WaspRouterLink } from "wasp/client/router";
import { getPublishedBlogPosts, useQuery } from "wasp/client/operations";
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

export default function BlogPage() {
  const { data: posts, isLoading, error } = useQuery(getPublishedBlogPosts);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 lg:py-16">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Blog</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl text-base">
          Insights, guides, and updates from the mAutomate.ai team.
        </p>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading posts...</p>}
      {error && <p className="text-destructive">Failed to load blog posts.</p>}

      {!isLoading && !error && (!posts || posts.length === 0) && (
        <Card>
          <CardContent className="p-8">
            <p className="text-muted-foreground">No published posts yet.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && posts && posts.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2">
          {posts.map((post: any) => (
            <Card key={post.id} className="h-full transition-all duration-200 hover:shadow-md">
              {post.coverImageUrl && (
                <a href={`/blog/${post.slug}`} className="block">
                  <img
                    src={post.coverImageUrl}
                    alt={post.title}
                    className="h-52 w-full rounded-t-lg object-cover"
                  />
                </a>
              )}
              <CardHeader>
                <CardTitle className="line-clamp-2 text-xl">
                  <a href={`/blog/${post.slug}`}>{post.title}</a>
                </CardTitle>
                <CardDescription>
                  {formatDate(post.publishedAt || post.createdAt)}
                  {post.author?.username || post.author?.email
                    ? ` • ${post.author.username || post.author.email}`
                    : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground line-clamp-3 text-sm leading-6">
                  {post.excerpt || "Read the full post for details."}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
