import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import {
  getAffiliateLink,
  getAffiliateStats,
  updateAffiliateLink,
  createAffiliateLink,
} from "wasp/client/operations";
import {
  Copy,
  Check,
  Link2,
  MousePointerClick,
  Users,
  Percent,
  Sparkles,
  Gift,
} from "lucide-react";
import { Card, CardContent } from "../client/components/ui/card";
import { Button } from "../client/components/ui/button";
import { Badge } from "../client/components/ui/badge";
import { Switch } from "../client/components/ui/switch";
import UserDashboardLayout from "../user-dashboard/layout/UserDashboardLayout";
import { useToast } from "../client/hooks/use-toast";

export default function AffiliateLinksPage({ user }: { user: AuthUser }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugValue, setSlugValue] = useState("");

  const { data: link, isLoading } = useQuery(getAffiliateLink);
  const { data: stats } = useQuery(getAffiliateStats);

  const referralUrl = link
    ? `${window.location.origin}/api/affiliate/track/${link.code}`
    : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateLink = async () => {
    try {
      await createAffiliateLink();
      toast({ title: "Affiliate link created!" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async () => {
    if (!link) return;
    try {
      await updateAffiliateLink({ isActive: !link.isActive });
      toast({ title: link.isActive ? "Link deactivated" : "Link activated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSaveSlug = async () => {
    if (!slugValue.trim()) return;
    try {
      await updateAffiliateLink({ customSlug: slugValue });
      setEditingSlug(false);
      toast({ title: "Custom slug updated!" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <UserDashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-foreground text-2xl font-bold">Referral Links</h1>
          <p className="text-muted-foreground mt-1">Manage your affiliate referral link</p>
        </div>

        {/* Loading */}
        {isLoading && (
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="bg-muted h-5 w-32 rounded" />
                <div className="bg-muted h-10 w-full rounded" />
                <div className="bg-muted h-10 w-48 rounded" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* No link */}
        {!isLoading && !link && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-primary/10 mb-4 rounded-full p-4">
              <Gift className="text-primary h-8 w-8" />
            </div>
            <h2 className="text-foreground mb-2 text-xl font-semibold">No Referral Link Yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Create your unique referral link to start tracking referrals and earning commissions.
            </p>
            <Button onClick={handleCreateLink}>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate My Referral Link
            </Button>
          </div>
        )}

        {/* Link management */}
        {!isLoading && link && (
          <>
            {/* Link Card */}
            <Card>
              <CardContent className="p-6 space-y-6">
                {/* Referral URL */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-muted-foreground text-sm font-medium">Referral URL</p>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">Active</span>
                      <Switch checked={link.isActive} onCheckedChange={handleToggleActive} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-muted flex flex-1 items-center gap-2 rounded-md px-3 py-2">
                      <Link2 className="text-muted-foreground h-4 w-4 shrink-0" />
                      <code className="text-foreground flex-1 truncate text-sm">{referralUrl}</code>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>

                {/* Referral Code */}
                <div>
                  <p className="text-muted-foreground mb-2 text-sm font-medium">Referral Code</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="px-3 py-1.5 text-sm font-mono">
                      {link.code}
                    </Badge>
                    {!link.isActive && (
                      <Badge className="bg-red-500/10 text-red-500 border-0">Inactive</Badge>
                    )}
                  </div>
                </div>

                {/* Custom Slug */}
                <div>
                  <p className="text-muted-foreground mb-2 text-sm font-medium">Custom Slug</p>
                  {editingSlug ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={slugValue}
                        onChange={(e) => setSlugValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        placeholder="my-custom-slug"
                        className="bg-muted text-foreground border-border flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <Button size="sm" onClick={handleSaveSlug}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingSlug(false)}>Cancel</Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSlugValue(link.customSlug || link.code);
                        setEditingSlug(true);
                      }}
                    >
                      {link.customSlug ? `Edit slug: ${link.customSlug}` : "Set custom slug"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Performance Card */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-foreground mb-4 text-lg font-semibold">Performance</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <MousePointerClick className="text-primary mx-auto mb-2 h-6 w-6" />
                    <p className="text-foreground text-2xl font-bold">{link._count?.clicks ?? 0}</p>
                    <p className="text-muted-foreground text-sm">Total Clicks</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <Users className="text-primary mx-auto mb-2 h-6 w-6" />
                    <p className="text-foreground text-2xl font-bold">{link._count?.conversions ?? 0}</p>
                    <p className="text-muted-foreground text-sm">Signups</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <Percent className="text-primary mx-auto mb-2 h-6 w-6" />
                    <p className="text-foreground text-2xl font-bold">
                      {stats?.conversionRate ?? 0}%
                    </p>
                    <p className="text-muted-foreground text-sm">Conversion Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </UserDashboardLayout>
  );
}
