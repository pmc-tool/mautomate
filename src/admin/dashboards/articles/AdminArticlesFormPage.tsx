import { useEffect, useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link, useNavigate, useParams } from "react-router";
import {
  createHelpArticle,
  getAdminHelpArticleById,
  updateHelpArticle,
  useQuery,
} from "wasp/client/operations";
import { ArrowLeft, Eye, ImageIcon, Loader2, Pencil } from "lucide-react";
import Breadcrumb from "../../layout/Breadcrumb";
import DefaultLayout from "../../layout/DefaultLayout";
import { Button } from "../../../client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../client/components/ui/card";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../client/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../client/components/ui/tabs";
import { Textarea } from "../../../client/components/ui/textarea";
import { toast } from "../../../client/hooks/use-toast";
import RichTextEditor from "../../../client/components/RichTextEditor";

function toDatetimeLocal(dateString: string | Date | null | undefined) {
  if (!dateString) return "";
  const d = new Date(dateString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function AdminArticlesFormPage({ user }: { user: AuthUser }) {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const isEdit = !!params.id;

  const queryArgs = useMemo(() => (isEdit ? { id: params.id! } : undefined), [isEdit, params.id]);
  const { data: existing, isLoading } = useQuery(
    getAdminHelpArticleById,
    queryArgs,
    { enabled: !!queryArgs },
  );

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("General");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "scheduled" | "published" | "archived">("draft");
  const [publishedAt, setPublishedAt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title || "");
    setSlug(existing.slug || "");
    setCategory(existing.category || "General");
    setExcerpt(existing.excerpt || "");
    setContent(existing.content || "");
    setCoverImageUrl(existing.coverImageUrl || "");
    setSeoTitle(existing.seoTitle || "");
    setSeoDescription(existing.seoDescription || "");
    setStatus(existing.status || "draft");
    setPublishedAt(toDatetimeLocal(existing.publishedAt));
  }, [existing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toast({ title: "Validation", description: "Title is required.", variant: "destructive" });
      return;
    }

    if (!content.trim() || content === "<p></p>") {
      toast({ title: "Validation", description: "Content is required.", variant: "destructive" });
      return;
    }

    if (status === "scheduled" && !publishedAt) {
      toast({ title: "Validation", description: "Scheduled articles need a publish date.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        category: category.trim() || "General",
        excerpt: excerpt.trim() || null,
        content,
        coverImageUrl: coverImageUrl.trim() || null,
        seoTitle: seoTitle.trim() || null,
        seoDescription: seoDescription.trim() || null,
        status,
        publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
      };

      if (isEdit) {
        await updateHelpArticle({ id: params.id!, ...payload });
        toast({ title: "Updated", description: "Article updated successfully." });
      } else {
        await createHelpArticle(payload);
        toast({ title: "Created", description: "Article created successfully." });
      }

      navigate("/admin/articles");
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to save article.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (isEdit && isLoading) {
    return (
      <DefaultLayout user={user}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName={isEdit ? "Edit Article" : "New Article"} />

      <form onSubmit={handleSubmit}>
        {/* Top bar */}
        <div className="mb-5 flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate("/admin/articles")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Articles
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/admin/articles")}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Update Article" : "Create Article"}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          {/* Left — Main content */}
          <div className="space-y-6">
            {/* Title */}
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title"
              className="border-none bg-transparent text-2xl font-bold shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0 px-0"
              required
            />

            {/* Editor with Preview tabs */}
            <Tabs defaultValue="edit">
              <TabsList>
                <TabsTrigger value="edit" className="gap-1.5">
                  <Pencil size={14} />
                  Edit
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-1.5">
                  <Eye size={14} />
                  Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="edit" className="mt-3">
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Write your help article content here..."
                />
              </TabsContent>

              <TabsContent value="preview" className="mt-3">
                <div className="rounded-md border bg-background p-6">
                  {coverImageUrl && (
                    <img
                      src={coverImageUrl}
                      alt={title || "Cover"}
                      className="mb-6 max-h-[320px] w-full rounded-lg object-cover"
                    />
                  )}
                  {content && content !== "<p></p>" ? (
                    <div
                      className="prose prose-neutral dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: content }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right — Sidebar settings */}
          <div className="space-y-5">
            {/* Publish */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Publish</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Publish Date</Label>
                  <Input
                    type="datetime-local"
                    value={publishedAt}
                    onChange={(e) => setPublishedAt(e.target.value)}
                    className="h-9"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Details */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Slug</Label>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="auto-generated"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Category</Label>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="General"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Excerpt</Label>
                  <Textarea
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="Short summary for listing pages."
                    rows={3}
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Cover Image */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Cover Image</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Image URL</Label>
                  <Input
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-9"
                  />
                </div>
                {coverImageUrl ? (
                  <div className="overflow-hidden rounded-md border">
                    <img
                      src={coverImageUrl}
                      alt="Cover preview"
                      className="h-36 w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex h-28 items-center justify-center rounded-md border border-dashed bg-muted/30">
                    <div className="text-center">
                      <ImageIcon size={24} className="mx-auto text-muted-foreground/40" />
                      <p className="mt-1 text-[11px] text-muted-foreground">No cover image</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SEO */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">SEO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">SEO Title</Label>
                  <Input
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder="Search result title"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">SEO Description</Label>
                  <Textarea
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder="Search result description"
                    rows={2}
                    className="text-sm"
                  />
                </div>
                {(seoTitle || title) && (
                  <div className="rounded-md border bg-muted/30 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Preview</p>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">
                      {seoTitle || title}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-500 truncate mt-0.5">
                      mautomate.ai/articles/{slug || "your-article-slug"}
                    </p>
                    {seoDescription && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {seoDescription}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </DefaultLayout>
  );
}
