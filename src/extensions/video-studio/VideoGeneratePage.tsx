import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import { generateVideo, getVideoProjects } from "wasp/client/operations";
import UserDashboardLayout from "../../user-dashboard/layout/UserDashboardLayout";
import { GenerationWizard } from "./components/GenerationWizard";
import { Button } from "../../client/components/ui/button";
import { Card, CardContent } from "../../client/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

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
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/video-studio">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-foreground text-2xl font-bold tracking-tight">
              Generate Video
            </h1>
            <p className="text-muted-foreground text-sm">
              Choose a model, configure settings, and generate
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="text-destructive p-4 text-sm">
              {error}
            </CardContent>
          </Card>
        )}

        {/* Wizard */}
        <Card>
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
