import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import {
  getAdminWithdrawalRequests,
  processWithdrawal,
  rejectWithdrawal,
} from "wasp/client/operations";
import { Link } from "react-router";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "../../../client/components/ui/card";
import { Button } from "../../../client/components/ui/button";
import { Badge } from "../../../client/components/ui/badge";
import DefaultLayout from "../../layout/DefaultLayout";
import { useToast } from "../../../client/hooks/use-toast";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-500",
    processing: "bg-blue-500/10 text-blue-500",
    completed: "bg-emerald-500/10 text-emerald-500",
    rejected: "bg-red-500/10 text-red-500",
  };
  return (
    <Badge className={`${colors[status] || "bg-muted text-muted-foreground"} border-0 capitalize`}>
      {status}
    </Badge>
  );
}

export default function AdminAffiliateWithdrawalsPage({ user }: { user: AuthUser }) {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [txId, setTxId] = useState("");

  const { data, isLoading } = useQuery(getAdminWithdrawalRequests, {
    status: statusFilter || undefined,
    page,
    pageSize: 20,
  });

  const handleApprove = async (id: string) => {
    try {
      await processWithdrawal({ withdrawalId: id, transactionId: txId || undefined });
      toast({ title: "Withdrawal approved!" });
      setProcessingId(null);
      setTxId("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    try {
      await rejectWithdrawal({ withdrawalId: rejectId, reason: rejectReason });
      toast({ title: "Withdrawal rejected" });
      setRejectId(null);
      setRejectReason("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/admin/affiliate">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-foreground text-2xl font-bold">Withdrawal Requests</h1>
            <p className="text-muted-foreground mt-1">Review and process affiliate payouts</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-muted text-foreground border-border rounded-md border px-3 py-1.5 text-sm outline-none"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Withdrawals Table */}
        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-muted h-12 w-full rounded" />
                ))}
              </div>
            ) : data?.withdrawals && data.withdrawals.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">Date</th>
                        <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">User</th>
                        <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">Amount</th>
                        <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">Method</th>
                        <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">Status</th>
                        <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.withdrawals.map((w: any) => (
                        <tr key={w.id} className="border-b last:border-0">
                          <td className="text-foreground py-3 text-sm">
                            {new Date(w.createdAt).toLocaleDateString()}
                          </td>
                          <td className="text-foreground py-3 text-sm">{w.user?.email ?? "—"}</td>
                          <td className="text-foreground py-3 text-sm font-medium">${w.amount.toFixed(2)}</td>
                          <td className="text-foreground py-3 text-sm capitalize">{w.method.replace("_", " ")}</td>
                          <td className="py-3"><StatusBadge status={w.status} /></td>
                          <td className="py-3">
                            {w.status === "pending" && (
                              <div className="flex items-center gap-2">
                                {processingId === w.id ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={txId}
                                      onChange={(e) => setTxId(e.target.value)}
                                      placeholder="Transaction ID (optional)"
                                      className="bg-muted text-foreground border-border rounded-md border px-2 py-1 text-xs outline-none"
                                    />
                                    <Button size="sm" onClick={() => handleApprove(w.id)}>
                                      Confirm
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setProcessingId(null)}>
                                      Cancel
                                    </Button>
                                  </div>
                                ) : rejectId === w.id ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={rejectReason}
                                      onChange={(e) => setRejectReason(e.target.value)}
                                      placeholder="Reason for rejection"
                                      className="bg-muted text-foreground border-border rounded-md border px-2 py-1 text-xs outline-none"
                                    />
                                    <Button size="sm" variant="destructive" onClick={handleReject}>
                                      Reject
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setRejectId(null)}>
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => { setProcessingId(w.id); setRejectId(null); }}
                                    >
                                      <CheckCircle className="mr-1 h-3.5 w-3.5" /> Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => { setRejectId(w.id); setProcessingId(null); }}
                                      className="text-red-500 hover:text-red-600"
                                    >
                                      <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                                    </Button>
                                  </>
                                )}
                              </div>
                            )}
                            {w.status === "rejected" && w.rejectionReason && (
                              <span className="text-muted-foreground text-xs italic">{w.rejectionReason}</span>
                            )}
                            {w.status === "completed" && w.transactionId && (
                              <span className="text-muted-foreground font-mono text-xs">{w.transactionId}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {data.totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-muted-foreground text-sm">
                      Page {data.page} of {data.totalPages} ({data.total} total)
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No withdrawal requests found.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DefaultLayout>
  );
}
