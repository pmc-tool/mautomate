import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import { useQuery } from "wasp/client/operations";
import { getCompanies, deleteCompany } from "wasp/client/operations";
import { Plus, Pencil, Trash2, Building2, Megaphone, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../client/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../client/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../client/components/ui/dialog";
import { toast } from "../client/hooks/use-toast";
import UserDashboardLayout from "../user-dashboard/layout/UserDashboardLayout";

const TONE_COLORS: Record<string, string> = {
  Professional: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Casual: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  Funny: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  Excited: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  Witty: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  Bold: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  Sarcastic: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  Dramatic: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
};

export default function BrandVoicePage({ user }: { user: AuthUser }) {
  const { data: companies, isLoading } = useQuery(getCompanies);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCompany({ id: deleteTarget.id });
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
              <Megaphone className="h-6 w-6 text-primary" />
              Brand Voice
            </h1>
            <p className="text-muted-foreground mt-1">
              Define your company's identity so AI-generated content always matches your brand.
            </p>
          </div>
          <Link to="/brand-voice/create">
            <Button>
              <Plus className="h-4 w-4 mr-1.5" />
              New Company
            </Button>
          </Link>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !companies || companies.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No companies yet</h3>
              <p className="text-muted-foreground text-sm max-w-md mb-6">
                Create your first company profile to define your brand voice. This helps AI generate content that sounds authentically yours.
              </p>
              <Link to="/brand-voice/create">
                <Button>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create Your First Company
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {companies.map((company: any) => (
              <Card key={company.id} className="group hover:border-primary/50 transition-colors relative overflow-hidden">
                {/* Color bar */}
                {company.brandColor && (
                  <div
                    className="h-1 w-full"
                    style={{ backgroundColor: company.brandColor }}
                  />
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{company.name}</CardTitle>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link to={`/brand-voice/${company.id}/edit`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget({ id: company.id, name: company.name })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground text-sm line-clamp-2">
                    {company.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {company.toneOfVoice && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TONE_COLORS[company.toneOfVoice] ?? "bg-muted text-muted-foreground"}`}>
                        {company.toneOfVoice}
                      </span>
                    )}
                    {company.industry && company.industry.split(",").slice(0, 2).map((ind: string) => (
                      <span key={ind.trim()} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {ind.trim()}
                      </span>
                    ))}
                  </div>

                  {company.products && company.products.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {company.products.length} product{company.products.length !== 1 ? "s" : ""} / service{company.products.length !== 1 ? "s" : ""}
                    </p>
                  )}
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
            <DialogTitle>Delete Company</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will also remove all associated products and services. This action cannot be undone.
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
