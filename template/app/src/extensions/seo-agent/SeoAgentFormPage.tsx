import { type AuthUser } from "wasp/auth";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "wasp/client/operations";
import {
  getSeoAgent,
  createSeoAgent,
  updateSeoAgent,
  getCompanies,
} from "wasp/client/operations";
import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import { Button } from "../../client/components/ui/button";
import { Input } from "../../client/components/ui/input";
import { Label } from "../../client/components/ui/label";
import { Textarea } from "../../client/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../client/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../client/components/ui/card";
import { Separator } from "../../client/components/ui/separator";
import { toast } from "../../client/hooks/use-toast";
import UserDashboardLayout from "../../user-dashboard/layout/UserDashboardLayout";

const TONES = [
  "Professional",
  "Casual",
  "Funny",
  "Excited",
  "Witty",
  "Sarcastic",
  "Bold",
  "Dramatic",
  "Feminine",
  "Masculine",
] as const;

const CONTENT_TYPES = ["internal_blog", "external_blog", "social"] as const;

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export default function SeoAgentFormPage({ user }: { user: AuthUser }) {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const isEdit = !!params.id;

  const { data: existing, isLoading: loadingExisting } = useQuery(
    getSeoAgent,
    isEdit ? { id: params.id! } : undefined,
    { enabled: isEdit },
  );

  const { data: companies } = useQuery(getCompanies);

  // Form state
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState<string>("none");
  const [siteUrl, setSiteUrl] = useState("");
  const [niche, setNiche] = useState("");
  const [seedKeywords, setSeedKeywords] = useState("");
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [targetWordCount, setTargetWordCount] = useState(1500);
  const [tone, setTone] = useState("");
  const [language, setLanguage] = useState("en");
  const [aiProvider, setAiProvider] = useState("openai");
  const [scheduleDays, setScheduleDays] = useState<string[]>([]);
  const [dailyContentCount, setDailyContentCount] = useState(1);
  const [wpUrl, setWpUrl] = useState("");
  const [wpUsername, setWpUsername] = useState("");
  const [wpPassword, setWpPassword] = useState("");
  const [wpCategoryId, setWpCategoryId] = useState("");
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (existing) {
      setName(existing.name ?? "");
      setCompanyId(existing.companyId ?? "none");
      setSiteUrl(existing.siteUrl ?? "");
      setNiche(existing.niche ?? "");
      setSeedKeywords((existing.seedKeywords ?? []).join("\n"));
      setContentTypes(existing.contentTypes ?? []);
      setTargetWordCount(existing.targetWordCount ?? 1500);
      setTone(existing.tone ?? "");
      setLanguage(existing.language ?? "en");
      setAiProvider(existing.aiProvider ?? "openai");
      setScheduleDays(existing.scheduleDays ?? []);
      setDailyContentCount(existing.dailyContentCount ?? 1);
      setWpUrl(existing.wpUrl ?? "");
      setWpUsername(existing.wpUsername ?? "");
      // Don't pre-fill password for security
      setWpPassword("");
      setWpCategoryId(existing.wpCategoryId ?? "");
    }
  }, [existing]);

  function toggleArrayItem(arr: string[], item: string, setter: (v: string[]) => void) {
    if (arr.includes(item)) {
      setter(arr.filter((i) => i !== item));
    } else {
      setter([...arr, item]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      toast({ title: "Validation", description: "Agent name is required.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name: name.trim(),
        companyId: companyId !== "none" ? companyId : undefined,
        siteUrl: siteUrl.trim() || undefined,
        niche: niche.trim() || undefined,
        seedKeywords: seedKeywords
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        contentTypes,
        targetWordCount,
        tone: tone || undefined,
        language: language.trim() || "en",
        aiProvider,
        scheduleDays,
        dailyContentCount,
        wpUrl: wpUrl.trim() || undefined,
        wpUsername: wpUsername.trim() || undefined,
        wpCategoryId: wpCategoryId.trim() || undefined,
      };

      // Only include password if the user typed something
      if (wpPassword) {
        payload.wpPassword = wpPassword;
      }

      if (isEdit) {
        await updateSeoAgent({ ...payload, id: params.id! });
        toast({ title: "Updated", description: `${name} has been updated.` });
      } else {
        await createSeoAgent(payload);
        toast({ title: "Created", description: `${name} has been created.` });
      }

      navigate("/extensions/seo-agent");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message ?? "Failed to save. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (isEdit && loadingExisting) {
    return (
      <UserDashboardLayout user={user}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </UserDashboardLayout>
    );
  }

  return (
    <UserDashboardLayout user={user}>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate("/extensions/seo-agent")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-foreground text-2xl font-bold flex items-center gap-2">
              <Search className="h-6 w-6 text-primary" />
              {isEdit ? "Edit SEO Agent" : "New SEO Agent"}
            </h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {isEdit
                ? "Update your SEO agent configuration."
                : "Configure an AI agent to research keywords and generate SEO-optimized content."}
            </p>
          </div>
        </div>

        {/* Card 1 - Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              General details about your SEO agent and the niche it targets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My SEO Agent"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyId">Brand Voice (Company)</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger id="companyId">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {companies?.map((company: any) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="siteUrl">Site URL</Label>
              <Input
                id="siteUrl"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="niche">Niche</Label>
              <Input
                id="niche"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g. Digital Marketing, SaaS, Health & Wellness"
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 2 - Content Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Content Settings</CardTitle>
            <CardDescription>
              Configure how the AI agent should generate SEO content.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="seedKeywords">Seed Keywords</Label>
              <Textarea
                id="seedKeywords"
                value={seedKeywords}
                onChange={(e) => setSeedKeywords(e.target.value)}
                placeholder={"marketing automation\ncontent strategy\nSEO tools\n(one keyword per line)"}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Enter one keyword per line. These are used as seed terms for keyword research.
              </p>
            </div>

            {/* Content Types */}
            <div className="space-y-2">
              <Label>Content Types</Label>
              <div className="flex flex-wrap gap-3">
                {CONTENT_TYPES.map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={contentTypes.includes(type)}
                      onChange={() => toggleArrayItem(contentTypes, type, setContentTypes)}
                      className="rounded border-input h-4 w-4 text-primary focus:ring-primary"
                    />
                    <span className="text-sm">
                      {type
                        .split("_")
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(" ")}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetWordCount">Target Word Count (500-10000)</Label>
                <Input
                  id="targetWordCount"
                  type="number"
                  min={500}
                  max={10000}
                  value={targetWordCount}
                  onChange={(e) => setTargetWordCount(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger id="tone">
                    <SelectValue placeholder="Select a tone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Input
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="en"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aiProvider">AI Provider</Label>
                <Select value={aiProvider} onValueChange={setAiProvider}>
                  <SelectTrigger id="aiProvider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3 - WordPress Connection */}
        <Card>
          <CardHeader>
            <CardTitle>WordPress Connection</CardTitle>
            <CardDescription>
              Connect to your WordPress site to auto-publish generated content. Leave blank if not using WordPress.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wpUrl">WordPress URL</Label>
              <Input
                id="wpUrl"
                value={wpUrl}
                onChange={(e) => setWpUrl(e.target.value)}
                placeholder="https://yourblog.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wpUsername">Username</Label>
                <Input
                  id="wpUsername"
                  value={wpUsername}
                  onChange={(e) => setWpUsername(e.target.value)}
                  placeholder="admin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wpPassword">Password</Label>
                <Input
                  id="wpPassword"
                  type="password"
                  value={wpPassword}
                  onChange={(e) => setWpPassword(e.target.value)}
                  placeholder={isEdit ? "Enter to update" : "Application password"}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wpCategoryId">Category ID</Label>
              <Input
                id="wpCategoryId"
                value={wpCategoryId}
                onChange={(e) => setWpCategoryId(e.target.value)}
                placeholder="1"
              />
              <p className="text-xs text-muted-foreground">
                The WordPress category ID where published posts will be assigned.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4 - Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>
              Configure when and how often the agent should generate content.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Schedule Days */}
            <div className="space-y-2">
              <Label>Schedule Days</Label>
              <div className="flex flex-wrap gap-3">
                {DAYS_OF_WEEK.map((day) => (
                  <label key={day} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scheduleDays.includes(day)}
                      onChange={() => toggleArrayItem(scheduleDays, day, setScheduleDays)}
                      className="rounded border-input h-4 w-4 text-primary focus:ring-primary"
                    />
                    <span className="text-sm">
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dailyContentCount">Daily Content Count (1-10)</Label>
              <Input
                id="dailyContentCount"
                type="number"
                min={1}
                max={10}
                value={dailyContentCount}
                onChange={(e) => setDailyContentCount(Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/extensions/seo-agent")}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            {isEdit ? "Update Agent" : "Create Agent"}
          </Button>
        </div>
      </form>
    </UserDashboardLayout>
  );
}
