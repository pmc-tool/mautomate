import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import { useQuery } from "wasp/client/operations";
import { getSeoAgents, deleteSeoAgent } from "wasp/client/operations";
import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Eye,
  Globe,
} from "lucide-react";
import { Button } from "../../client/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../client/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../client/components/ui/dialog";
import { toast } from "../../client/hooks/use-toast";
import UserDashboardLayout from "../../user-dashboard/layout/UserDashboardLayout";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  paused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
};

export default function SeoAgentPage({ user }: { user: AuthUser }) {
  const { data: agents, isLoading } = useQuery(getSeoAgents);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSeoAgent({ id: deleteTarget.id });
      toast({ title: "Deleted", description: `${deleteTarget.name} has been removed.` });
      setDeleteTarget(null);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to delete.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <UserDashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground text-2xl font-bold flex items-center gap-2">
              <Search className="h-6 w-6 text-primary" />
              SEO Agent
            </h1>
            <p className="text-muted-foreground mt-1">
              Create AI-powered agents that research keywords and generate SEO-optimized content.
            </p>
          </div>
          <Link to="/extensions/seo-agent/create">
            <Button>
              <Plus className="h-4 w-4 mr-1.5" />
              New Agent
            </Button>
          </Link>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !agents || agents.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No SEO agents yet</h3>
              <p className="text-muted-foreground text-sm max-w-md mb-6">
                Create your first SEO agent to start researching keywords and generating optimized content for your website.
              </p>
              <Link to="/extensions/seo-agent/create">
                <Button>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create Your First Agent
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent: any) => (
              <Card key={agent.id} className="group hover:border-primary/50 transition-colors relative overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{agent.name}</CardTitle>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link to={`/extensions/seo-agent/${agent.id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Link to={`/extensions/seo-agent/${agent.id}/edit`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget({ id: agent.id, name: agent.name })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Status badge */}
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[agent.status] ?? "bg-muted text-muted-foreground"}`}>
                      {agent.status}
                    </span>
                    {agent.wpUrl && (
                      <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <Globe className="h-3 w-3" />
                        WP Connected
                      </span>
                    )}
                  </div>

                  {/* Niche */}
                  {agent.niche && (
                    <p className="text-muted-foreground text-sm">
                      {agent.niche}
                    </p>
                  )}

                  {/* Seed keywords */}
                  {agent.seedKeywords && agent.seedKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {agent.seedKeywords.slice(0, 3).map((kw: string) => (
                        <span
                          key={kw}
                          className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                        >
                          {kw}
                        </span>
                      ))}
                      {agent.seedKeywords.length > 3 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          +{agent.seedKeywords.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Content types */}
                  {agent.contentTypes && agent.contentTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {agent.contentTypes.map((ct: string) => (
                        <span
                          key={ct}
                          className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                        >
                          {ct
                            .split("_")
                            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                            .join(" ")}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Target word count */}
                  <p className="text-xs text-muted-foreground">
                    Target: {agent.targetWordCount ?? 1500} words
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will also remove all associated posts and keyword data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UserDashboardLayout>
  );
}
