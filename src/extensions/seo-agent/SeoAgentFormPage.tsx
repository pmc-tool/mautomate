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
import {
  ArrowLeft,
  ArrowRight,
  X,
  Loader2,
  Sparkles,
  Check,
  Rocket,
} from "lucide-react";
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
import { cn } from "../../client/utils";
import { toast } from "../../client/hooks/use-toast";

import heroIntroImg from "../../client/static/social-agent/hero-intro.png";
import decorationImg from "../../client/static/social-agent/decoration.png";
import heroIllustrationImg from "../../client/static/social-agent/hero-illustration.png";

/* ─── Constants ─── */
const TONES = [
  "Professional", "Casual", "Funny", "Excited", "Witty",
  "Sarcastic", "Bold", "Dramatic", "Feminine", "Masculine",
] as const;

const CONTENT_TYPES = [
  { key: "internal_blog", label: "Internal Blog", desc: "Auto-publish to your WordPress site. Full blog posts with SEO optimization.", color: "#22c55e" },
  { key: "external_blog", label: "External Blog / Guest Posts", desc: "Generate content for external sites. Export as HTML/Markdown, then post manually.", color: "#f97316" },
  { key: "social", label: "Social Media", desc: "Generate social posts that bridge to the Social Media extension for publishing.", color: "#3b82f6" },
] as const;

const DAYS = [
  { key: "monday", label: "M" },
  { key: "tuesday", label: "T" },
  { key: "wednesday", label: "W" },
  { key: "thursday", label: "T" },
  { key: "friday", label: "F" },
  { key: "saturday", label: "S" },
  { key: "sunday", label: "S" },
] as const;

const FORM_STEPS = 3;

/* ─── Input class helpers ─── */
const inputCls = "h-12 rounded-[10px] bg-foreground/5 border-0 text-sm backdrop-blur-sm focus-visible:ring-1 focus-visible:ring-[#bd711d]/30";
const textareaCls = "rounded-[10px] bg-foreground/5 border-0 text-sm backdrop-blur-sm resize-none focus-visible:ring-1 focus-visible:ring-[#bd711d]/30";
const selectCls = "h-12 rounded-[10px] bg-foreground/5 border-0 text-sm backdrop-blur-sm";

