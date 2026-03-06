import { useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import {
  deleteHelpArticle,
  getAdminHelpArticles,
  setHelpArticleStatus,
  useQuery,
} from "wasp/client/operations";
import {
  ExternalLink,
  FileText,
  Globe,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
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
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusColor(status: string) {
  if (status === "published") return "bg-green-500";
  if (status === "scheduled") return "bg-blue-500";
  if (status === "archived") return "bg-gray-400";
  return "bg-amber-500";
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "published") return "default";
  if (status === "scheduled") return "secondary";
  if (status === "archived") return "outline";
  return "secondary";
}

export default function AdminArticlesPage({ user }: { user: AuthUser }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");

  const args = useMemo(() => ({
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(status !== "all" ? { status } : {}),
    ...(category !== "all" ? { category } : {}),
  }), [search, status, category]);

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

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await deleteHelpArticle({ id });
      toast({ title: "Deleted", description: "Article deleted." });
      await refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to delete article.", variant: "destructive" });
    }
  }

  const totalCount = articles?.length ?? 0;
  const publishedCount = (articles || []).filter((a: any) => a.status === "published").length;
  const draftCount = (articles || []).filter((a: any) => a.status === "draft").length;

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName="Articles" />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCount}</p>
              <p className="text-xs text-muted-foreground">Total Articles</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
              <Globe size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{publishedCount}</p>
              <p className="text-xs text-muted-foreground">Published</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <Pencil size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{draftCount}</p>
              <p className="text-xs text-muted-foreground">Drafts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative sm:max-w-sm flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles..."
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-[150px]">
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
            <SelectTrigger className="sm:w-[180px]">
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
        <Button asChild className="gap-1.5">
          <Link to="/admin/articles/new">
            <Plus size={16} />
            New Article
          </Link>
        </Button>
      </div>

      {/* Articles list */}
      {isLoading && <p className="text-sm text-muted-foreground py-8 text-center">Loading articles...</p>}
      {error && <p className="text-sm text-destructive py-8 text-center">Failed to load articles.</p>}

      {!isLoading && !error && (!articles || articles.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText size={48} className="mb-3 text-muted-foreground/40" />
            <p className="font-medium">No articles found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {search || status !== "all" || category !== "all"
                ? "Try adjusting your filters."
                : "Create your first article to get started."}
            </p>
            {!search && status === "all" && category === "all" && (
              <Button asChild variant="outline" className="mt-4 gap-1.5">
                <Link to="/admin/articles/new">
                  <Plus size={14} />
                  New Article
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && articles && articles.length > 0 && (
        <div className="space-y-2">
          {articles.map((article: any) => (
            <Card key={article.id} className="transition-colors hover:border-primary/30">
              <CardContent className="flex items-center gap-4 p-4">
                {/* Status dot + icon or cover thumbnail */}
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted overflow-hidden">
                  {article.coverImageUrl ? (
                    <img src={article.coverImageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <FileText size={18} className="text-muted-foreground" />
                  )}
                  <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${statusColor(article.status)}`} />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/admin/articles/${article.id}/edit`}
                      className="font-medium hover:underline truncate"
                    >
                      {article.title}
                    </Link>
                    <Badge variant={statusVariant(article.status)} className="text-[10px] shrink-0">
                      {article.status}
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">{article.category || "General"}</span>
                    <span>/articles/{article.slug}</span>
                    {article.author && (
                      <span>by {article.author.username || article.author.email}</span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>Updated {formatDate(article.updatedAt)}</span>
                    {article.publishedAt && <span>Published {formatDate(article.publishedAt)}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">
                  {article.status === "published" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="View live article"
                      asChild
                    >
                      <Link to={`/articles/${article.slug}`}>
                        <ExternalLink size={14} />
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Edit"
                    asChild
                  >
                    <Link to={`/admin/articles/${article.id}/edit`}>
                      <Pencil size={14} />
                    </Link>
                  </Button>
                  {article.status !== "published" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleSetStatus(article.id, "published")}
                    >
                      Publish
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleSetStatus(article.id, "draft")}
                    >
                      Unpublish
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(article.id, article.title)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DefaultLayout>
  );
}
