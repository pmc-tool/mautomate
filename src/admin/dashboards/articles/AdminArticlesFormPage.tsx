import { useEffect, useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useNavigate, useParams } from "react-router";
import {
  createHelpArticle,
  getAdminHelpArticleById,
  updateHelpArticle,
  useQuery,
} from "wasp/client/operations";
import { ArrowLeft, Loader2 } from "lucide-react";
import Breadcrumb from "../../layout/Breadcrumb";
import DefaultLayout from "../../layout/DefaultLayout";
import { Button } from "../../../client/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../client/components/ui/card";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../client/components/ui/select";
import { Textarea } from "../../../client/components/ui/textarea";
import { toast } from "../../../client/hooks/use-toast";

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

    if (!content.trim()) {
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
        content: content.trim(),
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

      <form className="mx-auto max-w-4xl space-y-6" onSubmit={handleSubmit}>
        <div>
          <Button type="button" variant="ghost" onClick={() => navigate("/admin/articles")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Articles
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Article Details</CardTitle>
            <CardDescription>Create and manage help center content.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="How to create a chatbot" required />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="how-to-create-a-chatbot" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Chatbot" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea id="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Short summary shown on article listings." rows={3} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your guide content step by step." rows={18} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverImageUrl">Cover Image URL</Label>
              <Input id="coverImageUrl" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} placeholder="https://..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Publishing and SEO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as any)}>
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label htmlFor="publishedAt">Publish Date</Label>
                <Input
                  id="publishedAt"
                  type="datetime-local"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seoTitle">SEO Title</Label>
              <Input id="seoTitle" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Search result title" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seoDescription">SEO Description</Label>
              <Textarea
                id="seoDescription"
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Search result description"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/admin/articles")}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Update Article" : "Create Article"}
          </Button>
        </div>
      </form>
    </DefaultLayout>
  );
}
