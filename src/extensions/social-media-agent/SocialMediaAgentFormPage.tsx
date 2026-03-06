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

// Platform icons
import facebookIcon from "../../social-connect/icons/facebook.svg";
import instagramIcon from "../../social-connect/icons/instagram.svg";
import linkedinIcon from "../../social-connect/icons/linkedin.svg";
import xIcon from "../../social-connect/icons/x.svg";

/* ─── Constants ─── */
const TONES = [
  "Professional", "Casual", "Funny", "Excited", "Witty",
  "Sarcastic", "Bold", "Dramatic", "Feminine", "Masculine",
] as const;

const PLATFORMS = [
  { key: "facebook", label: "Facebook", icon: facebookIcon },
  { key: "instagram", label: "Instagram", icon: instagramIcon },
  { key: "linkedin", label: "LinkedIn", icon: linkedinIcon },
  { key: "x", label: "X (Twitter)", icon: xIcon },
] as const;

const TIME_SLOTS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00",
] as const;

const POST_TYPES = [
  { key: "promotional", label: "Promotional", desc: "Product promotions and offers" },
  { key: "educational", label: "Educational", desc: "Informative and helpful content" },
  { key: "engagement", label: "Engagement", desc: "Questions, polls, and interactions" },
  { key: "behind_the_scenes", label: "Behind the Scenes", desc: "Company culture and stories" },
  { key: "user_generated", label: "User Generated", desc: "Customer stories and testimonials" },
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

const FORM_STEPS = 6; // steps 1-6

/* ─── Input class helpers ─── */
const inputCls = "h-12 rounded-[10px] bg-foreground/5 border-0 text-sm backdrop-blur-sm focus-visible:ring-1 focus-visible:ring-[#bd711d]/30";
const textareaCls = "rounded-[10px] bg-foreground/5 border-0 text-sm backdrop-blur-sm resize-none focus-visible:ring-1 focus-visible:ring-[#bd711d]/30";
const selectCls = "h-12 rounded-[10px] bg-foreground/5 border-0 text-sm backdrop-blur-sm";

export default function SocialMediaAgentFormPage({ user }: { user: AuthUser }) {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const isEdit = !!params.id;

  const { data: existing, isLoading } = useQuery(
    getSocialMediaAgent,
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
  const [scheduleTimes, setScheduleTimes] = useState<string[]>([]);
  const [dailyPostCount, setDailyPostCount] = useState(1);
  const [publishingType, setPublishingType] = useState("manual");

  /* ─── Populate on edit ─── */
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
      setScheduleTimes(existing.scheduleTimes ?? []);
      setDailyPostCount(existing.dailyPostCount ?? 1);
      setPublishingType(existing.publishingType ?? "manual");
    }
  }, [existing]);

  /* ─── Helpers ─── */
  function toggle(arr: string[], item: string, setter: (v: string[]) => void) {
    setter(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  }

  function validate(): boolean {
    switch (currentStep) {
      case 1:
        if (platforms.length === 0) { setStepError("Select at least one platform."); return false; }
        return true;
      case 3:
        if (postTypes.length === 0) { setStepError("Select at least one post type."); return false; }
        return true;
      case 6:
        if (!name.trim()) { setStepError("Agent name is required."); return false; }
        return true;
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
    if (!name.trim()) { setStepError("Agent name is required."); return; }
    setCurrentStep(7); // processing
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
        categories: categories.split(",").map((s) => s.trim()).filter(Boolean),
        goals: goals.split(",").map((s) => s.trim()).filter(Boolean),
        ctaTemplates: ctaTemplates.split("\n").map((s) => s.trim()).filter(Boolean),
        brandingDescription: brandingDescription.trim() || null,
        scheduleDays,
        scheduleTimes,
        dailyPostCount,
        publishingType: publishingType as "manual" | "auto",
      };
      if (isEdit) {
        await updateSocialMediaAgent({ ...payload, id: params.id! });
      } else {
        await createSocialMediaAgent(payload);
      }
      setCurrentStep(8); // success
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to save.", variant: "destructive" });
      setCurrentStep(6); // back to name step
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
              AI Social Media Agent.
              <span className="opacity-50"> I'll help you plan, create, and optimise social posts with intelligent performance insights.</span>
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

      /* ── Step 1: Platforms ── */
      case 1:
        return (
          <div className="text-center">
            <p className="text-sm opacity-50 mb-1">Where would you like to publish?</p>
            <h2 className="text-[22px] font-medium leading-tight mb-8">Select your platforms</h2>
            <div className="grid grid-cols-2 gap-3">
              {PLATFORMS.map((p) => {
                const sel = platforms.includes(p.key);
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => toggle(platforms, p.key, setPlatforms)}
                    className={cn(
                      "relative flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg",
                      sel ? "border-[#bd711d] bg-[#bd711d]/5 shadow-sm" : "border-border hover:border-[#bd711d]/30",
                    )}
                  >
                    <img src={p.icon} alt={p.label} className="h-14 w-14 object-contain" />
                    <span className="text-sm font-medium">{p.label}</span>
                    {sel && (
                      <div className="absolute top-2.5 right-2.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#bd711d] text-white">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <ContinueBtn onClick={next} />
          </div>
        );

      /* ── Step 2: Website & Brand ── */
      case 2:
        return (
          <div className="text-center">
            <p className="text-sm opacity-50 mb-1">Tell us about your brand</p>
            <h2 className="text-[22px] font-medium leading-tight mb-8">Website & audience info</h2>
            <div className="space-y-4 text-left">
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
                <Label className="text-xs font-medium mb-1.5 block">Site URL</Label>
                <Input value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://example.com" className={inputCls} />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Site Description</Label>
                <Textarea value={siteDescription} onChange={(e) => setSiteDescription(e.target.value)} placeholder="What your site or business does..." rows={3} className={textareaCls} />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Target Audience</Label>
                <Textarea value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="Describe your ideal audience..." rows={3} className={textareaCls} />
              </div>
            </div>
            <ContinueBtn onClick={next} />
          </div>
        );

      /* ── Step 3: Post Types ── */
      case 3:
        return (
          <div className="text-center">
            <p className="text-sm opacity-50 mb-1">What type of content?</p>
            <h2 className="text-[22px] font-medium leading-tight mb-8">Choose your post types</h2>
            <div className="space-y-2.5 text-left">
              {POST_TYPES.map((pt) => {
                const sel = postTypes.includes(pt.key);
                return (
                  <button
                    key={pt.key}
                    type="button"
                    onClick={() => toggle(postTypes, pt.key, setPostTypes)}
                    className={cn(
                      "group flex w-full items-center gap-3.5 rounded-2xl border-2 px-5 py-4 text-left transition-all hover:-translate-y-0.5",
                      sel ? "border-[#bd711d] bg-[#bd711d]/5" : "border-border hover:border-[#bd711d]/30 hover:shadow-md",
                    )}
                  >
                    <div className={cn(
                      "flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 transition-all shrink-0",
                      sel ? "border-[#bd711d] bg-[#bd711d]" : "border-muted-foreground/30",
                    )}>
                      {sel && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{pt.label}</p>
                      <p className="text-[11px] text-muted-foreground">{pt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <ContinueBtn onClick={next} />
          </div>
        );

      /* ── Step 4: Voice & Style ── */
      case 4:
        return (
          <div className="text-center">
            <p className="text-sm opacity-50 mb-1">Set the tone</p>
            <h2 className="text-[22px] font-medium leading-tight mb-8">Voice, style & creativity</h2>
            <div className="rounded-[20px] border px-5 py-6 space-y-5 text-left">
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className={selectCls}><SelectValue placeholder="Select tone" /></SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Creativity (1-10)</Label>
                  <Input type="number" min={1} max={10} value={creativityLevel} onChange={(e) => setCreativityLevel(Number(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Hashtags (0-30)</Label>
                  <Input type="number" min={0} max={30} value={hashtagCount} onChange={(e) => setHashtagCount(Number(e.target.value))} className={inputCls} />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Categories</Label>
                <Input value={categories} onChange={(e) => setCategories(e.target.value)} placeholder="tech, marketing, growth (comma-separated)" className={inputCls} />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Goals</Label>
                <Input value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="brand awareness, leads (comma-separated)" className={inputCls} />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">CTA Templates</Label>
                <Textarea value={ctaTemplates} onChange={(e) => setCtaTemplates(e.target.value)} placeholder={"Learn more at {{url}}\nSign up today!\nDM us for details"} rows={3} className={textareaCls} />
                <p className="text-[10px] text-muted-foreground mt-1.5">One per line. Use {"{{url}}"} as placeholder.</p>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Branding Description</Label>
                <Textarea value={brandingDescription} onChange={(e) => setBrandingDescription(e.target.value)} placeholder="Brand voice, visual style, messaging guidelines..." rows={3} className={textareaCls} />
              </div>
            </div>
            <ContinueBtn onClick={next} />
          </div>
        );

      /* ── Step 5: Schedule ── */
      case 5:
        return (
          <div className="text-center">
            <p className="text-sm opacity-50 mb-1">When should I post?</p>
            <h2 className="text-[22px] font-medium leading-tight mb-8">Set your schedule</h2>
            <div className="rounded-[20px] border px-5 py-6 space-y-6 text-left">
              <div>
                <Label className="text-xs font-medium mb-3 block">Active Days</Label>
                <div className="flex justify-center gap-2">
                  {DAYS.map((d) => {
                    const sel = scheduleDays.includes(d.key);
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => toggle(scheduleDays, d.key, setScheduleDays)}
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold transition-all",
                          sel
                            ? "bg-foreground text-background"
                            : "bg-foreground/5 text-muted-foreground hover:bg-foreground/10",
                        )}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium mb-3 block">Posting Times</Label>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map((t) => {
                    const sel = scheduleTimes.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggle(scheduleTimes, t, setScheduleTimes)}
                        className={cn(
                          "rounded-lg py-2 text-xs font-medium transition-all",
                          sel
                            ? "bg-foreground text-background"
                            : "bg-foreground/5 text-muted-foreground hover:bg-foreground/10",
                        )}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Posts Per Day</Label>
                  <Input type="number" min={1} max={20} value={dailyPostCount} onChange={(e) => setDailyPostCount(Number(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Publishing</Label>
                  <Select value={publishingType} onValueChange={setPublishingType}>
                    <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Review</SelectItem>
                      <SelectItem value="auto">Auto-Publish</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <ContinueBtn onClick={next} />
          </div>
        );

      /* ── Step 6: Name & Submit ── */
      case 6:
        return (
          <div className="text-center">
            <p className="text-sm opacity-50 mb-1">One last thing...</p>
            <h2 className="text-[22px] font-medium leading-tight mb-8">Name your agent</h2>
            <div className="text-left">
              <Input
                value={name}
                onChange={(e) => { setName(e.target.value); setStepError(""); }}
                placeholder="My Social Agent"
                className={cn(inputCls, "text-center text-base")}
                autoFocus
              />
            </div>
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
      case 7:
        return (
          <div className="flex flex-col items-center text-center py-12">
            <Loader2 className="h-28 w-28 animate-spin text-[#bd711d]/30 mb-8" />
            <h2 className="text-[22px] font-medium leading-tight">
              {isEdit ? "Updating your agent..." : "I'm setting up your agent."}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">Sit back and relax...</p>
          </div>
        );

      /* ── Success ── */
      case 8:
        return (
          <div className="flex flex-col items-center text-center">
            <img src={heroIllustrationImg} alt="" className="mx-auto max-w-[260px] mb-8" />
            <h2 className="text-[22px] font-medium leading-tight">All done!</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs">
              {isEdit
                ? "Your agent has been updated successfully."
                : "Your agent is ready. You can now generate and schedule posts."}
            </p>
            <button
              type="button"
              onClick={() => navigate("/extensions/social-media-agent")}
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
            onClick={() => navigate("/extensions/social-media-agent")}
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
