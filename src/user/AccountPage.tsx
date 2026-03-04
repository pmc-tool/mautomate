import { useState, useRef, useEffect } from "react";
import {
  getCustomerPortalUrl,
  updateUserProfile,
  generateCheckoutSession,
  getCreditsBalance,
  getCreditTransactions,
  useQuery,
} from "wasp/client/operations";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { type AuthUser } from "wasp/auth";
import {
  ArrowUpRight,
  Coins,
  Gift,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";
import { Button } from "../client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../client/components/ui/card";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import { Textarea } from "../client/components/ui/textarea";
import { Separator } from "../client/components/ui/separator";
import { Badge } from "../client/components/ui/badge";
import { Switch } from "../client/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../client/components/ui/tabs";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../client/components/ui/avatar";
import {
  SubscriptionStatus,
  PaymentPlanId,
  parsePaymentPlanId,
  prettyPaymentPlanName,
} from "../payment/plans";
import { ACTION_LABELS, TOP_UP_PACKS } from "../credits/creditConfig";
import { useToast } from "../client/hooks/use-toast";
import UserDashboardLayout from "../user-dashboard/layout/UserDashboardLayout";

export default function AccountPage({ user }: { user: AuthUser }) {
  return (
    <UserDashboardLayout user={user}>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Account Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your profile, subscription, and preferences
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileTab user={user} />
          </TabsContent>

          <TabsContent value="billing">
            <BillingTab user={user} />
          </TabsContent>

          <TabsContent value="preferences">
            <PreferencesTab />
          </TabsContent>
        </Tabs>
      </div>
    </UserDashboardLayout>
  );
}

// ---------------------------------------------------------------------------
// Profile Tab
// ---------------------------------------------------------------------------

function getInitials(user: AuthUser): string {
  if ((user as any).fullName) {
    return (user as any).fullName
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (user.email) {
    return user.email[0].toUpperCase();
  }
  if (user.username) {
    return user.username[0].toUpperCase();
  }
  return "U";
}

function ProfileTab({ user }: { user: AuthUser }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const extUser = user as AuthUser & {
    fullName?: string;
    phone?: string;
    bio?: string;
    avatarUrl?: string;
    company?: string;
  };

  const [form, setForm] = useState({
    fullName: extUser.fullName || "",
    username: user.username || "",
    company: extUser.company || "",
    phone: extUser.phone || "",
    bio: extUser.bio || "",
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    extUser.avatarUrl || null,
  );
  const [saving, setSaving] = useState(false);

  // Reset form when user data changes (e.g. after save triggers refetch)
  useEffect(() => {
    setForm({
      fullName: extUser.fullName || "",
      username: user.username || "",
      company: extUser.company || "",
      phone: extUser.phone || "",
      bio: extUser.bio || "",
    });
    setAvatarPreview(extUser.avatarUrl || null);
  }, [
    extUser.fullName,
    user.username,
    extUser.company,
    extUser.phone,
    extUser.bio,
    extUser.avatarUrl,
  ]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Simple base64 approach for avatar
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCancel = () => {
    setForm({
      fullName: extUser.fullName || "",
      username: user.username || "",
      company: extUser.company || "",
      phone: extUser.phone || "",
      bio: extUser.bio || "",
    });
    setAvatarPreview(extUser.avatarUrl || null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUserProfile({
        fullName: form.fullName,
        username: form.username || undefined,
        company: form.company,
        phone: form.phone,
        bio: form.bio,
        avatarUrl: avatarPreview || "",
      });
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="grid gap-6 md:grid-cols-5">
      {/* Left Card — Avatar & Identity */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Your Photo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Avatar className="h-20 w-20 text-lg">
            {avatarPreview && <AvatarImage src={avatarPreview} alt="Avatar" />}
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
              {getInitials(user)}
            </AvatarFallback>
          </Avatar>

          <div className="text-center">
            <p className="font-medium text-foreground">
              {extUser.fullName || user.username || "User"}
            </p>
            {user.email && (
              <p className="text-sm text-muted-foreground">{user.email}</p>
            )}
            {memberSince && (
              <p className="mt-1 text-xs text-muted-foreground">
                Member since {memberSince}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Change Photo
            </Button>
            {avatarPreview && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveAvatar}
                className="text-muted-foreground"
              >
                Remove
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Right Card — Profile Form */}
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
          <CardDescription>
            Update your personal details and public profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                placeholder="John Doe"
                value={form.fullName}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                placeholder="johndoe"
                value={form.username}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email is managed by the authentication system
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              name="company"
              placeholder="Acme Inc."
              value={form.company}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              placeholder="+1 (555) 000-0000"
              value={form.phone}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              placeholder="Tell us a little about yourself..."
              rows={3}
              value={form.bio}
              onChange={handleChange}
              maxLength={500}
            />
            <p className="text-right text-xs text-muted-foreground">
              {form.bio.length}/500
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Billing Tab
// ---------------------------------------------------------------------------

function BillingTab({ user }: { user: AuthUser }) {
  const { toast } = useToast();
  const [topUpLoading, setTopUpLoading] = useState<string | null>(null);

  const planName = getPlanName(user);
  const isActive =
    user.subscriptionStatus === SubscriptionStatus.Active ||
    user.subscriptionStatus === SubscriptionStatus.CancelAtPeriodEnd;
  const statusColor = isActive
    ? "success"
    : user.subscriptionStatus === SubscriptionStatus.PastDue
      ? "destructive"
      : "secondary";
  const statusLabel = getStatusLabel(user.subscriptionStatus);

  const { data: balance, isLoading: balanceLoading } =
    useQuery(getCreditsBalance);
  const { data: txData, isLoading: txLoading } = useQuery(
    getCreditTransactions,
    { limit: 20 },
  );

  const handleTopUpPurchase = async (planId: string) => {
    try {
      setTopUpLoading(planId);
      const result = await generateCheckoutSession(planId as PaymentPlanId);
      if (result?.sessionUrl) {
        window.open(result.sessionUrl, "_self");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to start checkout.",
        variant: "destructive",
      });
      setTopUpLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Plan Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <span className="text-lg font-bold text-primary">
                  {planName[0]}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {planName}
                  </span>
                  <Badge variant={statusColor as any}>{statusLabel}</Badge>
                </div>
                {user.datePaid && isActive && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Next billing:{" "}
                    {prettyPrintEndOfBillingPeriod(user.datePaid)}
                  </p>
                )}
                {user.subscriptionStatus ===
                  SubscriptionStatus.CancelAtPeriodEnd &&
                  user.datePaid && (
                    <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                      Cancels on{" "}
                      {prettyPrintEndOfBillingPeriod(user.datePaid)}
                    </p>
                  )}
                {balance?.creditResetDate && isActive && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Credits reset:{" "}
                    {new Date(balance.creditResetDate).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric", year: "numeric" },
                    )}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              <CustomerPortalButton />
              <WaspRouterLink to={routes.PricingPageRoute.to}>
                <Button variant="outline" size="sm">
                  <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" />
                  View Plans
                </Button>
              </WaspRouterLink>
            </div>
          </CardContent>
        </Card>

        {/* Credits Breakdown Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Credit Balance</CardTitle>
            <CardDescription>
              {balanceLoading
                ? "Loading..."
                : `${balance?.totalBalance.toLocaleString() ?? 0} total credits`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {balance && (
              <>
                {/* Trial bucket */}
                {balance.trialCredits > 0 && (
                  <CreditBucket
                    icon={<Gift className="h-4 w-4 text-emerald-500" />}
                    label="Trial Credits"
                    value={balance.trialCredits}
                    max={100}
                    color="bg-emerald-500"
                  />
                )}
                {/* Plan bucket */}
                <CreditBucket
                  icon={<RefreshCw className="h-4 w-4 text-primary" />}
                  label="Plan Credits"
                  sublabel={
                    balance.planAllotment > 0
                      ? `Resets to ${balance.planAllotment.toLocaleString()}/mo`
                      : "No active plan"
                  }
                  value={balance.planCredits}
                  max={balance.planAllotment || 1}
                  color="bg-primary"
                />
                {/* Top-up bucket */}
                <CreditBucket
                  icon={<ShoppingCart className="h-4 w-4 text-amber-500" />}
                  label="Top-Up Credits"
                  sublabel="Never expire"
                  value={balance.topUpCredits}
                  color="bg-amber-500"
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top-Up Packs */}
      {isActive && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buy More Credits</CardTitle>
            <CardDescription>
              Top-up packs for active subscribers. Credits never expire.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {TOP_UP_PACKS.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => handleTopUpPurchase(pack.id)}
                  disabled={topUpLoading !== null}
                  className="flex flex-col items-center gap-1 rounded-lg border p-4 text-center transition-colors hover:bg-accent disabled:opacity-50"
                >
                  <Coins className="h-6 w-6 text-primary" />
                  <span className="text-lg font-bold">
                    {pack.credits.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">credits</span>
                  <span className="mt-1 text-sm font-semibold">
                    ${pack.price}
                  </span>
                  {topUpLoading === pack.id && (
                    <span className="text-xs text-muted-foreground">
                      Redirecting...
                    </span>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
          <CardDescription>Recent credit activity</CardDescription>
        </CardHeader>
        <CardContent>
          {txLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !txData?.items?.length ? (
            <p className="text-sm text-muted-foreground">
              No transactions yet. Start using AI features to see your credit
              usage here.
            </p>
          ) : (
            <div className="space-y-2">
              {txData.items.map((tx: any) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">
                      {tx.description ||
                        (tx.actionType && ACTION_LABELS[tx.actionType as keyof typeof ACTION_LABELS]) ||
                        tx.type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span
                    className={
                      tx.amount >= 0
                        ? "font-semibold text-emerald-600"
                        : "font-semibold text-red-500"
                    }
                  >
                    {tx.amount >= 0 ? "+" : ""}
                    {tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreditBucket({
  icon,
  label,
  sublabel,
  value,
  max,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  value: number;
  max?: number;
  color: string;
}) {
  const percent = max ? Math.min(Math.round((value / max) * 100), 100) : 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-muted-foreground">{label}</span>
        </div>
        <span className="font-medium">{value.toLocaleString()}</span>
      </div>
      {max !== undefined && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${color}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
      {sublabel && (
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      )}
    </div>
  );
}

function getPlanName(user: AuthUser): string {
  if (user.subscriptionPlan) {
    try {
      return prettyPaymentPlanName(parsePaymentPlanId(user.subscriptionPlan));
    } catch {
      return user.subscriptionPlan;
    }
  }
  return "Free";
}

function getStatusLabel(status: string | null): string {
  if (!status) return "Free";
  const labels: Record<string, string> = {
    active: "Active",
    past_due: "Past Due",
    cancel_at_period_end: "Canceling",
    deleted: "Inactive",
  };
  return labels[status] || status;
}

function prettyPrintEndOfBillingPeriod(date: Date) {
  const oneMonthFromNow = new Date(date);
  oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
  return oneMonthFromNow.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function CustomerPortalButton() {
  const { data: customerPortalUrl, isLoading } =
    useQuery(getCustomerPortalUrl);

  if (!customerPortalUrl) return null;

  return (
    <a href={customerPortalUrl} target="_blank" rel="noopener noreferrer">
      <Button variant="default" size="sm" disabled={isLoading}>
        Manage Subscription
      </Button>
    </a>
  );
}


// ---------------------------------------------------------------------------
// Preferences Tab
// ---------------------------------------------------------------------------

function PreferencesTab() {
  const [newsletter, setNewsletter] = useState(true);
  const [publishNotifs, setPublishNotifs] = useState(true);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email Notifications</CardTitle>
          <CardDescription>
            Choose what email notifications you'd like to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Newsletter updates
              </p>
              <p className="text-xs text-muted-foreground">
                Receive product updates and marketing tips
              </p>
            </div>
            <Switch checked={newsletter} onCheckedChange={setNewsletter} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Post publish notifications
              </p>
              <p className="text-xs text-muted-foreground">
                Get notified when your scheduled posts are published
              </p>
            </div>
            <Switch
              checked={publishNotifs}
              onCheckedChange={setPublishNotifs}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that permanently affect your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Delete your account
              </p>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account and all associated data
              </p>
            </div>
            <Button variant="destructive" size="sm" disabled>
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
