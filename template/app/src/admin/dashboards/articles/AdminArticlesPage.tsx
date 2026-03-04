import { useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  deleteHelpArticle,
  getAdminHelpArticles,
  setHelpArticleStatus,
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

export default function AdminArticlesPage({ user }: { user: AuthUser }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");

  const args = useMemo(() => {
    return {
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(status !== "all" ? { status } : {}),
      ...(category !== "all" ? { category } : {}),
    };
  }, [search, status, category]);

  const { data: articles, isLoading, error, refetch } = useQuery(getAdminHelpArticles, args);

  const categories = useMemo(() => {
    const values = new Set<string>();
    for (const a of articles || []) {
      values.add(a.category || "General");
    }
    return Array.from(values).sort();
  }, [articles]);

  async function handleSetStatus(id: string, nextStatus: "draft" | "published" | "archived") {
    try {
      await setHelpArticleStatus({ id, status: nextStatus });
      toast({ title: "Updated", description: `Article moved to ${nextStatus}.` });
      await refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to update status.", variant: "destructive" });
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Delete this article? This cannot be undone.");
    if (!confirmed) return;

    try {
      await deleteHelpArticle({ id });
      toast({ title: "Deleted", description: "Article deleted successfully." });
      await refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to delete article.", variant: "destructive" });
    }
  }

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName="Articles" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, slug, excerpt"
            className="sm:max-w-sm"
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
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="sm:w-[200px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button asChild>
          <a href="/admin/articles/new">New Article</a>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-12 border-b px-5 py-3 text-sm font-medium">
            <div className="col-span-4">Title</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2">Published</div>
            <div className="col-span-1">Updated</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {isLoading && <div className="p-5 text-sm text-muted-foreground">Loading articles...</div>}
          {error && <div className="p-5 text-sm text-destructive">Failed to load articles.</div>}

          {!isLoading && !error && (!articles || articles.length === 0) && (
            <div className="p-5 text-sm text-muted-foreground">No articles found.</div>
          )}

          {!isLoading && !error && articles?.map((article: any) => (
            <div key={article.id} className="grid grid-cols-12 items-center border-b px-5 py-3 text-sm last:border-0">
              <div className="col-span-4 min-w-0">
                <p className="truncate font-medium">{article.title}</p>
                <p className="truncate text-xs text-muted-foreground">/articles/{article.slug}</p>
              </div>
              <div className="col-span-2 text-muted-foreground">{article.category || "General"}</div>
              <div className="col-span-1">
                <Badge variant={statusVariant(article.status)}>{article.status}</Badge>
              </div>
              <div className="col-span-2 text-muted-foreground">{formatDate(article.publishedAt)}</div>
              <div className="col-span-1 text-muted-foreground">{formatDate(article.updatedAt)}</div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/admin/articles/${article.id}/edit`}>Edit</a>
                </Button>
                {article.status !== "published" ? (
                  <Button size="sm" onClick={() => handleSetStatus(article.id, "published")}>Publish</Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => handleSetStatus(article.id, "draft")}>Unpublish</Button>
                )}
                <Button variant="destructive" size="sm" onClick={() => handleDelete(article.id)}>
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
