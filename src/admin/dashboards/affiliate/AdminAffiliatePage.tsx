import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import {
  getAdminAffiliateOverview,
  updateAffiliateSettings,
} from "wasp/client/operations";
import { Link } from "react-router";
import {
  Users,
  MousePointerClick,
  DollarSign,
  Clock,
  Save,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "../../../client/components/ui/card";
import { Button } from "../../../client/components/ui/button";
import { Badge } from "../../../client/components/ui/badge";
import { Switch } from "../../../client/components/ui/switch";
import DefaultLayout from "../../layout/DefaultLayout";
import { useToast } from "../../../client/hooks/use-toast";

function AdminKpi({ title, value, icon: Icon }: { title: string; value: string | number; icon: any }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm font-medium">{title}</p>
            <p className="text-foreground text-2xl font-bold">{value}</p>
          </div>
          <div className="bg-primary/10 rounded-full p-3">
            <Icon className="text-primary h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminAffiliatePage({ user }: { user: AuthUser }) {
  const { toast } = useToast();
  const { data, isLoading } = useQuery(getAdminAffiliateOverview);

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize settings from server data once
  if (data?.settings && !initialized) {
    setSettings({
      enabled: data.settings.enabled,
      subscriptionRate: data.settings.subscriptionRate,
      extensionRate: data.settings.extensionRate,
      topupRate: data.settings.topupRate,
      minPayout: data.settings.minPayout,
      cookieDays: data.settings.cookieDays,
    });
    setInitialized(true);
  }

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateAffiliateSettings(settings);
      toast({ title: "Settings saved!" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-foreground text-2xl font-bold">Affiliate Management</h1>
            <p className="text-muted-foreground mt-1">Configure and monitor the affiliate program</p>
          </div>
          <Link to="/admin/affiliate/withdrawals">
            <Button variant="outline">
              Withdrawal Requests <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="bg-muted h-4 w-24 rounded" />
                    <div className="bg-muted h-7 w-16 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {data && (
          <>
            {/* Settings */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="text-foreground text-lg font-semibold">Program Settings</h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="flex items-center justify-between sm:col-span-2 lg:col-span-3">
                    <div>
                      <p className="text-foreground text-sm font-medium">Program Enabled</p>
                      <p className="text-muted-foreground text-xs">Toggle the affiliate program on/off</p>
                    </div>
                    <Switch
                      checked={settings.enabled === "true"}
                      onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked ? "true" : "false" })}
                    />
                  </div>

                  <div>
                    <label className="text-foreground mb-1.5 block text-sm font-medium">Subscription Rate (%)</label>
                    <input
                      type="number"
                      value={settings.subscriptionRate ?? ""}
                      onChange={(e) => setSettings({ ...settings, subscriptionRate: e.target.value })}
                      className="bg-muted text-foreground border-border w-full rounded-md border px-3 py-2 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-foreground mb-1.5 block text-sm font-medium">Extension Rate (%)</label>
                    <input
                      type="number"
                      value={settings.extensionRate ?? ""}
                      onChange={(e) => setSettings({ ...settings, extensionRate: e.target.value })}
                      className="bg-muted text-foreground border-border w-full rounded-md border px-3 py-2 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-foreground mb-1.5 block text-sm font-medium">Top-up Rate (%)</label>
                    <input
                      type="number"
                      value={settings.topupRate ?? ""}
                      onChange={(e) => setSettings({ ...settings, topupRate: e.target.value })}
                      className="bg-muted text-foreground border-border w-full rounded-md border px-3 py-2 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-foreground mb-1.5 block text-sm font-medium">Min Payout ($)</label>
                    <input
                      type="number"
                      value={settings.minPayout ?? ""}
                      onChange={(e) => setSettings({ ...settings, minPayout: e.target.value })}
                      className="bg-muted text-foreground border-border w-full rounded-md border px-3 py-2 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-foreground mb-1.5 block text-sm font-medium">Cookie Duration (days)</label>
                    <input
                      type="number"
                      value={settings.cookieDays ?? ""}
                      onChange={(e) => setSettings({ ...settings, cookieDays: e.target.value })}
                      className="bg-muted text-foreground border-border w-full rounded-md border px-3 py-2 text-sm outline-none"
                    />
                  </div>
                </div>

                <Button onClick={handleSaveSettings} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
              </CardContent>
            </Card>

            {/* KPIs */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <AdminKpi title="Total Affiliates" value={data.totalAffiliates} icon={Users} />
              <AdminKpi title="Total Clicks" value={data.totalClicks.toLocaleString()} icon={MousePointerClick} />
              <AdminKpi title="Total Commissions" value={`$${data.totalCommissions.toFixed(2)}`} icon={DollarSign} />
              <AdminKpi title="Pending Withdrawals" value={data.pendingWithdrawals} icon={Clock} />
            </div>

            {/* Top Affiliates */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-foreground mb-4 text-lg font-semibold">Top Affiliates</h3>
                {data.topAffiliates.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">Affiliate</th>
                          <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">Commissions</th>
                          <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">Total Earned</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topAffiliates.map((a: any) => (
                          <tr key={a.userId} className="border-b last:border-0">
                            <td className="text-foreground py-3 text-sm">{a.email}</td>
                            <td className="text-foreground py-3 text-sm">{a.commissionCount}</td>
                            <td className="text-foreground py-3 text-sm font-medium">${a.totalEarnings.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground py-8 text-center text-sm">No affiliates yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Conversions */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-foreground mb-4 text-lg font-semibold">Recent Conversions</h3>
                {data.recentConversions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">Date</th>
                          <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">Referred User</th>
                          <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">Affiliate</th>
                          <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentConversions.map((c: any) => (
                          <tr key={c.id} className="border-b last:border-0">
                            <td className="text-foreground py-3 text-sm">
                              {new Date(c.createdAt).toLocaleDateString()}
                            </td>
                            <td className="text-foreground py-3 text-sm">{c.convertedUser?.email ?? "—"}</td>
                            <td className="text-foreground py-3 text-sm">{c.link?.user?.email ?? c.link?.code}</td>
                            <td className="py-3">
                              <Badge variant="outline" className="capitalize">{c.eventType}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground py-8 text-center text-sm">No conversions yet.</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DefaultLayout>
  );
}
