import { useState, useEffect, useCallback } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import {
  getUserExtensions,
  getUserImages,
  generateImage,
  checkImageStatus,
  deleteImage,
} from "wasp/client/operations";
import UserDashboardLayout from "../../user-dashboard/layout/UserDashboardLayout";
import { Link } from "react-router";
import { ImagePlus, Loader2, Sparkles } from "lucide-react";
import ImageCard from "./ImageCard";

const MODELS = [
  { value: "dreamshaper_8_93211.safetensors", label: "DreamShaper 8" },
  { value: "realisticVisionV60B1_v51VAE_94301.safetensors", label: "Realistic Vision 6.0" },
  { value: "sd_xl_base_1.0.safetensors", label: "SDXL Base 1.0" },
];

const SIZES = [
  { label: "512 x 512", width: 512, height: 512 },
  { label: "512 x 768", width: 512, height: 768 },
  { label: "768 x 512", width: 768, height: 512 },
  { label: "768 x 768", width: 768, height: 768 },
  { label: "1024 x 1024", width: 1024, height: 1024 },
];

export default function AiImageGeneratorPage({ user }: { user: AuthUser }) {
  const { data: userExtensions, isLoading: extLoading } = useQuery(getUserExtensions);
  const { data: images, isLoading: imagesLoading } = useQuery(getUserImages);

  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [modelName, setModelName] = useState(MODELS[0].value);
  const [sizeIdx, setSizeIdx] = useState(0);
  const [steps, setSteps] = useState(20);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const isActive = userExtensions?.some(
    (ue) => ue.extensionId === "ai-image-generator" && ue.isActive
  );

  // Poll for processing images
  const processingImages = images?.filter((img) => img.status === "processing") || [];

  useEffect(() => {
    if (processingImages.length === 0) return;

    const interval = setInterval(() => {
      for (const img of processingImages) {
        checkImageStatus({ imageId: img.id }).catch(console.error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [processingImages.length, processingImages.map((i) => i.id).join(",")]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const size = SIZES[sizeIdx];
      await generateImage({
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        width: size.width,
        height: size.height,
        steps,
        modelName,
      });
      setPrompt("");
      setNegativePrompt("");
    } catch (err: any) {
      console.error("Generate error:", err);
      alert(err.message || "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await deleteImage({ id });
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (extLoading) {
    return (
      <UserDashboardLayout user={user}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </UserDashboardLayout>
    );
  }

  if (!isActive) {
    return (
      <UserDashboardLayout user={user}>
        <div className="flex flex-col items-center justify-center py-16">
          <ImagePlus className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">AI Image Generator</h2>
          <p className="text-muted-foreground mb-4">
            This extension is not activated. Enable it in the Marketplace to start generating images.
          </p>
          <Link
            to="/marketplace"
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium"
          >
            Go to Marketplace
          </Link>
        </div>
      </UserDashboardLayout>
    );
  }

  return (
    <UserDashboardLayout user={user}>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <ImagePlus className="h-7 w-7" />
          <h1 className="text-2xl font-bold">AI Image Generator</h1>
        </div>
        <p className="text-muted-foreground">
          Generate images from text prompts using AI models.
        </p>
      </div>

      {/* Generation Form */}
      <div className="bg-card text-card-foreground rounded-lg border p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              rows={3}
              className="bg-background border-input w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Negative Prompt{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="Things to avoid in the image..."
              className="bg-background border-input w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Model</label>
              <select
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="bg-background border-input w-full rounded-md border px-3 py-2 text-sm"
              >
                {MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Size</label>
              <select
                value={sizeIdx}
                onChange={(e) => setSizeIdx(Number(e.target.value))}
                className="bg-background border-input w-full rounded-md border px-3 py-2 text-sm"
              >
                {SIZES.map((s, i) => (
                  <option key={i} value={i}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Steps</label>
              <input
                type="number"
                value={steps}
                onChange={(e) => setSteps(Number(e.target.value))}
                min={1}
                max={50}
                className="bg-background border-input w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-6 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Image
              </>
            )}
          </button>
        </div>
      </div>

      {/* Image Gallery */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Your Images
          {images && images.length > 0 && (
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              ({images.length})
            </span>
          )}
        </h2>

        {imagesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : images && images.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {images.map((img) => (
              <ImageCard
                key={img.id}
                image={img}
                onDelete={handleDelete}
                isDeleting={deletingIds.has(img.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground rounded-lg border border-dashed py-12 text-center">
            No images yet. Enter a prompt above to generate your first image.
          </div>
        )}
      </div>
    </UserDashboardLayout>
  );
}
