import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router";
import type { AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import {
  getVideoGeneration,
  checkVideoStatus,
  retryVideoGeneration,
  deleteVideoGeneration,
  generateVideo,
} from "wasp/client/operations";
import UserDashboardLayout from "../../user-dashboard/layout/UserDashboardLayout";
import { VideoPlayer } from "./components/VideoPlayer";
import { StatusBadge } from "./components/StatusBadge";
import { CreditCostDisplay } from "./components/CreditCostDisplay";
import { getModelByKey } from "./modelRegistry";
import { getVoicePresetById } from "./voicePresets";
import { Button } from "../../client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../client/components/ui/card";
import { Badge } from "../../client/components/ui/badge";
import { Progress } from "../../client/components/ui/progress";
import { Separator } from "../../client/components/ui/separator";
import { Skeleton } from "../../client/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../client/components/ui/tooltip";
import {
  ArrowLeft,
  Clock,
  Copy,
  Download,
  Loader2,
  Monitor,
  RefreshCw,
  RotateCcw,
  Trash2,
  Wand2,
} from "lucide-react";

export default function VideoDetailPage({ user }: { user: AuthUser }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    data: gen,
    isLoading,
    refetch,
  } = useQuery(getVideoGeneration, { id: id! });

  // Auto-refresh while processing
  useEffect(() => {
    if (!gen || gen.status === "completed" || gen.status === "failed") return;

    const interval = setInterval(() => {
      refetch();
    }, 5000);

    return () => clearInterval(interval);
  }, [gen?.status, refetch]);

  const handleCheckStatus = async () => {
    if (!gen) return;
    setIsChecking(true);
    try {
      await checkVideoStatus({ id: gen.id });
      refetch();
    } catch {
      // ignore
    }
    setIsChecking(false);
  };

  const handleRetry = async () => {
    if (!gen) return;
    setIsRetrying(true);
    try {
      await retryVideoGeneration({ id: gen.id });
      refetch();
    } catch {
      // ignore
    }
    setIsRetrying(false);
  };

  const handleDelete = async () => {
    if (!gen || !confirm("Delete this generation?")) return;
    setIsDeleting(true);
    try {
      await deleteVideoGeneration({ id: gen.id });
      navigate("/video-studio/gallery");
    } catch {
      setIsDeleting(false);
    }
  };

  const handleCopyPrompt = () => {
    if (gen?.prompt) {
      navigator.clipboard.writeText(gen.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const model = gen ? getModelByKey(gen.model) : null;
  const metadata = gen?.metadata as Record<string, any> | null;
  const voicePreset = metadata?.voice_preset_id
    ? getVoicePresetById(metadata.voice_preset_id)
    : null;

  return (
    <UserDashboardLayout user={user}>
      {isLoading ? (
        <div className="mx-auto max-w-6xl space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 lg:grid-cols-5">
            <Skeleton className="aspect-video lg:col-span-3" />
            <Skeleton className="h-96 lg:col-span-2" />
          </div>
        </div>
      ) : !gen ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">Generation not found</p>
        </div>
      ) : (
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/video-studio/gallery">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-foreground text-xl font-bold">
                {model?.name || gen.model}
              </h1>
              <p className="text-muted-foreground text-sm">
                {gen.type === "ttv"
                  ? "Text to Video"
                  : gen.type === "itv"
                    ? "Image to Video"
                    : gen.type === "avatar"
                      ? "AI Avatar"
                      : "Upscale"}
              </p>
            </div>
            <StatusBadge status={gen.status} />
          </div>

          {/* Two-column layout */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Left — Video Player */}
            <div className="lg:col-span-3">
              <Card className="overflow-hidden">
                {gen.status === "completed" && gen.videoUrl ? (
                  <VideoPlayer
                    videoUrl={gen.videoUrl}
                    thumbnailUrl={gen.thumbnailUrl}
                    className="w-full"
                  />
                ) : gen.status === "processing" || gen.status === "queued" ? (
                  <CardContent className="flex flex-col items-center justify-center py-24">
                    <Loader2 className="text-primary mb-4 h-12 w-12 animate-spin" />
                    <p className="text-foreground text-lg font-medium">
                      {gen.status === "queued" ? "In Queue..." : "Generating..."}
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {gen.progress}% complete
                    </p>
                    <Progress value={gen.progress} className="mt-4 h-2 w-64" />
                  </CardContent>
                ) : gen.status === "failed" ? (
                  <CardContent className="flex flex-col items-center justify-center py-24">
                    <p className="text-destructive text-lg font-medium">
                      Generation Failed
                    </p>
                    {gen.errorMessage && (
                      <p className="text-muted-foreground mt-2 max-w-md text-center text-sm">
                        {gen.errorMessage}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={handleRetry}
                      disabled={isRetrying}
                    >
                      {isRetrying ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="mr-1.5 h-4 w-4" />
                      )}
                      Retry ({model?.creditCost || 15} credits)
                    </Button>
                  </CardContent>
                ) : null}
              </Card>

              {/* Action bar */}
              <div className="mt-4 flex flex-wrap gap-2">
                {gen.status === "completed" && gen.videoUrl && (
                  <Button asChild>
                    <a href={gen.videoUrl} target="_blank" rel="noopener noreferrer" download>
                      <Download className="mr-1.5 h-4 w-4" />
                      Download
                    </a>
                  </Button>
                )}

                {(gen.status === "processing" || gen.status === "queued") && (
                  <Button
                    variant="outline"
                    onClick={handleCheckStatus}
                    disabled={isChecking}
                  >
                    {isChecking ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1.5 h-4 w-4" />
                    )}
                    Check Status
                  </Button>
                )}

                {gen.status === "failed" && (
                  <Button
                    variant="outline"
                    onClick={handleRetry}
                    disabled={isRetrying}
                  >
                    {isRetrying ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-1.5 h-4 w-4" />
                    )}
                    Retry ({model?.creditCost || 15} credits)
                  </Button>
                )}

                <Button variant="outline" asChild>
                  <Link to="/video-studio/generate">
                    <Wand2 className="mr-1.5 h-4 w-4" />
                    Generate New
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive ml-auto"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>

            {/* Right — Details Panel */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <DetailItem label="Model" value={model?.name || gen.model} />
                    <DetailItem
                      label="Type"
                      value={
                        gen.type === "ttv"
                          ? "Text to Video"
                          : gen.type === "itv"
                            ? "Image to Video"
                            : gen.type === "avatar"
                              ? "AI Avatar"
                              : "Upscale"
                      }
                    />
                    <DetailItem
                      label="Duration"
                      value={`${gen.duration}s`}
                      icon={<Clock className="h-3 w-3" />}
                    />
                    <DetailItem label="Aspect Ratio" value={gen.aspectRatio} />
                    <DetailItem
                      label="Resolution"
                      value={gen.resolution}
                      icon={<Monitor className="h-3 w-3" />}
                    />
                    <DetailItem label="Credits" value={String(gen.creditsCost)} />
                    <DetailItem
                      label="Created"
                      value={new Date(gen.createdAt).toLocaleString()}
                    />
                    {gen.project && (
                      <DetailItem label="Project" value={gen.project.name} />
                    )}
                  </div>

                  {/* Credit cost display */}
                  {model && (
                    <>
                      <Separator />
                      <CreditCostDisplay
                        cost={gen.creditsCost}
                        tier={model.tier}
                      />
                    </>
                  )}

                  {/* Metadata details */}
                  {metadata && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="text-foreground text-xs font-semibold uppercase tracking-wider">
                          Parameters
                        </h4>
                        {metadata.enhance_prompt !== undefined && (
                          <DetailItem
                            label="Enhance Prompt"
                            value={metadata.enhance_prompt ? "Yes" : "No"}
                          />
                        )}
                        {metadata.generate_audio !== undefined && (
                          <DetailItem
                            label="Generate Audio"
                            value={metadata.generate_audio ? "Yes" : "No"}
                          />
                        )}
                        {metadata.cfg_scale !== undefined && (
                          <DetailItem
                            label="CFG Scale"
                            value={String(metadata.cfg_scale)}
                          />
                        )}
                        {metadata.seed !== undefined && (
                          <DetailItem label="Seed" value={String(metadata.seed)} />
                        )}
                        {metadata.avatar_id && (
                          <DetailItem label="Avatar" value={metadata.avatar_id} />
                        )}
                        {voicePreset && (
                          <DetailItem label="Voice" value={voicePreset.name} />
                        )}
                      </div>
                    </>
                  )}

                  {/* Prompt */}
                  {gen.prompt && (
                    <>
                      <Separator />
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <h4 className="text-foreground text-xs font-semibold uppercase tracking-wider">
                            Prompt
                          </h4>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={handleCopyPrompt}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {copied ? "Copied!" : "Copy prompt"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <p className="text-muted-foreground bg-muted rounded-lg p-3 text-xs leading-relaxed">
                          {gen.prompt}
                        </p>
                      </div>
                    </>
                  )}

                  {gen.negativePrompt && (
                    <div>
                      <h4 className="text-foreground mb-1 text-xs font-semibold uppercase tracking-wider">
                        Negative Prompt
                      </h4>
                      <p className="text-muted-foreground bg-muted rounded-lg p-3 text-xs leading-relaxed">
                        {gen.negativePrompt}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </UserDashboardLayout>
  );
}

function DetailItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
        {icon}
        {label}
      </dt>
      <dd className="text-foreground mt-0.5 text-sm">{value}</dd>
    </div>
  );
}
