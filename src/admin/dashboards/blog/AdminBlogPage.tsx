import { useMemo, useState } from "react";
import { Link as WaspRouterLink } from "wasp/client/router";
import { type AuthUser } from "wasp/auth";
import {
  deleteBlogPost,
  getAdminBlogPosts,
  setBlogPostStatus,
  useQuery,
} from "wasp/client/operations";
import Breadcrumb from "../../layout/Breadcrumb";
import DefaultLayout from "../../layout/DefaultLayout";
import { Badge } from "../../../client/components/ui/badge";
import { Button } from "../../../client/components/ui/button";
import { Card, CardContent } from "../../../client/components/ui/card";
import { Input } from "../../../client/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../client/components/ui/select";
import { toast } from "../../../client/hooks/use-toast";

function formatDate(dateString: string | Date | null | undefined) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "published") return "default";
  if (status === "scheduled") return "secondary";
  if (status === "archived") return "outline";
  return "destructive";
}

export default function AdminBlogPage({ user }: { user: AuthUser }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  const args = useMemo(() => {
    return {
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(status !== "all" ? { status } : {}),
    };
  }, [search, status]);

  const { data: posts, isLoading, error, refetch } = useQuery(getAdminBlogPosts, args);

  async function handleSetStatus(id: string, nextStatus: "draft" | "published" | "archived") {
    try {
      await setBlogPostStatus({ id, status: nextStatus });
      toast({ title: "Updated", description: `Post moved to ${nextStatus}.` });
      await refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to update status.", variant: "destructive" });
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Delete this post? This cannot be undone.");
    if (!confirmed) return;

    try {
      await deleteBlogPost({ id });
      toast({ title: "Deleted", description: "Post deleted successfully." });
      await refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to delete post.", variant: "destructive" });
    }
  }

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName="Blog" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:max-w-xl sm:flex-row">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, slug, excerpt"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-[180px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button asChild>
          <WaspRouterLink to="/admin/blog/new">New Post</WaspRouterLink>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-12 border-b px-5 py-3 text-sm font-medium">
            <div className="col-span-4">Title</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Published</div>
            <div className="col-span-2">Updated</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {isLoading && <div className="p-5 text-sm text-muted-foreground">Loading posts...</div>}
          {error && <div className="p-5 text-sm text-destructive">Failed to load posts.</div>}

          {!isLoading && !error && (!posts || posts.length === 0) && (
            <div className="p-5 text-sm text-muted-foreground">No posts found.</div>
          )}

          {!isLoading && !error && posts?.map((post: any) => (
            <div key={post.id} className="grid grid-cols-12 items-center border-b px-5 py-3 text-sm last:border-0">
              <div className="col-span-4 min-w-0">
                <p className="truncate font-medium">{post.title}</p>
                <p className="truncate text-xs text-muted-foreground">/{post.slug}</p>
              </div>
              <div className="col-span-2">
                <Badge variant={statusVariant(post.status)}>{post.status}</Badge>
              </div>
              <div className="col-span-2 text-muted-foreground">{formatDate(post.publishedAt)}</div>
              <div className="col-span-2 text-muted-foreground">{formatDate(post.updatedAt)}</div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/admin/blog/${post.id}/edit`}>Edit</a>
                </Button>
                {post.status !== "published" ? (
                  <Button size="sm" onClick={() => handleSetStatus(post.id, "published")}>Publish</Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => handleSetStatus(post.id, "draft")}>Unpublish</Button>
                )}
                <Button variant="destructive" size="sm" onClick={() => handleDelete(post.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </DefaultLayout>
  );
}
