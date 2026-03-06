import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import { generateVideo, getVideoProjects } from "wasp/client/operations";
import UserDashboardLayout from "../../user-dashboard/layout/UserDashboardLayout";
import { GenerationWizard } from "./components/GenerationWizard";
import { Button } from "../../client/components/ui/button";
import { Card, CardContent } from "../../client/components/ui/card";
import { Badge } from "../../client/components/ui/badge";
import { ArrowLeft, Sparkles, AlertCircle } from "lucide-react";
import { Link } from "react-router";

import videoCreateImg from "../../client/static/video-studio/video-create.png";

export default function VideoGeneratePage({ user }: { user: AuthUser }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: projects } = useQuery(getVideoProjects, {});

  const initialType = (searchParams.get("type") as any) || undefined;

  const handleSubmit = async (data: Parameters<typeof generateVideo>[0]) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await generateVideo(data);
      navigate(`/video-studio/video/${result.id}`);
    } catch (err: any) {
      const msg = err.message || "Failed to generate video";
      try {
        const parsed = JSON.parse(msg);
        if (parsed.message === "Insufficient credits") {
          setError(
            `Insufficient credits. Required: ${parsed.required}, Available: ${parsed.available}`,
          );
        } else {
          setError(msg);
        }
      } catch {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <UserDashboardLayout user={user}>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header with illustration */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="rounded-xl">
              <Link to="/video-studio">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#bd711d] to-[#a5631a] shadow-md shadow-[#bd711d]/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-foreground text-2xl font-bold tracking-tight">
                Generate Video
              </h1>
              <p className="text-muted-foreground text-xs">
                Choose a model, configure settings, and generate
              </p>
            </div>
          </div>
          <img
            src={videoCreateImg}
            alt=""
            className="hidden h-16 w-auto object-contain sm:block"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Generation Failed</p>
              <p className="text-destructive/80 mt-0.5 text-xs">{error}</p>
            </div>
          </div>
        )}

        {/* Wizard */}
        <Card className="overflow-hidden rounded-2xl border-2">
          <CardContent className="p-6">
            <GenerationWizard
              onSubmit={handleSubmit}
              projects={projects || []}
              isSubmitting={isSubmitting}
              initialType={initialType}
            />
          </CardContent>
        </Card>
      </div>
    </UserDashboardLayout>
  );
}
