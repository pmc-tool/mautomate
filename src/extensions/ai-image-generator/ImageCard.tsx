import { Loader2, Trash2, AlertCircle, ExternalLink } from "lucide-react";
import type { GeneratedImage } from "wasp/entities";

interface ImageCardProps {
  image: GeneratedImage;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export default function ImageCard({ image, onDelete, isDeleting }: ImageCardProps) {
  return (
    <div className="bg-card text-card-foreground rounded-lg border overflow-hidden group">
      <div className="relative aspect-square bg-muted">
        {image.status === "completed" && image.imageUrl ? (
          <img
            src={image.imageUrl}
            alt={image.prompt}
            className="h-full w-full object-cover"
          />
        ) : image.status === "processing" ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
              <p className="text-muted-foreground mt-2 text-sm">Generating...</p>
            </div>
          </div>
        ) : image.status === "failed" ? (
          <div className="flex h-full items-center justify-center p-4">
            <div className="text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
              <p className="mt-2 text-sm text-red-500">
                {image.errorMsg || "Generation failed"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-sm line-clamp-2 mb-2" title={image.prompt}>
          {image.prompt}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">
            {image.width}x{image.height}
          </span>
          <div className="flex gap-1">
            {image.status === "completed" && image.imageUrl && (
              <a
                href={image.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground rounded p-1"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <button
              onClick={() => onDelete(image.id)}
              disabled={isDeleting}
              className="text-muted-foreground hover:text-red-500 rounded p-1 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
