import { useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import {
  deleteDocPage,
  getAdminDocCategories,
  getAdminDocPages,
  updateDocPage,
  useQuery,
} from "wasp/client/operations";
import {
  BookText,
  ExternalLink,
  FileText,
  MoreHorizontal,
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

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function statusColor(status: string) {
  if (status === "published") return "bg-green-500";
  if (status === "archived") return "bg-gray-400";
  return "bg-amber-500";
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "published") return "default";
  if (status === "archived") return "outline";
  return "secondary";
}

export default function AdminDocsPage({ user }: { user: AuthUser }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [categoryId, setCategoryId] = useState<string>("all");

  const { data: categories } = useQuery(getAdminDocCategories);

  const args = useMemo(() => ({
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(status !== "all" ? { status } : {}),
    ...(categoryId !== "all" ? { categoryId } : {}),
  }), [search, status, categoryId]);

  const { data: pages, isLoading, error, refetch } = useQuery(getAdminDocPages, args);

  async function handleToggleStatus(page: any) {
    const nextStatus = page.status === "published" ? "draft" : "published";
    try {
      await updateDocPage({
        id: page.id,
        title: page.title,
        categoryId: page.categoryId,
        content: page.content ?? "",
        status: nextStatus as any,
      });
      toast({ title: "Updated", description: `Page moved to ${nextStatus}.` });
      await refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to update.", variant: "destructive" });
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await deleteDocPage({ id });
      toast({ title: "Deleted", description: "Page deleted." });
      await refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to delete.", variant: "destructive" });
    }
  }

  const totalCount = pages?.length ?? 0;
  const publishedCount = (pages || []).filter((p: any) => p.status === "published").length;
  const draftCount = (pages || []).filter((p: any) => p.status === "draft").length;

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName="Documentation" />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCount}</p>
              <p className="text-xs text-muted-foreground">Total Pages</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
              <BookText size={20} />
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
              placeholder="Search pages..."
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
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="sm:w-[180px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(categories || []).map((cat: any) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.icon ? `${cat.icon} ` : ""}{cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button asChild className="gap-1.5">
          <Link to="/admin/docs/new">
            <Plus size={16} />
            New Page
          </Link>
        </Button>
      </div>

      {/* Pages list */}
      {isLoading && <p className="text-sm text-muted-foreground py-8 text-center">Loading pages...</p>}
      {error && <p className="text-sm text-destructive py-8 text-center">Failed to load pages.</p>}

      {!isLoading && !error && (!pages || pages.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText size={48} className="mb-3 text-muted-foreground/40" />
            <p className="font-medium">No documentation pages found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {search || status !== "all" || categoryId !== "all"
                ? "Try adjusting your filters."
                : "Create your first page to get started."}
            </p>
            {!search && status === "all" && categoryId === "all" && (
              <Button asChild variant="outline" className="mt-4 gap-1.5">
                <Link to="/admin/docs/new">
                  <Plus size={14} />
                  New Page
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && pages && pages.length > 0 && (
        <div className="space-y-2">
          {pages.map((page: any) => (
            <Card key={page.id} className="transition-colors hover:border-primary/30">
              <CardContent className="flex items-center gap-4 p-4">
                {/* Status dot + icon */}
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <FileText size={18} className="text-muted-foreground" />
                  <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${statusColor(page.status)}`} />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/admin/docs/${page.id}/edit`}
                      className="font-medium hover:underline truncate"
                    >
                      {page.title}
                    </Link>
                    <Badge variant={statusVariant(page.status)} className="text-[10px] shrink-0">
                      {page.status}
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    {page.category && (
                      <span className="flex items-center gap-1">
                        {page.category.icon || "📁"} {page.category.name}
                      </span>
                    )}
                    <span>/docs/{page.category?.slug}/{page.slug}</span>
                    <span>Order: {page.order}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>Updated {formatDate(page.updatedAt)}</span>
                    {page.publishedAt && <span>Published {formatDate(page.publishedAt)}</span>}
                    {page.author && (
                      <span>by {page.author.username || page.author.email}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">
                  {page.status === "published" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="View live page"
                      asChild
                    >
                      <Link to={`/docs/${page.category?.slug}/${page.slug}`}>
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
                    <Link to={`/admin/docs/${page.id}/edit`}>
                      <Pencil size={14} />
                    </Link>
                  </Button>
                  {page.status !== "published" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleToggleStatus(page)}
                    >
                      Publish
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleToggleStatus(page)}
                    >
                      Unpublish
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(page.id, page.title)}
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
