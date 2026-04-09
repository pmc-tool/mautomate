import { useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  createTutorial,
  deleteTutorial,
  getAdminTutorials,
  setTutorialStatus,
  updateTutorial,
  useQuery,
} from "wasp/client/operations";
import {
  FileText,
  Globe,
  Pencil,
  Plus,
  Search,
  Trash2,
  Video,
} from "lucide-react";
import Breadcrumb from "../../layout/Breadcrumb";
import DefaultLayout from "../../layout/DefaultLayout";
import { Badge } from "../../../client/components/ui/badge";
import { Button } from "../../../client/components/ui/button";
import { Card, CardContent } from "../../../client/components/ui/card";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../client/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../client/components/ui/dialog";
import { Textarea } from "../../../client/components/ui/textarea";
import { toast } from "../../../client/hooks/use-toast";

function formatDate(dateString: string | Date | null | undefined) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "published") return "default";
  return "secondary";
}

export default function AdminTutorialPage({ user }: { user: AuthUser }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTutorial, setEditingTutorial] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [embedCode, setEmbedCode] = useState("");
  const [saving, setSaving] = useState(false);

  const args = useMemo(
    () => ({
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(status !== "all" ? { status } : {}),
    }),
    [search, status],
  );

  const {
    data: tutorials,
    isLoading,
    error,
    refetch,
  } = useQuery(getAdminTutorials, args);

  function openCreateModal() {
    setEditingTutorial(null);
    setTitle("");
    setEmbedCode("");
    setModalOpen(true);
  }

  function openEditModal(tutorial: any) {
    setEditingTutorial(tutorial);
    setTitle(tutorial.title);
    setEmbedCode(tutorial.embedCode);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!title.trim() || !embedCode.trim()) {
      toast({
        title: "Validation",
        description: "Title and embed code are required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingTutorial) {
        await updateTutorial({
          id: editingTutorial.id,
          title: title.trim(),
          embedCode: embedCode.trim(),
        });
        toast({ title: "Updated", description: "Tutorial updated." });
      } else {
        await createTutorial({
          title: title.trim(),
          embedCode: embedCode.trim(),
        });
        toast({ title: "Created", description: "Tutorial created." });
      }
      setModalOpen(false);
      await refetch();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to save tutorial.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSetStatus(
    id: string,
    nextStatus: "draft" | "published",
  ) {
    try {
      await setTutorialStatus({ id, status: nextStatus });
      toast({
        title: "Updated",
        description: `Tutorial moved to ${nextStatus}.`,
      });
      await refetch();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to update status.",
        variant: "destructive",
      });
    }
  }

  async function handleDelete(id: string, tutorialTitle: string) {
    if (!window.confirm(`Delete "${tutorialTitle}"? This cannot be undone.`))
      return;
    try {
      await deleteTutorial({ id });
      toast({ title: "Deleted", description: "Tutorial deleted." });
      await refetch();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to delete tutorial.",
        variant: "destructive",
      });
    }
  }

  const totalCount = tutorials?.length ?? 0;
  const publishedCount = (tutorials || []).filter(
    (t: any) => t.status === "published",
  ).length;
  const draftCount = (tutorials || []).filter(
    (t: any) => t.status === "draft",
  ).length;

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName="Tutorials" />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Video size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCount}</p>
              <p className="text-xs text-muted-foreground">Total Tutorials</p>
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
          <div className="relative flex-1 sm:max-w-sm">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tutorials..."
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
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreateModal} className="gap-1.5">
          <Plus size={16} />
          Add Tutorial
        </Button>
      </div>

      {/* Tutorials list */}
      {isLoading && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading tutorials...
        </p>
      )}
      {error && (
        <p className="py-8 text-center text-sm text-destructive">
          Failed to load tutorials.
        </p>
      )}

      {!isLoading && !error && (!tutorials || tutorials.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Video size={48} className="mb-3 text-muted-foreground/40" />
            <p className="font-medium">No tutorials found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {search || status !== "all"
                ? "Try adjusting your filters."
                : "Add your first tutorial to get started."}
            </p>
            {!search && status === "all" && (
              <Button
                onClick={openCreateModal}
                variant="outline"
                className="mt-4 gap-1.5"
              >
                <Plus size={14} />
                Add Tutorial
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && tutorials && tutorials.length > 0 && (
        <div className="space-y-2">
          {tutorials.map((tutorial: any) => (
            <Card
              key={tutorial.id}
              className="transition-colors hover:border-primary/30"
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Video size={18} className="text-muted-foreground" />
                  <span
                    className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${
                      tutorial.status === "published"
                        ? "bg-green-500"
                        : "bg-amber-500"
                    }`}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">
                      {tutorial.title}
                    </span>
                    <Badge
                      variant={statusVariant(tutorial.status)}
                      className="shrink-0 text-[10px]"
                    >
                      {tutorial.status}
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    {tutorial.author && (
                      <span>
                        by{" "}
                        {tutorial.author.username || tutorial.author.email}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>Updated {formatDate(tutorial.updatedAt)}</span>
                    {tutorial.publishedAt && (
                      <span>Published {formatDate(tutorial.publishedAt)}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Edit"
                    onClick={() => openEditModal(tutorial)}
                  >
                    <Pencil size={14} />
                  </Button>
                  {tutorial.status !== "published" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() =>
                        handleSetStatus(tutorial.id, "published")
                      }
                    >
                      Publish
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleSetStatus(tutorial.id, "draft")}
                    >
                      Unpublish
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(tutorial.id, tutorial.title)}
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

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTutorial ? "Edit Tutorial" : "Add Tutorial"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tutorial-title">Title</Label>
              <Input
                id="tutorial-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Getting Started with mAutomate"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tutorial-embed">YouTube Embed Code</Label>
              <Textarea
                id="tutorial-embed"
                value={embedCode}
                onChange={(e) => setEmbedCode(e.target.value)}
                placeholder='<iframe width="560" height="315" src="https://www.youtube.com/embed/..." ...'
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Paste the full embed iframe code from YouTube (Share &rarr;
                Embed).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? "Saving..."
                : editingTutorial
                  ? "Update"
                  : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DefaultLayout>
  );
}
