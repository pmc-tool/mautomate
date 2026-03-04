import { useState, useMemo, useEffect } from "react";
import { type AuthUser } from "wasp/auth";
import { getDashboardStats, useQuery } from "wasp/client/operations";
import { Link, useNavigate } from "react-router";
import {
  FileText,
  Send,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "../client/components/ui/card";
import UserDashboardLayout from "./layout/UserDashboardLayout";
import KpiCard from "./components/KpiCard";
import ContentTrendChart from "./components/ContentTrendChart";
import ChannelPerformanceTable from "./components/ChannelPerformanceTable";
import ActionQueue from "./components/ActionQueue";
import DashboardFilterBar from "./components/DashboardFilterBar";

// ---------------------------------------------------------------------------
// Skeleton loaders
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
          <div className="bg-muted h-4 w-32 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="bg-muted h-5 w-32 rounded" />
          <div className="bg-muted h-[350px] w-full rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="bg-muted h-5 w-40 rounded" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-muted h-10 w-full rounded" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// No Extensions CTA
// ---------------------------------------------------------------------------

function NoExtensionsCTA() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="bg-primary/10 mb-4 rounded-full p-4">
        <Sparkles className="text-primary h-8 w-8" />
      </div>
      <h2 className="text-foreground mb-2 text-xl font-semibold">
        Activate an Agent to Get Started
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        The dashboard shows metrics from your content agents. Activate the Social Media Agent or SEO
        Agent extension to start creating and tracking content.
      </p>
      <Link
        to="/marketplace"
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-6 py-2.5 text-sm font-medium transition-colors"
      >
        Browse Extensions
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard Page
// ---------------------------------------------------------------------------

export default function UserDashboardPage({ user }: { user: AuthUser }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (user.isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [user.isAdmin, navigate]);

  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d");
  const [postType, setPostType] = useState<"all" | "social" | "seo">("all");
  const [platform, setPlatform] = useState("");

  const { data, isLoading, error } = useQuery(getDashboardStats, {
    dateRange,
    postType,
    platform: platform || undefined,
  });

  // Derive unique platforms from channel data for the filter dropdown
  const platforms = useMemo((): string[] => {
    if (!data?.channels) return [];
    const names: string[] = data.channels.map((ch: any) => ch.channel as string);
    return [...new Set(names)].sort();
  }, [data?.channels]);

  const displayName = user.email || "there";

  // 403 = no extensions active
  const isNoExtensions = error && (error as any)?.statusCode === 403;

  return (
    <UserDashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header + Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-foreground text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {displayName}
            </p>
          </div>
          {!isNoExtensions && !isLoading && data && (
            <DashboardFilterBar
              dateRange={dateRange}
              postType={postType}
              platform={platform}
              platforms={platforms}
              onDateRangeChange={setDateRange}
              onPostTypeChange={setPostType}
              onPlatformChange={setPlatform}
            />
          )}
        </div>

        {/* No extensions state */}
        {isNoExtensions && <NoExtensionsCTA />}

        {/* Error state (non-403) */}
        {error && !isNoExtensions && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <p className="text-foreground font-medium">Failed to load dashboard data</p>
              <p className="text-muted-foreground text-sm">{(error as any)?.message}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-primary hover:text-primary/80 flex items-center gap-2 text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {isLoading && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <KpiSkeleton key={i} />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <ChartSkeleton />
              </div>
              <div className="lg:col-span-4">
                <ChartSkeleton />
              </div>
            </div>
            <TableSkeleton />
          </>
        )}

        {/* Dashboard content */}
        {data && !error && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                title="Posts Created"
                value={data.kpis.postsCreated.value}
                delta={data.kpis.postsCreated.delta}
                icon={FileText}
              />
              <KpiCard
                title="Posts Published"
                value={data.kpis.postsPublished.value}
                delta={data.kpis.postsPublished.delta}
                icon={Send}
              />
              <KpiCard
                title="Approval Rate"
                value={data.kpis.approvalRate.value}
                delta={data.kpis.approvalRate.delta}
                icon={CheckCircle}
                format="percent"
              />
              <KpiCard
                title="Failed Posts"
                value={data.kpis.failedPosts.value}
                delta={data.kpis.failedPosts.delta}
                icon={AlertTriangle}
                invertDelta
              />
            </div>

            {/* Chart + Action Queue */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <ContentTrendChart data={data.dailyTrend} />
              </div>
              <div className="lg:col-span-4">
                <ActionQueue items={data.actionItems} />
              </div>
            </div>

            {/* Channel Table */}
            <ChannelPerformanceTable channels={data.channels} />
          </>
        )}
      </div>
    </UserDashboardLayout>
  );
}
