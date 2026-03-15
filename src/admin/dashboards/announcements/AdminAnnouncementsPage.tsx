import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  getAdminAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  useQuery,
} from "wasp/client/operations";
import {
  Plus,
  Pencil,
  Trash2,
  Megaphone,
  Tag,
  Eye,
  EyeOff,
  X,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Breadcrumb from "../../layout/Breadcrumb";
import DefaultLayout from "../../layout/DefaultLayout";
import { Badge } from "../../../client/components/ui/badge";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import { Card, CardContent } from "../../../client/components/ui/card";
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
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isCurrentlyActive(ann: any): boolean {
  if (!ann.isActive) return false;
  const now = new Date();
  if (ann.startsAt && new Date(ann.startsAt) > now) return false;
  if (ann.endsAt && new Date(ann.endsAt) <= now) return false;
  return true;
}

type AnimationType = "none" | "slideDown" | "shimmer" | "pulse" | "gradientMove" | "marquee";

const ANIMATION_OPTIONS: { value: AnimationType; label: string; desc: string }[] = [
  { value: "none", label: "None", desc: "Static banner" },
  { value: "slideDown", label: "Slide Down", desc: "Slides in from top" },
  { value: "shimmer", label: "Shimmer", desc: "Light sweep across text" },
  { value: "pulse", label: "Pulse", desc: "Gentle attention pulse" },
  { value: "gradientMove", label: "Gradient Flow", desc: "Animated gradient background" },
  { value: "marquee", label: "Marquee", desc: "Scrolling text ticker" },
];

interface FormData {
  title: string;
  linkText: string;
  linkUrl: string;
  type: "announcement" | "promotion";
  bgFrom: string;
  bgTo: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  priority: number;
  dismissible: boolean;
  animation: AnimationType;
}

const DEFAULT_FORM: FormData = {
  title: "",
  linkText: "",
  linkUrl: "",
  type: "announcement",
  bgFrom: "#e6a556",
  bgTo: "#bd6500",
  isActive: true,
  startsAt: "",
  endsAt: "",
  priority: 0,
  dismissible: true,
  animation: "none",
};

export default function AdminAnnouncementsPage({ user }: { user: AuthUser }) {
  const { data: announcements, isLoading, refetch } = useQuery(getAdminAnnouncements);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditId(null);
    setForm(DEFAULT_FORM);
    setShowForm(true);
  };

  const openEdit = (ann: any) => {
    setEditId(ann.id);
    setForm({
      title: ann.title || "",
      linkText: ann.linkText || "",
      linkUrl: ann.linkUrl || "",
      type: ann.type || "announcement",
      bgFrom: ann.bgFrom || "#e6a556",
      bgTo: ann.bgTo || "#bd6500",
      isActive: ann.isActive,
      startsAt: ann.startsAt ? new Date(ann.startsAt).toISOString().slice(0, 16) : "",
      endsAt: ann.endsAt ? new Date(ann.endsAt).toISOString().slice(0, 16) : "",
      priority: ann.priority || 0,
      dismissible: ann.dismissible ?? true,
      animation: ann.animation || "none",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        title: form.title.trim(),
        linkText: form.linkText.trim() || null,
        linkUrl: form.linkUrl.trim() || null,
        type: form.type,
        bgFrom: form.bgFrom || null,
        bgTo: form.bgTo || null,
        isActive: form.isActive,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        priority: form.priority,
        dismissible: form.dismissible,
        animation: form.animation,
      };

      if (editId) {
        await updateAnnouncement({ id: editId, ...payload });
        toast({ title: "Announcement updated" });
      } else {
        await createAnnouncement(payload);
        toast({ title: "Announcement created" });
      }
      setShowForm(false);
      setEditId(null);
      await refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try {
      await deleteAnnouncement({ id });
      toast({ title: "Deleted" });
      await refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (ann: any) => {
    try {
      await updateAnnouncement({
        id: ann.id,
        title: ann.title,
        isActive: !ann.isActive,
        type: ann.type,
        linkText: ann.linkText,
        linkUrl: ann.linkUrl,
        bgFrom: ann.bgFrom,
        bgTo: ann.bgTo,
        startsAt: ann.startsAt ? new Date(ann.startsAt).toISOString() : null,
        endsAt: ann.endsAt ? new Date(ann.endsAt).toISOString() : null,
        priority: ann.priority,
        dismissible: ann.dismissible,
        animation: ann.animation || "none",
      });
      toast({ title: ann.isActive ? "Deactivated" : "Activated" });
      await refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const activeCount = announcements?.filter(isCurrentlyActive).length ?? 0;
  const totalCount = announcements?.length ?? 0;

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName="Announcements" />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Megaphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCount}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
              <Eye className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-sm text-muted-foreground">Live Now</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
              <Tag className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {announcements?.filter((a: any) => a.type === "promotion").length ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Promotions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Announcements and promotions shown in the site header banner
        </p>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New Announcement
        </Button>
      </div>

      {/* Form Modal Overlay */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-background border p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {editId ? "Edit Announcement" : "New Announcement"}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="50% Off All Plans This Weekend!"
                  className="mt-1"
                />
              </div>

              {/* Type */}
              <div>
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v: any) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="promotion">Promotion</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* CTA */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>CTA Text</Label>
                  <Input
                    value={form.linkText}
                    onChange={(e) => setForm({ ...form, linkText: e.target.value })}
                    placeholder="Get 50% Off"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>CTA Link</Label>
                  <Input
                    value={form.linkUrl}
                    onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                    placeholder="https://..."
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Gradient Start</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={form.bgFrom}
                      onChange={(e) => setForm({ ...form, bgFrom: e.target.value })}
                      className="h-9 w-12 cursor-pointer rounded border"
                    />
                    <Input
                      value={form.bgFrom}
                      onChange={(e) => setForm({ ...form, bgFrom: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Gradient End</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={form.bgTo}
                      onChange={(e) => setForm({ ...form, bgTo: e.target.value })}
                      className="h-9 w-12 cursor-pointer rounded border"
                    />
                    <Input
                      value={form.bgTo}
                      onChange={(e) => setForm({ ...form, bgTo: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Animation */}
              <div>
                <Label>Animation Style</Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {ANIMATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, animation: opt.value })}
                      className={`rounded-lg border-2 px-3 py-2 text-left transition-all ${
                        form.animation === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <p className="text-xs font-medium">{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <Label className="mb-1">Preview</Label>
                <AnnouncementPreview
                  title={form.title || "Your announcement text"}
                  linkText={form.linkText}
                  bgFrom={form.bgFrom}
                  bgTo={form.bgTo}
                  animation={form.animation}
                />
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Starts At</Label>
                  <Input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    className="mt-1"
                  />
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Leave empty = immediately</p>
                </div>
                <div>
                  <Label>Ends At</Label>
                  <Input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                    className="mt-1"
                  />
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Leave empty = no expiry</p>
                </div>
              </div>

              {/* Priority */}
              <div>
                <Label>Priority (higher = shown first)</Label>
                <Input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                  className="mt-1 w-32"
                />
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded"
                  />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.dismissible}
                    onChange={(e) => setForm({ ...form, dismissible: e.target.checked })}
                    className="rounded"
                  />
                  Dismissible
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editId ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              Loading...
            </div>
          ) : !announcements?.length ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <Megaphone className="h-10 w-10 opacity-30" />
              <p>No announcements yet</p>
              <Button variant="outline" onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Create your first announcement
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Banner</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Schedule</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Animation</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Priority</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {announcements.map((ann: any) => {
                    const live = isCurrentlyActive(ann);
                    return (
                      <tr key={ann.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <div
                            className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-white"
                            style={{
                              background: `linear-gradient(to right, ${ann.bgFrom || "#e6a556"}, ${ann.bgTo || "#bd6500"})`,
                            }}
                          >
                            <span className="max-w-[200px] truncate">{ann.title}</span>
                            {ann.linkText && (
                              <>
                                <span className="text-white/50">|</span>
                                <span className="font-semibold">{ann.linkText}</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={ann.type === "promotion" ? "default" : "secondary"}>
                            {ann.type === "promotion" ? "Promo" : "Announcement"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {live ? (
                            <Badge className="bg-green-500 hover:bg-green-600">Live</Badge>
                          ) : ann.isActive ? (
                            <Badge variant="outline" className="text-amber-500 border-amber-300">
                              Scheduled
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Inactive
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          <div>{ann.startsAt ? formatDate(ann.startsAt) : "Immediate"}</div>
                          <div>{ann.endsAt ? `→ ${formatDate(ann.endsAt)}` : "No expiry"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs capitalize">
                            {ann.animation || "none"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">{ann.priority}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(ann)}
                              title={ann.isActive ? "Deactivate" : "Activate"}
                            >
                              {ann.isActive ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-green-500" />
                              )}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(ann)}>
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(ann.id, ann.title)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </DefaultLayout>
  );
}

// ---------------------------------------------------------------------------
// Animated Preview Component
// ---------------------------------------------------------------------------

const ANIMATION_CSS = `
@keyframes annSlideDown {
  from { transform: translateY(-100%); opacity: 0; }
  to   { transform: translateY(0);     opacity: 1; }
}
@keyframes annShimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes annPulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.7; }
}
@keyframes annGradientMove {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes annMarquee {
  0%   { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}
`;

function AnnouncementPreview({
  title,
  linkText,
  bgFrom,
  bgTo,
  animation,
}: {
  title: string;
  linkText: string;
  bgFrom: string;
  bgTo: string;
  animation: string;
}) {
  const isMarquee = animation === "marquee";
  const isGradientMove = animation === "gradientMove";

  const bgStyle: React.CSSProperties = isGradientMove
    ? {
        background: `linear-gradient(90deg, ${bgFrom}, ${bgTo}, ${bgFrom}, ${bgTo})`,
        backgroundSize: "300% 100%",
        animation: "annGradientMove 4s ease infinite",
      }
    : {
        background: `linear-gradient(to right, ${bgFrom}, ${bgTo})`,
      };

  const wrapperStyle: React.CSSProperties = {
    ...bgStyle,
    ...(animation === "slideDown" ? { animation: "annSlideDown 0.5s ease-out" } : {}),
    ...(animation === "pulse" ? { animation: "annPulse 2s ease-in-out infinite" } : {}),
  };

  const textContent = (
    <>
      <span>{title}</span>
      {linkText && (
        <>
          <span className="text-white/60 mx-2">|</span>
          <span className="font-semibold underline">{linkText}</span>
        </>
      )}
    </>
  );

  return (
    <>
      <style>{ANIMATION_CSS}</style>
      <div
        className="overflow-hidden rounded-lg px-4 py-2.5 text-center text-sm font-medium text-white"
        style={wrapperStyle}
      >
        {isMarquee ? (
          <div className="flex whitespace-nowrap" style={{ animation: "annMarquee 8s linear infinite" }}>
            {textContent}
          </div>
        ) : animation === "shimmer" ? (
          <span
            style={{
              background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)`,
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              animation: "annShimmer 2.5s ease-in-out infinite",
            }}
          >
            {textContent}
          </span>
        ) : (
          <div className="flex items-center justify-center gap-0">{textContent}</div>
        )}
      </div>
    </>
  );
}
