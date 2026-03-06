import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import {
  getAffiliateStats,
  getAffiliateLink,
  getAffiliateCommissions,
  createAffiliateLink,
} from "wasp/client/operations";
import { Link } from "react-router";
import {
  MousePointerClick,
  Users,
  DollarSign,
  Wallet,
  Copy,
  Check,
  ArrowRight,
  Gift,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "../client/components/ui/card";
import { Button } from "../client/components/ui/button";
import { Badge } from "../client/components/ui/badge";
import UserDashboardLayout from "../user-dashboard/layout/UserDashboardLayout";
import { useToast } from "../client/hooks/use-toast";

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function KpiSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="bg-muted h-4 w-24 rounded" />
              <div className="bg-muted h-7 w-16 rounded" />
            </div>
            <div className="bg-muted h-11 w-11 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tier Badge
// ---------------------------------------------------------------------------

const TIER_COLORS: Record<string, string> = {
  Starter: "bg-zinc-500/10 text-zinc-500",
  Growth: "bg-blue-500/10 text-blue-500",
  Pro: "bg-purple-500/10 text-purple-500",
  Elite: "bg-amber-500/10 text-amber-500",
};

// ---------------------------------------------------------------------------
// KPI Card (inline to support $ format)
// ---------------------------------------------------------------------------

function AffKpiCard({
  title,
  value,
  icon: Icon,
  format = "number",
}: {
  title: string;
  value: number;
  icon: any;
  format?: "number" | "dollar" | "percent";
}) {
  const display =
    format === "dollar"
      ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      : format === "percent"
        ? `${value}%`
        : value.toLocaleString();

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm font-medium">{title}</p>
            <p className="text-foreground text-2xl font-bold">{display}</p>
          </div>
          <div className="bg-primary/10 rounded-full p-3">
            <Icon className="text-primary h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-500",
    approved: "bg-emerald-500/10 text-emerald-500",
    paid: "bg-blue-500/10 text-blue-500",
    rejected: "bg-red-500/10 text-red-500",
  };
  return (
    <Badge className={`${colors[status] || "bg-muted text-muted-foreground"} border-0 capitalize`}>
      {status}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function AffiliateDashboardPage({ user }: { user: AuthUser }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery(getAffiliateStats);
  const { data: link, isLoading: linkLoading } = useQuery(getAffiliateLink);
  const { data: commissionsData } = useQuery(getAffiliateCommissions, { pageSize: 5 });

  const isLoading = statsLoading || linkLoading;

  const handleCreateLink = async () => {
    try {
      await createAffiliateLink();
      toast({ title: "Affiliate link created!", variant: "default" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const referralUrl = link
    ? `${window.location.origin}/api/affiliate/track/${link.code}`
    : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tierRates = [
    { type: "Subscription", rate: "30%" },
    { type: "Extension", rate: "25%" },
    { type: "Credit Top-up", rate: "15%" },
  ];

  return (
    <UserDashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-foreground text-2xl font-bold">Affiliate Program</h1>
            <p className="text-muted-foreground mt-1">
              Earn commissions by referring new users to mAutomate
            </p>
          </div>
          {stats?.tier && (
            <Badge className={`${TIER_COLORS[stats.tier.name] || ""} border-0 px-3 py-1 text-sm font-semibold`}>
              {stats.tier.name} Tier
            </Badge>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => <KpiSkeleton key={i} />)}
          </div>
        )}

        {/* No link yet — empty state */}
        {!isLoading && !link && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-primary/10 mb-4 rounded-full p-4">
              <Gift className="text-primary h-8 w-8" />
            </div>
            <h2 className="text-foreground mb-2 text-xl font-semibold">
              Join the Affiliate Program
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Generate your unique referral link and start earning commissions on every paying user you refer.
            </p>
            <Button onClick={handleCreateLink}>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate My Referral Link
            </Button>
          </div>
        )}

        {/* Dashboard content */}
        {!isLoading && stats?.hasLink && link && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <AffKpiCard title="Total Clicks" value={stats.clicks} icon={MousePointerClick} />
              <AffKpiCard title="Conversions" value={stats.conversions} icon={Users} />
              <AffKpiCard title="Total Earnings" value={stats.totalEarnings} icon={DollarSign} format="dollar" />
              <AffKpiCard title="Available Balance" value={stats.availableBalance} icon={Wallet} format="dollar" />
            </div>

            {/* Referral Link */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-muted-foreground mb-2 text-sm font-medium">Your Referral Link</p>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted text-foreground flex-1 truncate rounded-md px-3 py-2 text-sm">
                        {referralUrl}
                      </code>
                      <Button variant="outline" size="sm" onClick={handleCopy}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{link._count?.clicks ?? 0} clicks</Badge>
                    <Badge variant="outline">{link._count?.conversions ?? 0} signups</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Two-column: Rates + Tier */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Commission Rates */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-foreground mb-4 text-lg font-semibold">Commission Rates</h3>
                  <div className="space-y-3">
                    {tierRates.map((r) => (
                      <div key={r.type} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                        <span className="text-foreground text-sm">{r.type}</span>
                        <span className="text-foreground text-sm font-semibold">{r.rate}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-muted-foreground mt-4 text-xs">
                    Rates are multiplied by your tier bonus ({stats.tier.multiplier}x for {stats.tier.name})
                  </p>
                </CardContent>
              </Card>

              {/* Tier Progress */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-foreground mb-4 text-lg font-semibold">Tier Progress</h3>
                  <div className="mb-4 flex items-center gap-3">
                    <Badge className={`${TIER_COLORS[stats.tier.name] || ""} border-0 px-3 py-1 text-sm`}>
                      {stats.tier.name}
                    </Badge>
                    <span className="text-muted-foreground text-sm">{stats.tier.multiplier}x multiplier</span>
                  </div>
                  {stats.tier.nextTier && (
                    <>
                      <div className="bg-muted mb-2 h-2 w-full overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, ((stats.tier.conversions) / (stats.tier.conversions + stats.tier.conversionsToNext)) * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {stats.tier.conversionsToNext} more conversion{stats.tier.conversionsToNext !== 1 ? "s" : ""} to reach{" "}
                        <span className="text-foreground font-medium">{stats.tier.nextTier}</span>
                      </p>
                    </>
                  )}
                  {!stats.tier.nextTier && (
                    <p className="text-muted-foreground text-sm">
                      You've reached the highest tier! Enjoy maximum commission rates.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Commissions */}
            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-foreground text-lg font-semibold">Recent Commissions</h3>
                  <Link to="/affiliate/earnings" className="text-primary flex items-center gap-1 text-sm hover:underline">
                    View All <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                {commissionsData?.commissions && commissionsData.commissions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">Date</th>
                          <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">Type</th>
                          <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">Amount</th>
                          <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commissionsData.commissions.map((c: any) => (
                          <tr key={c.id} className="border-b last:border-0">
                            <td className="text-foreground py-3 text-sm">
                              {new Date(c.createdAt).toLocaleDateString()}
                            </td>
                            <td className="text-foreground py-3 text-sm capitalize">{c.eventType}</td>
                            <td className="text-foreground py-3 text-sm font-medium">
                              ${c.amount.toFixed(2)}
                            </td>
                            <td className="py-3"><StatusBadge status={c.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    No commissions yet. Share your referral link to start earning!
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </UserDashboardLayout>
  );
}
