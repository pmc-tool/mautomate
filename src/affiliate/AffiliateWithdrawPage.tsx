import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import {
  getAffiliateStats,
  getAffiliateWithdrawals,
  requestWithdrawal,
} from "wasp/client/operations";
import {
  Wallet,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "../client/components/ui/card";
import { Button } from "../client/components/ui/button";
import { Badge } from "../client/components/ui/badge";
import UserDashboardLayout from "../user-dashboard/layout/UserDashboardLayout";
import { useToast } from "../client/hooks/use-toast";

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

const MIN_PAYOUT = 50;

export default function AffiliateWithdrawPage({ user }: { user: AuthUser }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("paypal");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [bankDetails, setBankDetails] = useState({ accountName: "", accountNumber: "", routingNumber: "", bankName: "" });
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);

  const { data: stats } = useQuery(getAffiliateStats);
  const { data: withdrawalsData, isLoading } = useQuery(getAffiliateWithdrawals, { page, pageSize: 20 });

  const available = stats?.availableBalance ?? 0;
  const canWithdraw = available >= MIN_PAYOUT;

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < MIN_PAYOUT) {
      toast({ title: "Error", description: `Minimum withdrawal is $${MIN_PAYOUT}`, variant: "destructive" });
      return;
    }
    if (amt > available) {
      toast({ title: "Error", description: "Amount exceeds available balance", variant: "destructive" });
      return;
    }

    let paymentDetails: Record<string, string> = {};
    if (method === "paypal") {
      if (!paypalEmail) {
        toast({ title: "Error", description: "PayPal email is required", variant: "destructive" });
        return;
      }
      paymentDetails = { email: paypalEmail };
    } else if (method === "bank_transfer") {
      if (!bankDetails.accountName || !bankDetails.accountNumber) {
        toast({ title: "Error", description: "Bank details are required", variant: "destructive" });
        return;
      }
      paymentDetails = { ...bankDetails };
    }

    setSubmitting(true);
    try {
      await requestWithdrawal({ amount: amt, method, paymentDetails });
      toast({ title: "Withdrawal requested!", description: "Your request is being reviewed." });
      setAmount("");
      setPaypalEmail("");
      setBankDetails({ accountName: "", accountNumber: "", routingNumber: "", bankName: "" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <UserDashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-foreground text-2xl font-bold">Withdraw</h1>
            <p className="text-muted-foreground mt-1">Request a payout for your affiliate earnings</p>
          </div>
          <div className="flex items-center gap-2">
            <Wallet className="text-primary h-5 w-5" />
            <span className="text-foreground text-lg font-bold">
              ${available.toFixed(2)}
            </span>
            <span className="text-muted-foreground text-sm">available</span>
          </div>
        </div>

        {/* Withdrawal Form */}
        {canWithdraw ? (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-foreground text-lg font-semibold">New Withdrawal</h3>

              {/* Amount */}
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">Amount ($)</label>
                <div className="flex items-center gap-2">
                  <div className="bg-muted border-border flex items-center rounded-md border px-3">
                    <DollarSign className="text-muted-foreground h-4 w-4" />
                  </div>
                  <input
                    type="number"
                    min={MIN_PAYOUT}
                    max={available}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`Min $${MIN_PAYOUT}`}
                    className="bg-muted text-foreground border-border flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <Button variant="outline" size="sm" onClick={() => setAmount(available.toFixed(2))}>
                    Max
                  </Button>
                </div>
              </div>

              {/* Method */}
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">Payment Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="bg-muted text-foreground border-border w-full rounded-md border px-3 py-2 text-sm outline-none"
                >
                  <option value="paypal">PayPal</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              {/* PayPal fields */}
              {method === "paypal" && (
                <div>
                  <label className="text-foreground mb-1.5 block text-sm font-medium">PayPal Email</label>
                  <input
                    type="email"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="bg-muted text-foreground border-border w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}

              {/* Bank Transfer fields */}
              {method === "bank_transfer" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-foreground mb-1.5 block text-sm font-medium">Account Name</label>
                    <input
                      type="text"
                      value={bankDetails.accountName}
                      onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                      className="bg-muted text-foreground border-border w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-foreground mb-1.5 block text-sm font-medium">Account Number</label>
                    <input
                      type="text"
                      value={bankDetails.accountNumber}
                      onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                      className="bg-muted text-foreground border-border w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-foreground mb-1.5 block text-sm font-medium">Routing Number</label>
                    <input
                      type="text"
                      value={bankDetails.routingNumber}
                      onChange={(e) => setBankDetails({ ...bankDetails, routingNumber: e.target.value })}
                      className="bg-muted text-foreground border-border w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-foreground mb-1.5 block text-sm font-medium">Bank Name</label>
                    <input
                      type="text"
                      value={bankDetails.bankName}
                      onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                      className="bg-muted text-foreground border-border w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              )}

              <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto">
                {submitting ? "Submitting..." : "Request Withdrawal"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center py-8 text-center">
                <div className="bg-amber-500/10 mb-4 rounded-full p-3">
                  <AlertCircle className="h-6 w-6 text-amber-500" />
                </div>
                <h3 className="text-foreground mb-2 font-semibold">Minimum Balance Not Reached</h3>
                <p className="text-muted-foreground mb-4 max-w-sm text-sm">
                  You need at least ${MIN_PAYOUT} in approved earnings to request a withdrawal.
                  Current balance: ${available.toFixed(2)}
                </p>
                <div className="bg-muted h-2 w-full max-w-xs overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (available / MIN_PAYOUT) * 100)}%` }}
                  />
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  ${available.toFixed(2)} / ${MIN_PAYOUT.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Withdrawal History */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-foreground mb-4 text-lg font-semibold">Withdrawal History</h3>

            {isLoading ? (
              <div className="animate-pulse space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-muted h-10 w-full rounded" />
                ))}
              </div>
            ) : withdrawalsData?.withdrawals && withdrawalsData.withdrawals.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">Date</th>
                        <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">Amount</th>
                        <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">Method</th>
                        <th className="text-muted-foreground pb-3 text-left text-xs font-semibold uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawalsData.withdrawals.map((w: any) => (
                        <tr key={w.id} className="border-b last:border-0">
                          <td className="text-foreground py-3 text-sm">
                            {new Date(w.createdAt).toLocaleDateString()}
                          </td>
                          <td className="text-foreground py-3 text-sm font-medium">${w.amount.toFixed(2)}</td>
                          <td className="text-foreground py-3 text-sm capitalize">{w.method.replace("_", " ")}</td>
                          <td className="py-3"><StatusBadge status={w.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {withdrawalsData.totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-muted-foreground text-sm">
                      Page {withdrawalsData.page} of {withdrawalsData.totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" disabled={page >= withdrawalsData.totalPages} onClick={() => setPage(page + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No withdrawal requests yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </UserDashboardLayout>
  );
}
