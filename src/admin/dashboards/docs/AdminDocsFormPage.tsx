import { useEffect, useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link, useNavigate, useParams } from "react-router";
import {
  createDocPage,
  getAdminDocCategories,
  getAdminDocPageById,
  updateDocPage,
  useQuery,
} from "wasp/client/operations";
import { ArrowLeft, Eye, Loader2, Pencil } from "lucide-react";
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

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : null;
}

export default function AdminDocsFormPage({ user }: { user: AuthUser }) {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const isEdit = !!params.id;

  const queryArgs = useMemo(() => (isEdit ? { id: params.id! } : undefined), [isEdit, params.id]);
  const { data: existing, isLoading } = useQuery(getAdminDocPageById, queryArgs, { enabled: !!queryArgs });
  const { data: categories } = useQuery(getAdminDocCategories);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [order, setOrder] = useState("0");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title || "");
    setSlug(existing.slug || "");
    setCategoryId(existing.categoryId || "");
    setExcerpt(existing.excerpt || "");
    setContent(existing.content || "");
    setVideoUrl(existing.videoUrl || "");
    setOrder(String(existing.order ?? 0));
    setStatus(existing.status || "draft");
    setSeoTitle(existing.seoTitle || "");
    setSeoDescription(existing.seoDescription || "");
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
    if (!categoryId) {
      toast({ title: "Validation", description: "Category is required.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        categoryId,
        excerpt: excerpt.trim() || null,
        content,
        videoUrl: videoUrl.trim() || null,
        order: parseInt(order) || 0,
        status,
        seoTitle: seoTitle.trim() || null,
        seoDescription: seoDescription.trim() || null,
      };

      if (isEdit) {
        await updateDocPage({ id: params.id!, ...payload });
        toast({ title: "Updated", description: "Page updated successfully." });
      } else {
        await createDocPage(payload);
        toast({ title: "Created", description: "Page created successfully." });
      }

      navigate("/admin/docs");
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to save page.", variant: "destructive" });
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

  const youtubeId = videoUrl ? extractYouTubeId(videoUrl) : null;

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName={isEdit ? "Edit Doc Page" : "New Doc Page"} />

      <form onSubmit={handleSubmit}>
        {/* Top bar */}
        <div className="mb-5 flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate("/admin/docs")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Docs
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/admin/docs")}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Update Page" : "Create Page"}
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
              placeholder="Page title"
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
                  placeholder="Write your documentation content here..."
                />
              </TabsContent>

              <TabsContent value="preview" className="mt-3">
                <div className="rounded-md border bg-background p-6">
                  {youtubeId && (
                    <div className="mb-6 aspect-video w-full overflow-hidden rounded-lg border">
                      <iframe
                        src={`https://www.youtube.com/embed/${youtubeId}`}
                        className="h-full w-full"
                        allowFullScreen
                        title={title}
                      />
                    </div>
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
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Category *</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {(categories || []).map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon ? `${cat.icon} ` : ""}{cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Order</Label>
                  <Input
                    type="number"
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                    className="h-9"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Slug & Excerpt */}
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

            {/* Video */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Video</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">YouTube URL</Label>
                  <Input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="h-9"
                  />
                </div>
                {youtubeId && (
                  <div className="aspect-video overflow-hidden rounded-md border">
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeId}`}
                      className="h-full w-full"
                      allowFullScreen
                      title="Preview"
                    />
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
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </DefaultLayout>
  );
}
