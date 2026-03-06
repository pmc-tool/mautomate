import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import { getAffiliateStats, getAffiliateCommissions } from "wasp/client/operations";
import {
  DollarSign,
  Clock,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "../client/components/ui/card";
import { Button } from "../client/components/ui/button";
import { Badge } from "../client/components/ui/badge";
import UserDashboardLayout from "../user-dashboard/layout/UserDashboardLayout";

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

function KpiSmall({ title, value, icon: Icon }: { title: string; value: number; icon: any }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm font-medium">{title}</p>
            <p className="text-foreground text-2xl font-bold">
              ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-primary/10 rounded-full p-3">
            <Icon className="text-primary h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AffiliateEarningsPage({ user }: { user: AuthUser }) {
  const [statusFilter, setStatusFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data: stats } = useQuery(getAffiliateStats);
  const { data: commissionsData, isLoading } = useQuery(getAffiliateCommissions, {
    status: statusFilter || undefined,
    eventType: eventFilter || undefined,
    page,
    pageSize: 20,
  });

  return (
    <UserDashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-foreground text-2xl font-bold">Earnings</h1>
          <p className="text-muted-foreground mt-1">Track your affiliate commissions</p>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <KpiSmall title="Pending" value={stats?.pendingEarnings ?? 0} icon={Clock} />
          <KpiSmall title="Available" value={stats?.availableBalance ?? 0} icon={CheckCircle} />
          <KpiSmall title="Paid" value={stats?.paidEarnings ?? 0} icon={DollarSign} />
        </div>

        {/* Commissions Table */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-foreground text-lg font-semibold">Commissions</h3>
              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="bg-muted text-foreground border-border rounded-md border px-3 py-1.5 text-sm outline-none"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                  <option value="rejected">Rejected</option>
                </select>
                <select
                  value={eventFilter}
                  onChange={(e) => { setEventFilter(e.target.value); setPage(1); }}
                  className="bg-muted text-foreground border-border rounded-md border px-3 py-1.5 text-sm outline-none"
                >
                  <option value="">All Types</option>
                  <option value="subscription">Subscription</option>
                  <option value="extension">Extension</option>
                  <option value="topup">Top-up</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="animate-pulse space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-muted h-10 w-full rounded" />
                ))}
              </div>
            ) : commissionsData?.commissions && commissionsData.commissions.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">Date</th>
                        <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">Type</th>
                        <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">Customer Paid</th>
                        <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">Rate</th>
                        <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">Commission</th>
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
                          <td className="text-foreground py-3 text-sm">${c.originalAmount.toFixed(2)}</td>
                          <td className="text-foreground py-3 text-sm">{(c.commissionRate * 100).toFixed(1)}%</td>
                          <td className="text-foreground py-3 text-sm font-medium">${c.amount.toFixed(2)}</td>
                          <td className="py-3"><StatusBadge status={c.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {commissionsData.totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-muted-foreground text-sm">
                      Page {commissionsData.page} of {commissionsData.totalPages} ({commissionsData.total} total)
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= commissionsData.totalPages}
                        onClick={() => setPage(page + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No commissions found. Share your referral link to start earning!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </UserDashboardLayout>
  );
}