export default function SeoAgentFormPage({ user }: { user: AuthUser }) {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const isEdit = !!params.id;

  const { data: existing, isLoading } = useQuery(
    getSeoAgent,
    isEdit ? { id: params.id! } : undefined,
    { enabled: isEdit },
  );
  const { data: companies } = useQuery(getCompanies);

  /* ─── Wizard step ─── */
  const [currentStep, setCurrentStep] = useState(isEdit ? 1 : 0);
  const [stepError, setStepError] = useState("");

  /* ─── Form state ─── */
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

  /* ─── Populate on edit ─── */
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
      setWpPassword("");
      setWpCategoryId(existing.wpCategoryId ?? "");
    }
  }, [existing]);

  /* ─── Helpers ─── */
  function toggle(arr: string[], item: string, setter: (v: string[]) => void) {
    setter(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  }

  function validate(): boolean {
    switch (currentStep) {
      case 1:
        if (!name.trim()) { setStepError("Agent name is required."); return false; }
        return true;
      case 2: {
        const kw = seedKeywords.split("\n").map(s => s.trim()).filter(Boolean);
        if (kw.length === 0) { setStepError("Enter at least one keyword."); return false; }
        if (contentTypes.length === 0) { setStepError("Select at least one content type."); return false; }
        return true;
      }
      default:
        return true;
    }
  }

  function next() {
    setStepError("");
    if (!validate()) return;
    setCurrentStep((s) => Math.min(s + 1, FORM_STEPS));
  }

  function back() {
    setStepError("");
    setCurrentStep((s) => Math.max(s - 1, isEdit ? 1 : 0));
  }

  /* ─── Submit ─── */
  async function handleSubmit() {
    setStepError("");
    setCurrentStep(4); // processing
    try {
      const payload: Record<string, any> = {
        name: name.trim(),
        companyId: companyId !== "none" ? companyId : undefined,
        siteUrl: siteUrl.trim() || undefined,
        niche: niche.trim() || undefined,
        seedKeywords: seedKeywords.split("\n").map((s) => s.trim()).filter(Boolean),
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
      if (wpPassword) payload.wpPassword = wpPassword;

      if (isEdit) {
        await updateSeoAgent({ ...payload, id: params.id! });
      } else {
        await createSeoAgent(payload);
      }
      setCurrentStep(5); // success
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to save.", variant: "destructive" });
      setCurrentStep(3); // back to last form step (review)
    }
  }

  /* ─── Loading state (edit) ─── */
  if (isEdit && isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ─── Progress ─── */
  const showProgress = currentStep >= 1 && currentStep <= FORM_STEPS;
  const progress = showProgress ? currentStep / FORM_STEPS : 0;

  /* ─── Continue button ─── */
  function ContinueBtn({ label = "Continue", onClick }: { label?: string; onClick: () => void }) {
    return (
      <>
        {stepError && <p className="mt-4 text-center text-xs font-medium text-red-500">{stepError}</p>}
        <button
          type="button"
          onClick={onClick}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#bd711d] py-[18px] text-sm font-medium text-white transition-colors hover:bg-[#a5631a]"
        >
          {label}
          <ArrowRight className="h-4 w-4" />
        </button>
      </>
    );
  }

  /* ─── Steps ─── */
  function renderStep() {
    switch (currentStep) {
      /* ── Welcome ── */
      case 0:
        return (
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-8">
              <img src={heroIntroImg} alt="" className="mx-auto max-w-[280px]" />
              <img src={decorationImg} alt="" className="absolute left-8 top-12 h-10 w-10 object-contain opacity-60" />
            </div>
            <p className="text-[21px] font-medium leading-[1.25em] text-foreground max-w-sm">
              <span className="opacity-50">Hey. I'm your </span>
              AI SEO Agent.
              <span className="opacity-50"> I'll research keywords, analyze competitors, and generate content that ranks on search engines.</span>
            </p>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="mt-10 flex w-full items-center justify-center gap-2 rounded-xl bg-[#bd711d] py-[18px] text-sm font-medium text-white transition-colors hover:bg-[#a5631a]"
            >
              Let's Get Started
              <ArrowRight className="h-4 w-4" />
            </button>
            <p className="mt-4 text-xs text-muted-foreground">
              All settings are fully editable later.
            </p>
          </div>
        );

      /* ── Step 1: Basics ── */
      case 1:
        return (
          <div className="text-center">
            <p className="text-sm opacity-50 mb-1">Let's start with the basics</p>
            <h2 className="text-[22px] font-medium leading-tight mb-8">Domain & niche</h2>
            <div className="space-y-4 text-left">
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Agent Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => { setName(e.target.value); setStepError(""); }}
                  placeholder="My SEO Agent"
                  className={inputCls}
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Brand Voice</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger className={selectCls}><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {companies?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Website URL</Label>
                <Input value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://example.com" className={inputCls} />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Niche / Industry</Label>
                <Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="e.g. Digital Marketing, SaaS, Health & Wellness" className={inputCls} />
              </div>
            </div>
            <ContinueBtn onClick={next} />
          </div>
        );

      /* ── Step 2: Content Setup ── */
      case 2:
        return (
          <div className="text-center">
            <p className="text-sm opacity-50 mb-1">Configure your content</p>
            <h2 className="text-[22px] font-medium leading-tight mb-8">Content setup</h2>
            <div className="space-y-6 text-left">
              {/* Seed Keywords */}
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Seed Keywords *</Label>
                <Textarea
                  value={seedKeywords}
                  onChange={(e) => { setSeedKeywords(e.target.value); setStepError(""); }}
                  placeholder={"marketing automation\ncontent strategy\nSEO tools\nkeyword research\nlink building"}
                  rows={6}
                  className={textareaCls}
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground mt-2">
                  Enter one keyword per line. We'll discover hundreds of related keywords from these seeds.
                </p>
              </div>

              {/* Content Types */}
              <div>
                <Label className="text-xs font-medium mb-2 block">Content Types *</Label>
                <div className="space-y-3">
                  {CONTENT_TYPES.map((ct) => {
                    const sel = contentTypes.includes(ct.key);
                    return (
                      <button
                        key={ct.key}
                        type="button"
                        onClick={() => toggle(contentTypes, ct.key, setContentTypes)}
                        className={cn(
                          "group flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-5 text-left transition-all hover:-translate-y-0.5",
                          sel ? "border-[#bd711d] bg-[#bd711d]/5" : "border-border hover:border-[#bd711d]/30 hover:shadow-md",
                        )}
                      >
                        <div className={cn(
                          "flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 transition-all shrink-0",
                          sel ? "border-[#bd711d] bg-[#bd711d]" : "border-muted-foreground/30",
                        )}>
                          {sel && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div className="h-3.5 w-3.5 rounded-full shrink-0" style={{ backgroundColor: ct.color }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{ct.label}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{ct.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content Settings */}
              <div className="rounded-[20px] border px-5 py-6 space-y-5">
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className={selectCls}><SelectValue placeholder="Select a tone" /></SelectTrigger>
                    <SelectContent>
                      {TONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Language</Label>
                    <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="en" className={inputCls} />
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Target Word Count</Label>
                    <Input type="number" min={500} max={10000} value={targetWordCount} onChange={(e) => setTargetWordCount(Number(e.target.value))} className={inputCls} />
                  </div>
                </div>
              </div>
            </div>
            <ContinueBtn onClick={next} />
          </div>
        );

      /* ── Step 3: Review & Create ── */
      case 3:
        return (
          <div className="text-center">
            <p className="text-sm opacity-50 mb-1">Almost there</p>
            <h2 className="text-[22px] font-medium leading-tight mb-8">Review & {isEdit ? "update" : "create"}</h2>
            <div className="rounded-[20px] border px-5 py-6 space-y-4 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Agent Name</span>
                <span className="text-sm font-medium">{name.trim()}</span>
              </div>
              {niche.trim() && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Niche</span>
                  <span className="text-sm font-medium">{niche.trim()}</span>
                </div>
              )}
              {siteUrl.trim() && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Website</span>
                  <span className="text-sm font-medium truncate max-w-[220px]">{siteUrl.trim()}</span>
                </div>
              )}
              <div className="border-t pt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Keywords</span>
                <span className="text-sm font-medium">{seedKeywords.split("\n").map(s => s.trim()).filter(Boolean).length} keyword{seedKeywords.split("\n").map(s => s.trim()).filter(Boolean).length !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Content Types</span>
                <span className="text-sm font-medium">
                  {contentTypes.map(k => CONTENT_TYPES.find(ct => ct.key === k)?.label).filter(Boolean).join(", ")}
                </span>
              </div>
              {tone && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Tone</span>
                  <span className="text-sm font-medium">{tone}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Language</span>
                <span className="text-sm font-medium">{language || "en"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Word Count</span>
                <span className="text-sm font-medium">{targetWordCount}</span>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              You can configure WordPress publishing and scheduling from your agent's Settings tab after creation.
            </p>
            {stepError && <p className="mt-4 text-center text-xs font-medium text-red-500">{stepError}</p>}
            <button
              type="button"
              onClick={handleSubmit}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#bd711d] py-[18px] text-sm font-medium text-white transition-colors hover:bg-[#a5631a]"
            >
              <Sparkles className="h-4 w-4" />
              {isEdit ? "Update Agent" : "Create Agent"}
              <ArrowRight className="ml-1 h-4 w-4" />
            </button>
          </div>
        );

      /* ── Processing ── */
      case 4:
        return (
          <div className="flex flex-col items-center text-center py-12">
            <Loader2 className="h-28 w-28 animate-spin text-[#bd711d]/30 mb-8" />
            <h2 className="text-[22px] font-medium leading-tight">
              {isEdit ? "Updating your agent..." : "Setting up your SEO agent."}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">Sit back and relax...</p>
          </div>
        );

      /* ── Success ── */
      case 5:
        return (
          <div className="flex flex-col items-center text-center">
            <img src={heroIllustrationImg} alt="" className="mx-auto max-w-[260px] mb-8" />
            <h2 className="text-[22px] font-medium leading-tight">All done!</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs">
              {isEdit
                ? "Your SEO agent has been updated successfully."
                : "Your agent is ready. Start generating SEO-optimized content."}
            </p>
            <button
              type="button"
              onClick={() => navigate("/extensions/seo-agent")}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#bd711d] py-[18px] text-sm font-medium text-white transition-colors hover:bg-[#a5631a]"
            >
              <Rocket className="h-4 w-4" />
              View Your Agents
              <ArrowRight className="ml-1 h-4 w-4" />
            </button>
          </div>
        );
    }
  }

  /* ─── Render ─── */
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      {/* Slide-in animation */}
      <style>{`
        @keyframes wizardSlideIn {
          from { opacity: 0; transform: translateX(12px); filter: blur(4px); }
          to   { opacity: 1; transform: translateX(0);    filter: blur(0);   }
        }
      `}</style>

      {/* ── Top bar ── */}
      <div className="fixed inset-x-0 top-0 z-10 flex items-center p-4 lg:px-8">
        {/* Back */}
        <div className="flex basis-1/3">
          {currentStep > (isEdit ? 1 : 0) && currentStep <= FORM_STEPS && (
            <button
              type="button"
              onClick={back}
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="flex basis-1/3 justify-center">
          {showProgress && (
            <div className="relative h-[5px] w-40 overflow-hidden rounded-full bg-foreground/5 backdrop-blur-lg">
              <div
                className="absolute inset-y-0 start-0 rounded-full bg-[#bd711d] transition-all duration-500 ease-out"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Step counter + Close */}
        <div className="flex basis-1/3 items-center justify-end gap-3">
          {showProgress && (
            <span className="hidden text-xs font-medium text-muted-foreground sm:block">
              Step {currentStep} of {FORM_STEPS}
            </span>
          )}
          <button
            type="button"
            onClick={() => navigate("/extensions/seo-agent")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground/5 text-foreground transition-colors hover:bg-foreground/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex min-h-screen flex-col px-6 pt-20 pb-12">
        <div className="m-auto w-full max-w-[500px]">
          <div key={currentStep} style={{ animation: "wizardSlideIn 300ms ease-out" }}>
            {renderStep()}
          </div>
        </div>
      </div>
    </div>
  );
}
