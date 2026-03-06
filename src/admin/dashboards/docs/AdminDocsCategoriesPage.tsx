import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import {
  createDocCategory,
  deleteDocCategory,
  getAdminDocCategories,
  updateDocCategory,
  useQuery,
} from "wasp/client/operations";
import {
  FolderOpen,
  FileText,
  Plus,
  Pencil,
  Trash2,
  X,
  GripVertical,
  Globe,
  GlobeLock,
} from "lucide-react";
import Breadcrumb from "../../layout/Breadcrumb";
import DefaultLayout from "../../layout/DefaultLayout";
import { Badge } from "../../../client/components/ui/badge";
import { Button } from "../../../client/components/ui/button";
import { Card, CardContent } from "../../../client/components/ui/card";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import { Switch } from "../../../client/components/ui/switch";
import { Textarea } from "../../../client/components/ui/textarea";
import { toast } from "../../../client/hooks/use-toast";

type CategoryForm = {
  name: string;
  icon: string;
  description: string;
  order: string;
  isPublished: boolean;
};

const emptyForm: CategoryForm = { name: "", icon: "", description: "", order: "0", isPublished: false };

export default function AdminDocsCategoriesPage({ user }: { user: AuthUser }) {
  const { data: categories, isLoading, error, refetch } = useQuery(getAdminDocCategories);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function startEdit(cat: any) {
    setEditingId(cat.id);
    setForm({
      name: cat.name || "",
      icon: cat.icon || "",
      description: cat.description || "",
      order: String(cat.order ?? 0),
      isPublished: cat.isPublished ?? false,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast({ title: "Validation", description: "Name is required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        icon: form.icon.trim() || null,
        description: form.description.trim() || null,
        order: parseInt(form.order) || 0,
        isPublished: form.isPublished,
      };
      if (editingId) {
        await updateDocCategory({ id: editingId, ...payload });
        toast({ title: "Updated", description: "Category updated." });
      } else {
        await createDocCategory(payload);
        toast({ title: "Created", description: "Category created." });
      }
      closeForm();
      await refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to save.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This will fail if it still has pages.`)) return;
    try {
      await deleteDocCategory({ id });
      toast({ title: "Deleted", description: "Category deleted." });
      await refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to delete.", variant: "destructive" });
    }
  }

  async function handleTogglePublished(cat: any) {
    try {
      await updateDocCategory({ id: cat.id, name: cat.name, isPublished: !cat.isPublished });
      toast({
        title: cat.isPublished ? "Unpublished" : "Published",
        description: `${cat.name} is now ${cat.isPublished ? "hidden" : "visible"} on /docs.`,
      });
      await refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to update.", variant: "destructive" });
    }
  }

  const totalPages = (categories || []).reduce((sum: number, c: any) => sum + (c._count?.pages ?? 0), 0);
  const publishedCount = (categories || []).filter((c: any) => c.isPublished).length;

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName="Doc Categories" />

      {/* Stats bar */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderOpen size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{categories?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total Categories</p>
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPages}</p>
              <p className="text-xs text-muted-foreground">Total Pages</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header + Add button */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Categories</h2>
          <p className="text-sm text-muted-foreground">Organize documentation into categories visible on /docs.</p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus size={16} />
          Add Category
        </Button>
      </div>

      {/* Form panel (slide-down) */}
      {showForm && (
        <Card className="mb-6 border-primary/30">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">{editingId ? "Edit Category" : "New Category"}</h3>
              <Button variant="ghost" size="sm" onClick={closeForm}>
                <X size={16} />
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Getting Started"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Icon (emoji)</Label>
                    <Input
                      value={form.icon}
                      onChange={(e) => setForm({ ...form, icon: e.target.value })}
                      placeholder="🚀"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Sort Order</Label>
                    <Input
                      type="number"
                      value={form.order}
                      onChange={(e) => setForm({ ...form, order: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    placeholder="Shown below category name on the docs page."
                    className="text-sm"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Published</p>
                    <p className="text-xs text-muted-foreground">Visible to visitors on /docs</p>
                  </div>
                  <Switch
                    checked={form.isPublished}
                    onCheckedChange={(checked) => setForm({ ...form, isPublished: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            {form.name && (
              <div className="mt-4 rounded-lg border bg-muted/30 p-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Preview</p>
                <div className="flex items-center gap-2">
                  {form.icon && <span className="text-2xl">{form.icon}</span>}
                  <div>
                    <p className="font-medium">{form.name}</p>
                    {form.description && <p className="text-xs text-muted-foreground">{form.description}</p>}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={closeForm}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories list */}
      {isLoading && <p className="text-sm text-muted-foreground py-8 text-center">Loading categories...</p>}
      {error && <p className="text-sm text-destructive py-8 text-center">Failed to load categories.</p>}

      {!isLoading && !error && (!categories || categories.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen size={48} className="mb-3 text-muted-foreground/40" />
            <p className="font-medium">No categories yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Create your first category to start organizing documentation.</p>
            <Button onClick={openCreate} variant="outline" className="mt-4 gap-1.5">
              <Plus size={14} />
              Add Category
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && categories && categories.length > 0 && (
        <div className="space-y-2">
          {categories.map((cat: any) => (
            <Card
              key={cat.id}
              className={`transition-colors ${editingId === cat.id ? "border-primary/40" : ""}`}
            >
              <CardContent className="flex items-center gap-4 p-4">
                {/* Icon */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl">
                  {cat.icon || <FolderOpen size={20} className="text-muted-foreground" />}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{cat.name}</p>
                    <Badge variant={cat.isPublished ? "default" : "secondary"} className="text-[10px]">
                      {cat.isPublished ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {cat.description || <span className="italic">No description</span>}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText size={12} />
                      {cat._count?.pages ?? 0} {(cat._count?.pages ?? 0) === 1 ? "page" : "pages"}
                    </span>
                    <span>Slug: {cat.slug}</span>
                    <span>Order: {cat.order}</span>
                  </div>
                </div>

                {/* Published toggle */}
                <div className="flex shrink-0 flex-col items-center gap-1">
                  <Switch
                    checked={cat.isPublished}
                    onCheckedChange={() => handleTogglePublished(cat)}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {cat.isPublished ? "Live" : "Hidden"}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(cat)}
                    className="h-8 w-8 p-0"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(cat.id, cat.name)}
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
