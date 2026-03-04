import { useState, useRef } from "react";
import { cn } from "../../../client/utils";
import { Button } from "../../../client/components/ui/button";
import { Skeleton } from "../../../client/components/ui/skeleton";
import { Download, Maximize, Pause, Play, Volume2, VolumeX } from "lucide-react";

interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string | null;
  className?: string;
  showControls?: boolean;
}

export function VideoPlayer({
  videoUrl,
  thumbnailUrl,
  className,
  showControls = true,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  return (
    <div className={cn("group relative overflow-hidden rounded-lg bg-black", className)}>
      {!loaded && (
        <Skeleton className="absolute inset-0 rounded-lg" />
      )}

      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnailUrl || undefined}
        controls={!showControls}
        className="w-full"
        preload="metadata"
        onLoadedData={() => setLoaded(true)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />

      {/* Custom controls overlay */}
      {showControls && loaded && (
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
            onClick={togglePlay}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
            onClick={toggleMute}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
            asChild
          >
            <a href={videoUrl} target="_blank" rel="noopener noreferrer" download>
              <Download className="h-4 w-4" />
            </a>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
            onClick={handleFullscreen}
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Big play button center */}
      {showControls && loaded && !playing && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity hover:bg-black/20"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform hover:scale-110">
            <Play className="ml-0.5 h-6 w-6 text-black" fill="black" />
          </div>
        </button>
      )}
    </div>
  );
}
