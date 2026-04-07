import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import {
  getSeoAgents,
  researchKeywords,
  getSeoKeywords,
  generateSeoPost,
  deleteSeoKeyword,
  fetchDomainStats,
  fetchKeywordGap,
} from "wasp/client/operations";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Search,
  Loader2,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Globe,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  DollarSign,
  Target,
  Hash,
  Download,
  MousePointerClick,
  ArrowUp,
  ArrowDown,
  HelpCircle,
  Columns3,
} from "lucide-react";
import { Link } from "react-router";
import { Button } from "../../client/components/ui/button";
import { Input } from "../../client/components/ui/input";
import { Badge } from "../../client/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../client/components/ui/tabs";
import { toast } from "../../client/hooks/use-toast";
import UserDashboardLayout from "../../user-dashboard/layout/UserDashboardLayout";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INTENT_COLORS: Record<string, string> = {
  informational: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  commercial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  transactional: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  navigational: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
};

const SERP_FEATURE_MAP: Record<string, { letter: string; color: string; title: string }> = {
  images: { letter: "I", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300", title: "Images" },
  videos: { letter: "V", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300", title: "Videos" },
  maps: { letter: "M", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300", title: "Maps" },
  shopping: { letter: "S", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300", title: "Shopping" },
  "featured snippet": { letter: "F", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300", title: "Featured Snippet" },
  "people also ask": { letter: "P", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300", title: "People Also Ask" },
  news: { letter: "N", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300", title: "News" },
};

const PAGE_SIZE = 50;

type SortField =
  | "keyword"
  | "rankingPosition"
  | "searchVolume"
  | "seoClicks"
  | "keywordDifficulty"
  | "cpc"
  | "intent"
  | "opportunityScore";
type SortDir = "asc" | "desc";

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatVolume(v: number | null | undefined): string {
  if (v == null) return "--";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
}

function formatCpc(v: number | null | undefined): string {
  if (v == null) return "--";
  return `$${v.toFixed(2)}`;
}

function formatUsd(v: number | null | undefined): string {
  if (v == null) return "--";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toLocaleString()}`;
}

function difficultyColor(d: number): string {
  if (d <= 30) return "bg-emerald-500";
  if (d <= 60) return "bg-amber-500";
  return "bg-red-500";
}

function difficultyTextColor(d: number): string {
  if (d <= 30) return "text-emerald-600 dark:text-emerald-400";
  if (d <= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function scoreVariant(s: number): string {
  if (s >= 60) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (s >= 30) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
}

function parseSerpFeatures(csv: string | null | undefined): string[] {
  if (!csv) return [];
  return csv
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Sort icon component
// ---------------------------------------------------------------------------

function SortIndicator({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) {
    return (
      <span className="ml-1 inline-flex flex-col text-muted-foreground/40">
        <ChevronUp className="h-3 w-3 -mb-1" />
        <ChevronDown className="h-3 w-3" />
      </span>
    );
  }
  return (
    <span className="ml-1 inline-flex items-center text-[#bd711d]">
      {sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Stats card
// ---------------------------------------------------------------------------

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#bd711d]/10 flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
        <p className="text-lg font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SERP feature badges
// ---------------------------------------------------------------------------

function SerpBadges({ features }: { features: string }) {
  const parsed = parseSerpFeatures(features);
  if (parsed.length === 0) return <span className="text-xs text-muted-foreground">--</span>;

  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {parsed.map((feat) => {
        const config = SERP_FEATURE_MAP[feat];
        if (!config) return null;
        return (
          <span
            key={feat}
            title={config.title}
            className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold leading-none ${config.color}`}
          >
            {config.letter}
          </span>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rank cell
// ---------------------------------------------------------------------------

function RankCell({ position, change }: { position: number | null | undefined; change: number | null | undefined }) {
  if (position == null) return <span className="text-xs text-muted-foreground">--</span>;

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-medium tabular-nums text-foreground">{position}</span>
      {change != null && change !== 0 && (
        <span
          className={`inline-flex items-center text-[10px] font-semibold ${
            change > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }`}
          title={change > 0 ? `Improved ${change} positions` : `Dropped ${Math.abs(change)} positions`}
        >
          {change > 0 ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )}
          {Math.abs(change)}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clicks cell
// ---------------------------------------------------------------------------

function ClicksCell({ clicks, change }: { clicks: number | null | undefined; change: number | null | undefined }) {
  if (clicks == null) return <span className="text-xs text-muted-foreground">--</span>;

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm tabular-nums text-foreground">{formatVolume(clicks)}</span>
      {change != null && change !== 0 && (
        <span
          className={`inline-flex items-center text-[10px] font-semibold ${
            change > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {change > 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

function exportKeywordsCsv(keywords: any[]) {
  const headers = [
    "Keyword",
    "Rank",
    "Rank Change",
    "Search Volume",
    "SEO Clicks",
    "Click Change",
    "Difficulty",
    "CPC",
    "Intent",
    "Opportunity Score",
    "SERP Features",
    "SERP #1",
    "Is Question",
    "Mobile %",
    "Organic Click %",
    "Zero-Click %",
    "Source",
  ];

  const rows = keywords.map((kw: any) => [
    `"${(kw.keyword || "").replace(/"/g, '""')}"`,
    kw.rankingPosition ?? "",
    kw.rankingPositionChange ?? "",
    kw.searchVolume ?? "",
    kw.seoClicks ?? "",
    kw.seoClicksChange ?? "",
    kw.keywordDifficulty ?? kw.difficulty ?? "",
    kw.cpc ?? "",
    kw.intent ?? "",
    kw.opportunityScore ?? "",
    `"${(kw.serpFeatures || "").replace(/"/g, '""')}"`,
    `"${(kw.serpFirstResult || "").replace(/"/g, '""')}"`,
    kw.isQuestion ? "Yes" : "No",
    kw.percentMobileSearches ?? "",
    kw.percentOrganicClicks ?? "",
    kw.percentNotClicked ?? "",
    kw.source ?? "",
  ]);

  const csv = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `keywords-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function KeywordResearchPage({ user }: { user: AuthUser }) {
  const { data: agents, isLoading: loadingAgents } = useQuery(getSeoAgents);

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"keyword" | "domain" | "overview" | "gap">("keyword");
  const [searchTerm, setSearchTerm] = useState("");
  const [domainUrl, setDomainUrl] = useState("");
  const [searching, setSearching] = useState(false);
  const [sortField, setSortField] = useState<SortField>("opportunityScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [generatingKeyword, setGeneratingKeyword] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [clearingAll, setClearingAll] = useState(false);
  const [lastSearchTime, setLastSearchTime] = useState<string | null>(null);
  const pendingDomainSearch = useRef<string | null>(null);
  const [lastSearchLabel, setLastSearchLabel] = useState<string>("");
  const [viewMode, setViewMode] = useState<"latest" | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Domain Overview state
  const [overviewDomain, setOverviewDomain] = useState("");
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  // Keyword Gap state
  const [gapDomain1, setGapDomain1] = useState("");
  const [gapDomain2, setGapDomain2] = useState("");
  const [gapIsIntersection, setGapIsIntersection] = useState(false);
  const [gapLoading, setGapLoading] = useState(false);
  const [gapData, setGapData] = useState<any>(null);
  const [gapError, setGapError] = useState<string | null>(null);

  // Resolve the active agent id
  const activeAgentId = selectedAgentId ?? agents?.[0]?.id ?? null;

  const { data: rawKeywords, isLoading: loadingKeywords } = useQuery(
    getSeoKeywords,
    activeAgentId ? { agentId: activeAgentId, sortBy: "opportunityScore" } : undefined,
    { enabled: !!activeAgentId },
  );

  // Separate latest search results from all keywords
  const latestKeywords = useMemo(() => {
    if (!rawKeywords || !lastSearchTime) return [];
    return rawKeywords.filter((k: any) => k.createdAt && new Date(k.createdAt) >= new Date(lastSearchTime));
  }, [rawKeywords, lastSearchTime]);

  // Client-side filter + sort (all results, before pagination)
  const allFilteredKeywords = useMemo(() => {
    if (!rawKeywords || rawKeywords.length === 0) return [];
    let source = viewMode === "latest" && lastSearchTime ? latestKeywords : rawKeywords;
    if (filterText.trim()) {
      const q = filterText.trim().toLowerCase();
      source = source.filter((k: any) => k.keyword?.toLowerCase().includes(q));
    }
    const sorted = [...source].sort((a: any, b: any) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === "keyword" || sortField === "intent") {
        aVal = (aVal || "").toLowerCase();
        bVal = (bVal || "").toLowerCase();
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      aVal = aVal ?? -1;
      bVal = bVal ?? -1;
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [rawKeywords, latestKeywords, sortField, sortDir, filterText, viewMode, lastSearchTime]);

  // Pagination
  const totalCount = allFilteredKeywords.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, totalCount);

  const keywords = useMemo(() => {
    if (totalCount <= PAGE_SIZE) return allFilteredKeywords;
    return allFilteredKeywords.slice(pageStart, pageEnd);
  }, [allFilteredKeywords, pageStart, pageEnd, totalCount]);

  // Reset page when filter/sort/view changes
  useMemo(() => {
    setCurrentPage(1);
  }, [filterText, viewMode, sortField, sortDir]);

  // Stats (computed from ALL filtered keywords, not just current page)
  const stats = useMemo(() => {
    if (!allFilteredKeywords || allFilteredKeywords.length === 0) return null;
    const count = allFilteredKeywords.length;
    const avgVol = allFilteredKeywords.reduce((sum: number, k: any) => sum + (k.searchVolume || 0), 0) / count;
    const avgDiff =
      allFilteredKeywords.reduce((sum: number, k: any) => sum + (k.keywordDifficulty || k.difficulty || 0), 0) / count;
    const avgCpc = allFilteredKeywords.reduce((sum: number, k: any) => sum + (k.cpc || 0), 0) / count;

    // Avg clicks (only non-null)
    const withClicks = allFilteredKeywords.filter((k: any) => k.seoClicks != null);
    const avgClicks = withClicks.length > 0
      ? withClicks.reduce((sum: number, k: any) => sum + (k.seoClicks || 0), 0) / withClicks.length
      : null;

    // Avg rank (only non-null)
    const withRank = allFilteredKeywords.filter((k: any) => k.rankingPosition != null);
    const avgRank = withRank.length > 0
      ? withRank.reduce((sum: number, k: any) => sum + (k.rankingPosition || 0), 0) / withRank.length
      : null;

    return { count, avgVol, avgDiff, avgCpc, avgClicks, avgRank };
  }, [allFilteredKeywords]);

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  async function handleKeywordSearch() {
    if (!activeAgentId) return;
    const term = searchTerm.trim();
    if (!term) {
      toast({ title: "Enter a keyword", description: "Please type a keyword to research.", variant: "destructive" });
      return;
    }
    setSearching(true);
    const searchStart = new Date().toISOString();
    try {
      const result = await researchKeywords({ agentId: activeAgentId, keyword: term });
      const added = (result as any)?.added ?? 0;
      toast({
        title: "Keywords discovered!",
        description: `Found ${added} keyword opportunities.`,
      });
      if (added > 0) {
        setLastSearchTime(searchStart);
        setLastSearchLabel(`"${term}"`);
        setViewMode("latest");
        setFilterText("");
        setCurrentPage(1);
      }
      setSearchTerm("");
    } catch (err: any) {
      toast({ title: "Research failed", description: err?.message ?? "Failed to research keywords.", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  }

  // Auto-trigger domain search when switching from Domain Overview
  useEffect(() => {
    if (pendingDomainSearch.current && activeTab === "domain" && activeAgentId && !searching) {
      const domain = pendingDomainSearch.current;
      pendingDomainSearch.current = null;
      setDomainUrl(domain);
      // Trigger search after a tick so domainUrl state is set
      setTimeout(() => {
        handleDomainSearchDirect(domain);
      }, 100);
    }
  }, [activeTab, activeAgentId]);

  async function handleDomainSearchDirect(domainOverride?: string) {
    if (!activeAgentId) return;
    const domain = (domainOverride || domainUrl).trim();
    if (!domain) {
      toast({ title: "Enter a domain", description: "Please type a competitor domain to analyze.", variant: "destructive" });
      return;
    }
    setSearching(true);
    const searchStart = new Date().toISOString();
    try {
      const result = await researchKeywords({ agentId: activeAgentId, domain, source: "domain" });
      const added = (result as any)?.added ?? 0;
      toast({
        title: "Competitor keywords discovered!",
        description: `Found ${added} keyword opportunities from ${domain}.`,
      });
      if (added > 0) {
        setLastSearchTime(searchStart);
        setLastSearchLabel(domain);
        setViewMode("latest");
        setFilterText("");
        setCurrentPage(1);
      }
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err?.message ?? "Failed to analyze competitor.", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  }

  async function handleDomainSearch() {
    if (!activeAgentId) return;
    const domain = domainUrl.trim();
    if (!domain) {
      toast({ title: "Enter a domain", description: "Please type a competitor domain to analyze.", variant: "destructive" });
      return;
    }
    setSearching(true);
    const searchStart = new Date().toISOString();
    try {
      const result = await researchKeywords({ agentId: activeAgentId, domain, source: "domain" });
      const added = (result as any)?.added ?? 0;
      toast({
        title: "Competitor keywords discovered!",
        description: `Found ${added} keyword opportunities from ${domain}.`,
      });
      if (added > 0) {
        setLastSearchTime(searchStart);
        setLastSearchLabel(domain);
        setViewMode("latest");
        setFilterText("");
        setCurrentPage(1);
      }
      setDomainUrl("");
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err?.message ?? "Failed to analyze competitor.", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  }

  async function handleGenerateArticle(kw: any) {
    if (!activeAgentId) return;
    setGeneratingKeyword(kw.keyword);
    try {
      await generateSeoPost({ agentId: activeAgentId, keyword: kw.keyword });
      toast({
        title: "Article generated!",
        description: `SEO article created for "${kw.keyword}".`,
      });
    } catch (err: any) {
      toast({
        title: "Generation failed",
        description: err?.message ?? "Failed to generate article.",
        variant: "destructive",
      });
    } finally {
      setGeneratingKeyword(null);
    }
  }

  async function handleDelete(kw: any) {
    setDeletingId(kw.id);
    try {
      await deleteSeoKeyword({ id: kw.id });
      toast({ title: "Keyword removed", description: `"${kw.keyword}" has been deleted.` });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.message ?? "Failed to delete keyword.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleClearAll() {
    if (!rawKeywords || rawKeywords.length === 0) return;
    if (!window.confirm(`Delete all ${rawKeywords.length} keywords? This cannot be undone.`)) return;
    setClearingAll(true);
    try {
      for (const kw of rawKeywords) {
        await deleteSeoKeyword({ id: (kw as any).id });
      }
      toast({ title: "All keywords cleared", description: "Your keyword list has been reset." });
      setCurrentPage(1);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to clear keywords.", variant: "destructive" });
    } finally {
      setClearingAll(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Domain Overview handler
  // ---------------------------------------------------------------------------

  async function handleDomainOverview() {
    const domain = overviewDomain.trim();
    if (!domain) {
      toast({ title: "Enter a domain", description: "Please type a domain to analyze.", variant: "destructive" });
      return;
    }
    setOverviewLoading(true);
    setOverviewError(null);
    setOverviewData(null);
    try {
      const result = await fetchDomainStats({ domain });
      if (!result || (!result.stats && !result.organicKeywords)) {
        setOverviewError("No data found for this domain.");
      } else {
        setOverviewData(result);
      }
    } catch (err: any) {
      setOverviewError(err?.message ?? "Failed to fetch domain stats.");
      toast({ title: "Analysis failed", description: err?.message ?? "Failed to fetch domain stats.", variant: "destructive" });
    } finally {
      setOverviewLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Keyword Gap handler
  // ---------------------------------------------------------------------------

  async function handleKeywordGap() {
    const d1 = gapDomain1.trim();
    const d2 = gapDomain2.trim();
    if (!d1 || !d2) {
      toast({ title: "Enter both domains", description: "Please type both domains to compare.", variant: "destructive" });
      return;
    }
    setGapLoading(true);
    setGapError(null);
    setGapData(null);
    try {
      const result = await fetchKeywordGap({ domains: [d1, d2], isIntersection: gapIsIntersection });
      setGapData(result);
    } catch (err: any) {
      setGapError(err?.message ?? "Failed to fetch keyword gap data.");
      toast({ title: "Comparison failed", description: err?.message ?? "Failed to fetch keyword gap data.", variant: "destructive" });
    } finally {
      setGapLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loadingAgents) {
    return (
      <UserDashboardLayout user={user}>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </UserDashboardLayout>
    );
  }

  // ---------------------------------------------------------------------------
  // No agents
  // ---------------------------------------------------------------------------

  if (!agents || agents.length === 0) {
    return (
      <UserDashboardLayout user={user}>
        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Search className="h-5 w-5 text-[#bd711d]" />
              <h1 className="text-2xl font-bold text-foreground">Keyword Research</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Discover keyword opportunities for your SEO content strategy.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#bd711d]/10 mb-4">
              <TrendingUp className="h-10 w-10 text-[#bd711d]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No SEO project yet</h3>
            <p className="text-muted-foreground text-sm max-w-md text-center mb-6">
              Create your first SEO project to start researching keywords.
            </p>
            <Button asChild className="rounded-xl bg-[#bd711d] hover:bg-[#a5631a] text-white">
              <Link to="/extensions/seo-agent/create">
                <Sparkles className="h-4 w-4 mr-1.5" />
                Create Your First SEO Project
              </Link>
            </Button>
          </div>
        </div>
      </UserDashboardLayout>
    );
  }

  // ---------------------------------------------------------------------------
  // Column header helper
  // ---------------------------------------------------------------------------

  const ColHeader = ({ field, label, className }: { field: SortField; label: string; className?: string }) => (
    <th
      className={`px-3 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors ${className ?? ""}`}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center">
        {label}
        <SortIndicator field={field} sortField={sortField} sortDir={sortDir} />
      </span>
    </th>
  );

  // ---------------------------------------------------------------------------
  // Pagination helpers
  // ---------------------------------------------------------------------------

  function getPageNumbers(): (number | "...")[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [1];
    if (safePage > 3) pages.push("...");
    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (safePage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <UserDashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Search className="h-5 w-5 text-[#bd711d]" />
              <h1 className="text-2xl font-bold text-foreground">Keyword Research</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Discover keyword opportunities and analyze competitor strategies.
            </p>
          </div>

          {/* Agent selector (top-right, only if multiple) */}
          {agents.length > 1 && (
            <select
              value={activeAgentId ?? ""}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="h-9 rounded-lg border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#bd711d]/30 focus:border-[#bd711d] min-w-[180px]"
            >
              {agents.map((agent: any) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Tabs: Keyword Research / Competitor Analysis */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "keyword" | "domain" | "overview" | "gap")}>
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="keyword" className="rounded-lg px-5 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Search className="h-4 w-4 mr-2" />
              Keyword Research
            </TabsTrigger>
            <TabsTrigger value="domain" className="rounded-lg px-5 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Globe className="h-4 w-4 mr-2" />
              Competitor Analysis
            </TabsTrigger>
            <TabsTrigger value="overview" className="rounded-lg px-5 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Globe className="h-4 w-4 mr-2" />
              Domain Overview
            </TabsTrigger>
            <TabsTrigger value="gap" className="rounded-lg px-5 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Columns3 className="h-4 w-4 mr-2" />
              Keyword Gap
            </TabsTrigger>
          </TabsList>

          {/* Keyword Research Tab */}
          <TabsContent value="keyword" className="mt-4">
            <div className="rounded-xl border bg-card p-5">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter a seed keyword (e.g. 'email marketing')"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !searching && handleKeywordSearch()}
                    className="h-11 rounded-xl pl-9"
                    disabled={searching}
                  />
                </div>
                <Button
                  onClick={handleKeywordSearch}
                  disabled={searching || !searchTerm.trim()}
                  className="h-11 rounded-xl bg-[#bd711d] hover:bg-[#a5631a] text-white px-6"
                >
                  {searching ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Search className="h-4 w-4 mr-1.5" />}
                  Research
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Discovers 20-30 related keywords with volume, difficulty, and intent data. Costs 10 credits.
              </p>
            </div>
          </TabsContent>

          {/* Competitor Analysis Tab */}
          <TabsContent value="domain" className="mt-4">
            <div className="rounded-xl border bg-card p-5">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter a competitor domain (e.g. 'hubspot.com')"
                    value={domainUrl}
                    onChange={(e) => setDomainUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !searching && handleDomainSearch()}
                    className="h-11 rounded-xl pl-9"
                    disabled={searching}
                  />
                </div>
                <Button
                  onClick={handleDomainSearch}
                  disabled={searching || !domainUrl.trim()}
                  className="h-11 rounded-xl bg-[#bd711d] hover:bg-[#a5631a] text-white px-6"
                >
                  {searching ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Globe className="h-4 w-4 mr-1.5" />}
                  Analyze
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Pulls organic keywords from a competitor domain via SpyFu. Costs 10 credits.
              </p>
            </div>
          </TabsContent>

          {/* Domain Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="rounded-xl border bg-card p-5">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter a domain (e.g. 'hubspot.com')"
                    value={overviewDomain}
                    onChange={(e) => setOverviewDomain(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !overviewLoading && handleDomainOverview()}
                    className="h-11 rounded-xl pl-9"
                    disabled={overviewLoading}
                  />
                </div>
                <Button
                  onClick={handleDomainOverview}
                  disabled={overviewLoading || !overviewDomain.trim()}
                  className="h-11 rounded-xl bg-[#bd711d] hover:bg-[#a5631a] text-white px-6"
                >
                  {overviewLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Globe className="h-4 w-4 mr-1.5" />}
                  Analyze
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Get a full SEO and PPC overview of any domain via SpyFu. Costs 10 credits.
              </p>
            </div>

            {overviewLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {overviewError && !overviewLoading && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
                <p className="text-sm text-destructive">{overviewError}</p>
              </div>
            )}

            {overviewData && !overviewLoading && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Domain Strength */}
                  <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full border-4 flex-shrink-0 ${
                      (overviewData.stats?.strength ?? 0) >= 60
                        ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                        : (overviewData.stats?.strength ?? 0) >= 30
                        ? "border-amber-500 text-amber-600 dark:text-amber-400"
                        : "border-red-500 text-red-600 dark:text-red-400"
                    }`}>
                      <span className="text-lg font-bold">{overviewData.stats?.strength ?? 0}</span>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Domain Strength</p>
                      <p className="text-sm font-medium text-foreground">out of 100</p>
                    </div>
                  </div>

                  {/* Monthly Organic Traffic */}
                  <StatCard
                    icon={<BarChart3 className="h-4 w-4 text-[#bd711d]" />}
                    label="Monthly Organic Traffic"
                    value={formatVolume(overviewData.stats?.monthlyOrganicClicks)}
                  />

                  {/* Traffic Value */}
                  <StatCard
                    icon={<DollarSign className="h-4 w-4 text-[#bd711d]" />}
                    label="Traffic Value"
                    value={formatUsd(overviewData.stats?.monthlyOrganicValue)}
                  />

                  {/* Organic Keywords */}
                  <StatCard
                    icon={<Hash className="h-4 w-4 text-[#bd711d]" />}
                    label="Organic Keywords"
                    value={formatVolume(overviewData.stats?.totalOrganicResults)}
                  />

                  {/* Avg Organic Rank */}
                  <StatCard
                    icon={<Target className="h-4 w-4 text-[#bd711d]" />}
                    label="Avg Organic Rank"
                    value={overviewData.stats?.averageOrganicRank != null ? Math.round(overviewData.stats?.averageOrganicRank).toString() : "--"}
                  />

                  {/* Monthly PPC Budget */}
                  <StatCard
                    icon={<DollarSign className="h-4 w-4 text-[#bd711d]" />}
                    label="Monthly PPC Budget"
                    value={formatUsd(overviewData.stats?.monthlyBudget)}
                  />

                  {/* Paid Keywords */}
                  <StatCard
                    icon={<Hash className="h-4 w-4 text-[#bd711d]" />}
                    label="Paid Keywords"
                    value={formatVolume(overviewData.stats?.totalAdsPurchased)}
                  />

                  {/* Monthly Paid Clicks */}
                  <StatCard
                    icon={<MousePointerClick className="h-4 w-4 text-[#bd711d]" />}
                    label="Monthly Paid Clicks"
                    value={formatVolume(overviewData.stats?.monthlyPaidClicks)}
                  />
                </div>

                <p className="text-[11px] text-muted-foreground text-center">
                  Data from SpyFu {overviewData.stats?.searchMonth != null && overviewData.stats?.searchYear != null
                    ? `\u2022 ${overviewData.stats?.searchMonth}/${overviewData.stats?.searchYear}`
                    : ""}
                </p>

                {/* Top Organic Keywords Table */}
                {overviewData.organicKeywords && overviewData.organicKeywords.length > 0 && (
                  <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="flex items-center justify-between border-b px-5 py-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-foreground font-semibold text-sm">Top Organic Keywords</h3>
                        <Badge variant="secondary" className="text-[10px] h-5">{overviewData.organicKeywords.length}</Badge>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground min-w-[200px]">Keyword</th>
                            <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Rank</th>
                            <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Volume</th>
                            <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Clicks</th>
                            <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Difficulty</th>
                            <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">CPC</th>
                            <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">SERP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overviewData.organicKeywords.map((kw: any, idx: number) => (
                            <tr key={idx} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3">
                                <span className="text-sm font-medium">{kw.keyword}</span>
                                {kw.isQuestion && <span className="ml-1.5 text-blue-500 text-[10px]">?</span>}
                              </td>
                              <td className="px-4 py-3">
                                {kw.rankingPosition != null ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm font-semibold">{kw.rankingPosition}</span>
                                    {kw.rankingPositionChange != null && kw.rankingPositionChange !== 0 && (
                                      <span className={`text-[10px] font-medium ${kw.rankingPositionChange > 0 ? "text-emerald-600" : "text-red-500"}`}>
                                        {kw.rankingPositionChange > 0 ? `+${kw.rankingPositionChange}` : kw.rankingPositionChange}
                                      </span>
                                    )}
                                  </div>
                                ) : <span className="text-xs text-muted-foreground">--</span>}
                              </td>
                              <td className="px-4 py-3 text-sm">{kw.searchVolume ? formatVolume(kw.searchVolume) : "--"}</td>
                              <td className="px-4 py-3 text-sm">{kw.seoClicks ? formatVolume(kw.seoClicks) : "--"}</td>
                              <td className="px-4 py-3">
                                {kw.keywordDifficulty != null ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                                      <div className={`h-full rounded-full ${difficultyColor(kw.keywordDifficulty)}`} style={{ width: `${kw.keywordDifficulty}%` }} />
                                    </div>
                                    <span className={`text-xs font-medium ${difficultyTextColor(kw.keywordDifficulty)}`}>{kw.keywordDifficulty}</span>
                                  </div>
                                ) : <span className="text-xs text-muted-foreground">--</span>}
                              </td>
                              <td className="px-4 py-3 text-sm">{kw.cpc ? `$${kw.cpc.toFixed(2)}` : "--"}</td>
                              <td className="px-4 py-3">
                                {kw.serpFeatures ? (
                                  <div className="flex gap-0.5">
                                    {kw.serpFeatures.split(",").map((f: string) => {
                                      const t = f.trim();
                                      const label = t === "Images" ? "I" : t === "Videos" ? "V" : t === "Maps" ? "M" : t === "Shopping" ? "S" : t === "People Also Ask" ? "P" : t.charAt(0);
                                      return <span key={t} className="text-[9px] px-1 py-0.5 rounded bg-muted font-medium" title={t}>{label}</span>;
                                    })}
                                  </div>
                                ) : <span className="text-xs text-muted-foreground">--</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Keyword Gap Tab */}
          <TabsContent value="gap" className="mt-4 space-y-4">
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Your domain (e.g. 'yoursite.com')"
                    value={gapDomain1}
                    onChange={(e) => setGapDomain1(e.target.value)}
                    className="h-11 rounded-xl pl-9"
                    disabled={gapLoading}
                  />
                </div>
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Competitor domain (e.g. 'competitor.com')"
                    value={gapDomain2}
                    onChange={(e) => setGapDomain2(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !gapLoading && handleKeywordGap()}
                    className="h-11 rounded-xl pl-9"
                    disabled={gapLoading}
                  />
                </div>
                <Button
                  onClick={handleKeywordGap}
                  disabled={gapLoading || !gapDomain1.trim() || !gapDomain2.trim()}
                  className="h-11 rounded-xl bg-[#bd711d] hover:bg-[#a5631a] text-white px-6"
                >
                  {gapLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Columns3 className="h-4 w-4 mr-1.5" />}
                  Compare
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex rounded-lg border bg-muted/50 p-0.5">
                  <button
                    onClick={() => setGapIsIntersection(false)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      !gapIsIntersection
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All Keywords
                  </button>
                  <button
                    onClick={() => setGapIsIntersection(true)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      gapIsIntersection
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Shared Keywords
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Costs 10 credits per analysis
                </p>
              </div>
            </div>

            {gapLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {gapError && !gapLoading && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
                <p className="text-sm text-destructive">{gapError}</p>
              </div>
            )}

            {gapData && !gapLoading && (
              <div className="space-y-4">
                {/* Gap stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatCard
                    icon={<Hash className="h-4 w-4 text-[#bd711d]" />}
                    label="Total Keywords"
                    value={(gapData.keywords?.length ?? 0).toLocaleString()}
                  />
                  <StatCard
                    icon={<BarChart3 className="h-4 w-4 text-[#bd711d]" />}
                    label="Avg Volume"
                    value={formatVolume(
                      gapData.keywords?.length > 0
                        ? Math.round(gapData.keywords.reduce((s: number, k: any) => s + (k.searchVolume || 0), 0) / gapData.keywords.length)
                        : 0
                    )}
                  />
                  <StatCard
                    icon={<Target className="h-4 w-4 text-[#bd711d]" />}
                    label="Avg Difficulty"
                    value={
                      gapData.keywords?.length > 0
                        ? Math.round(gapData.keywords.reduce((s: number, k: any) => s + (k.keywordDifficulty || 0), 0) / gapData.keywords.length).toString()
                        : "--"
                    }
                  />
                </div>

                {/* Gap data table */}
                <div className="rounded-xl border bg-card overflow-hidden">
                  {gapData.keywords && gapData.keywords.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground min-w-[200px]">Keyword</th>
                            <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Volume</th>
                            <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Difficulty</th>
                            <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">CPC</th>
                            <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">SERP Features</th>
                            <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">#1 Domain</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gapData.keywords.map((kw: any, idx: number) => {
                            const diff = kw.keywordDifficulty ?? 0;
                            return (
                              <tr key={idx} className="border-b last:border-b-0 transition-colors hover:bg-muted/40">
                                <td className="px-3 py-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-medium text-foreground">{kw.keyword}</span>
                                    {kw.isQuestion && (
                                      <HelpCircle className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <span className="text-sm text-foreground tabular-nums">{formatVolume(kw.searchVolume)}</span>
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${difficultyColor(diff)}`}
                                        style={{ width: `${Math.min(diff, 100)}%` }}
                                      />
                                    </div>
                                    <span className={`text-xs font-medium tabular-nums ${difficultyTextColor(diff)}`}>
                                      {diff}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <span className="text-sm text-foreground tabular-nums">{formatCpc(kw.cpc)}</span>
                                </td>
                                <td className="px-3 py-3">
                                  <SerpBadges features={kw.serpFeatures} />
                                </td>
                                <td className="px-3 py-3">
                                  <span className="text-sm text-muted-foreground truncate max-w-[200px] block">{kw.serpFirstResult || "--"}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-sm text-muted-foreground">No keyword gap data found for these domains.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Stats Summary Row — 6 cards (only for keyword/domain tabs) */}
        {(activeTab === "keyword" || activeTab === "domain") && stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              icon={<Hash className="h-4 w-4 text-[#bd711d]" />}
              label="Total Keywords"
              value={stats.count.toLocaleString()}
            />
            <StatCard
              icon={<BarChart3 className="h-4 w-4 text-[#bd711d]" />}
              label="Avg Volume"
              value={formatVolume(Math.round(stats.avgVol))}
            />
            <StatCard
              icon={<MousePointerClick className="h-4 w-4 text-[#bd711d]" />}
              label="Avg Clicks"
              value={stats.avgClicks != null ? formatVolume(Math.round(stats.avgClicks)) : "--"}
            />
            <StatCard
              icon={<Target className="h-4 w-4 text-[#bd711d]" />}
              label="Avg Difficulty"
              value={Math.round(stats.avgDiff).toString()}
            />
            <StatCard
              icon={<DollarSign className="h-4 w-4 text-[#bd711d]" />}
              label="Avg CPC"
              value={formatCpc(stats.avgCpc)}
            />
            <StatCard
              icon={<TrendingUp className="h-4 w-4 text-[#bd711d]" />}
              label="Avg Rank"
              value={stats.avgRank != null ? Math.round(stats.avgRank).toString() : "--"}
            />
          </div>
        )}

        {/* Filter + View Toggle + Actions Bar (only for keyword/domain tabs) */}
        {(activeTab === "keyword" || activeTab === "domain") && rawKeywords && rawKeywords.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            {/* View mode toggle */}
            {lastSearchTime && latestKeywords.length > 0 && (
              <div className="flex rounded-lg border bg-muted/50 p-0.5">
                <button
                  onClick={() => { setViewMode("latest"); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === "latest"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Latest: {lastSearchLabel} ({latestKeywords.length})
                </button>
                <button
                  onClick={() => { setViewMode("all"); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === "all"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All Keywords ({rawKeywords.length})
                </button>
              </div>
            )}

            {/* Text filter */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Filter keywords..."
                value={filterText}
                onChange={(e) => { setFilterText(e.target.value); setCurrentPage(1); }}
                className="h-9 rounded-lg pl-9 text-sm"
              />
            </div>
            {(filterText || viewMode === "latest") && (
              <span className="text-xs text-muted-foreground">
                Showing {allFilteredKeywords.length} of {rawKeywords.length}
              </span>
            )}

            {/* Export CSV + Clear All */}
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportKeywordsCsv(allFilteredKeywords)}
                disabled={allFilteredKeywords.length === 0}
                className="rounded-lg text-xs"
              >
                <Download className="h-3 w-3 mr-1.5" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                disabled={clearingAll}
                className="rounded-lg text-xs text-destructive hover:text-destructive"
              >
                {clearingAll ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Trash2 className="h-3 w-3 mr-1.5" />}
                Clear All
              </Button>
            </div>
          </div>
        )}

        {/* Data Table (only for keyword/domain tabs) */}
        {(activeTab === "keyword" || activeTab === "domain") && <div className="rounded-xl border bg-card overflow-hidden">
          {loadingKeywords ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : keywords && keywords.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <ColHeader field="keyword" label="Keyword" className="min-w-[200px]" />
                      <ColHeader field="rankingPosition" label="Rank" />
                      <ColHeader field="searchVolume" label="Volume" />
                      <ColHeader field="seoClicks" label="Clicks" />
                      <ColHeader field="keywordDifficulty" label="Difficulty" />
                      <ColHeader field="cpc" label="CPC" />
                      <ColHeader field="intent" label="Intent" />
                      <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                        SERP
                      </th>
                      <ColHeader field="opportunityScore" label="Score" />
                      <th className="px-3 py-3 text-right text-[11px] uppercase tracking-wider font-semibold text-muted-foreground w-[120px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.map((kw: any) => {
                      const diff = kw.keywordDifficulty ?? kw.difficulty ?? 0;
                      const score = kw.opportunityScore ?? 0;
                      const isGenerating = generatingKeyword === kw.keyword;
                      const isDeleting = deletingId === kw.id;
                      const isAiSource = kw.source === "openai";

                      return (
                        <tr
                          key={kw.id}
                          className="group border-b last:border-b-0 transition-colors hover:bg-muted/40"
                        >
                          {/* Keyword */}
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-foreground">{kw.keyword}</span>
                              {isAiSource && (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                                  title="AI-estimated data (not from SpyFu)"
                                >
                                  AI
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Rank */}
                          <td className="px-3 py-3">
                            <RankCell position={kw.rankingPosition} change={kw.rankingPositionChange} />
                          </td>

                          {/* Search Volume */}
                          <td className="px-3 py-3">
                            <span className="text-sm text-foreground tabular-nums">
                              {formatVolume(kw.searchVolume)}
                            </span>
                          </td>

                          {/* Clicks */}
                          <td className="px-3 py-3">
                            <ClicksCell clicks={kw.seoClicks} change={kw.seoClicksChange} />
                          </td>

                          {/* Difficulty */}
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${difficultyColor(diff)}`}
                                  style={{ width: `${Math.min(diff, 100)}%` }}
                                />
                              </div>
                              <span className={`text-xs font-medium tabular-nums ${difficultyTextColor(diff)}`}>
                                {diff}
                              </span>
                            </div>
                          </td>

                          {/* CPC */}
                          <td className="px-3 py-3">
                            <span className="text-sm text-foreground tabular-nums">
                              {formatCpc(kw.cpc)}
                            </span>
                          </td>

                          {/* Intent */}
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              {kw.intent ? (
                                <span
                                  className={`inline-flex text-[11px] px-2 py-0.5 rounded-full font-medium capitalize ${
                                    INTENT_COLORS[kw.intent] ?? "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {kw.intent}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">--</span>
                              )}
                              {kw.isQuestion && (
                                <span title="Question-based keyword">
                                  <HelpCircle className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                                </span>
                              )}
                            </div>
                          </td>

                          {/* SERP Features */}
                          <td className="px-3 py-3">
                            <SerpBadges features={kw.serpFeatures} />
                          </td>

                          {/* Opportunity Score */}
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-md tabular-nums ${scoreVariant(score)}`}
                            >
                              {score}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-3 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 rounded-md text-[11px] gap-1 px-2 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
                                disabled={isGenerating}
                                onClick={() => handleGenerateArticle(kw)}
                              >
                                {isGenerating ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Sparkles className="h-3 w-3" />
                                )}
                                {isGenerating ? "Generating..." : "Generate"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 rounded-md hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                                disabled={isDeleting}
                                onClick={() => handleDelete(kw)}
                              >
                                {isDeleting ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalCount > PAGE_SIZE && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    Showing {pageStart + 1}-{pageEnd} of {totalCount} keywords
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-lg"
                      disabled={safePage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {getPageNumbers().map((pg, idx) =>
                      pg === "..." ? (
                        <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-muted-foreground">
                          ...
                        </span>
                      ) : (
                        <Button
                          key={pg}
                          variant={pg === safePage ? "default" : "outline"}
                          size="sm"
                          className={`h-8 w-8 p-0 rounded-lg text-xs ${
                            pg === safePage ? "bg-[#bd711d] hover:bg-[#a5631a] text-white" : ""
                          }`}
                          onClick={() => setCurrentPage(pg as number)}
                        >
                          {pg}
                        </Button>
                      ),
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-lg"
                      disabled={safePage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Empty state with two cards */
            <div className="p-8">
              <div className="text-center mb-6">
                <h3 className="text-base font-semibold text-foreground mb-1">No keywords yet</h3>
                <p className="text-sm text-muted-foreground">Choose a research method to get started.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
                {/* Keyword Research card */}
                <button
                  onClick={() => setActiveTab("keyword")}
                  className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-all hover:border-[#bd711d]/50 hover:bg-[#bd711d]/5 cursor-pointer"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#bd711d]/10">
                    <Search className="h-6 w-6 text-[#bd711d]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Research Keywords</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter a seed keyword and discover related opportunities with volume and difficulty data.
                    </p>
                  </div>
                </button>

                {/* Competitor Analysis card */}
                <button
                  onClick={() => setActiveTab("domain")}
                  className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-all hover:border-[#bd711d]/50 hover:bg-[#bd711d]/5 cursor-pointer"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#bd711d]/10">
                    <Globe className="h-6 w-6 text-[#bd711d]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Analyze Competitor</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter a competitor domain to uncover the keywords they rank for organically.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>}
      </div>
    </UserDashboardLayout>
  );
}
