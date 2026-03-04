import { type AuthUser } from "wasp/auth";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "wasp/client/operations";
import {
  getSocialMediaAgent,
  createSocialMediaAgent,
  updateSocialMediaAgent,
  getCompanies,
} from "wasp/client/operations";
import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Share2 } from "lucide-react";
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

const PLATFORMS = ["facebook", "instagram", "linkedin", "x"] as const;

const POST_TYPES = [
  "promotional",
  "educational",
  "engagement",
  "behind_the_scenes",
  "user_generated",
] as const;

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export default function SocialMediaAgentFormPage({ user }: { user: AuthUser }) {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const isEdit = !!params.id;

  const { data: existing, isLoading: loadingExisting } = useQuery(
    getSocialMediaAgent,
    isEdit ? { id: params.id! } : undefined,
    { enabled: isEdit },
  );

  const { data: companies } = useQuery(getCompanies);

  // Form state
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState<string>("none");
  const [siteUrl, setSiteUrl] = useState("");
  const [siteDescription, setSiteDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [postTypes, setPostTypes] = useState<string[]>([]);
  const [tone, setTone] = useState("");
  const [creativityLevel, setCreativityLevel] = useState(5);
  const [hashtagCount, setHashtagCount] = useState(5);
  const [categories, setCategories] = useState("");
  const [goals, setGoals] = useState("");
  const [ctaTemplates, setCtaTemplates] = useState("");
  const [brandingDescription, setBrandingDescription] = useState("");
  const [scheduleDays, setScheduleDays] = useState<string[]>([]);
  const [scheduleTimes, setScheduleTimes] = useState("");
  const [dailyPostCount, setDailyPostCount] = useState(1);
  const [publishingType, setPublishingType] = useState("manual");
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (existing) {
      setName(existing.name ?? "");
      setCompanyId(existing.companyId ?? "none");
      setSiteUrl(existing.siteUrl ?? "");
      setSiteDescription(existing.siteDescription ?? "");
      setTargetAudience(existing.targetAudience ?? "");
      setPlatforms(existing.platforms ?? []);
      setPostTypes(existing.postTypes ?? []);
      setTone(existing.tone ?? "");
      setCreativityLevel(existing.creativityLevel ?? 5);
      setHashtagCount(existing.hashtagCount ?? 5);
      setCategories((existing.categories ?? []).join(", "));
      setGoals((existing.goals ?? []).join(", "));
      setCtaTemplates((existing.ctaTemplates ?? []).join("\n"));
      setBrandingDescription(existing.brandingDescription ?? "");
      setScheduleDays(existing.scheduleDays ?? []);
      setScheduleTimes((existing.scheduleTimes ?? []).join(", "));
      setDailyPostCount(existing.dailyPostCount ?? 1);
      setPublishingType(existing.publishingType ?? "manual");
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
      const payload = {
        name: name.trim(),
        companyId: companyId !== "none" ? companyId : null,
        siteUrl: siteUrl.trim() || null,
        siteDescription: siteDescription.trim() || null,
        targetAudience: targetAudience.trim() || null,
        platforms,
        postTypes,
        tone: tone || null,
        creativityLevel,
        hashtagCount,
        categories: categories
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        goals: goals
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        ctaTemplates: ctaTemplates
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        brandingDescription: brandingDescription.trim() || null,
        scheduleDays,
        scheduleTimes: scheduleTimes
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        dailyPostCount,
        publishingType: publishingType as "manual" | "auto",
      };

      if (isEdit) {
        await updateSocialMediaAgent({ ...payload, id: params.id! });
        toast({ title: "Updated", description: `${name} has been updated.` });
      } else {
        await createSocialMediaAgent(payload);
        toast({ title: "Created", description: `${name} has been created.` });
      }

      navigate("/extensions/social-media-agent");
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
            onClick={() => navigate("/extensions/social-media-agent")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-foreground text-2xl font-bold flex items-center gap-2">
              <Share2 className="h-6 w-6 text-primary" />
              {isEdit ? "Edit Agent" : "New Social Media Agent"}
            </h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {isEdit
                ? "Update your social media agent configuration."
                : "Configure an AI agent to generate and manage social media posts."}
            </p>
          </div>
        </div>

        {/* Card 1 - Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              General details about your social media agent and the brand it represents.
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
                  placeholder="My Social Agent"
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
              <Label htmlFor="siteDescription">Site Description</Label>
              <Textarea
                id="siteDescription"
                value={siteDescription}
                onChange={(e) => setSiteDescription(e.target.value)}
                placeholder="Describe what your site or business does..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetAudience">Target Audience</Label>
              <Textarea
                id="targetAudience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Describe your ideal audience: demographics, interests, pain points..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 2 - Content Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Content Settings</CardTitle>
            <CardDescription>
              Configure how the AI agent should generate content.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Platforms */}
            <div className="space-y-2">
              <Label>Platforms</Label>
              <div className="flex flex-wrap gap-3">
                {PLATFORMS.map((platform) => (
                  <label key={platform} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={platforms.includes(platform)}
                      onChange={() => toggleArrayItem(platforms, platform, setPlatforms)}
                      className="rounded border-input h-4 w-4 text-primary focus:ring-primary"
                    />
                    <span className="text-sm">
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Post Types */}
            <div className="space-y-2">
              <Label>Post Types</Label>
              <div className="flex flex-wrap gap-3">
                {POST_TYPES.map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={postTypes.includes(type)}
                      onChange={() => toggleArrayItem(postTypes, type, setPostTypes)}
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
              <div className="space-y-2">
                <Label htmlFor="creativityLevel">Creativity Level (1-10)</Label>
                <Input
                  id="creativityLevel"
                  type="number"
                  min={1}
                  max={10}
                  value={creativityLevel}
                  onChange={(e) => setCreativityLevel(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hashtagCount">Hashtag Count (0-30)</Label>
              <Input
                id="hashtagCount"
                type="number"
                min={0}
                max={30}
                value={hashtagCount}
                onChange={(e) => setHashtagCount(Number(e.target.value))}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="categories">Categories</Label>
              <Input
                id="categories"
                value={categories}
                onChange={(e) => setCategories(e.target.value)}
                placeholder="tech, marketing, growth (comma-separated)"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of content categories.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goals">Goals</Label>
              <Input
                id="goals"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="brand awareness, lead generation, engagement (comma-separated)"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of goals for this agent.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ctaTemplates">CTA Templates</Label>
              <Textarea
                id="ctaTemplates"
                value={ctaTemplates}
                onChange={(e) => setCtaTemplates(e.target.value)}
                placeholder={"Learn more at {{url}}\nSign up today!\nDM us for details"}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                One call-to-action template per line. Use {"{{url}}"} as a placeholder.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brandingDescription">Branding Description</Label>
              <Textarea
                id="brandingDescription"
                value={brandingDescription}
                onChange={(e) => setBrandingDescription(e.target.value)}
                placeholder="Describe your brand's visual style, messaging guidelines, dos and don'ts..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 3 - Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>
              Configure when and how often the agent should generate posts.
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
              <Label htmlFor="scheduleTimes">Schedule Times</Label>
              <Input
                id="scheduleTimes"
                value={scheduleTimes}
                onChange={(e) => setScheduleTimes(e.target.value)}
                placeholder="09:00, 14:00, 18:00 (comma-separated)"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated times in 24h format (e.g. 09:00, 14:00).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dailyPostCount">Daily Post Count (1-20)</Label>
                <Input
                  id="dailyPostCount"
                  type="number"
                  min={1}
                  max={20}
                  value={dailyPostCount}
                  onChange={(e) => setDailyPostCount(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publishingType">Publishing Type</Label>
                <Select value={publishingType} onValueChange={setPublishingType}>
                  <SelectTrigger id="publishingType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="auto">Auto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/extensions/social-media-agent")}
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
