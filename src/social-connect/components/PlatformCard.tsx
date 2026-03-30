import { useState } from "react";
import { Settings2, Key, Globe } from "lucide-react";
import { Card } from "../../client/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../client/components/ui/dropdown-menu";
import { PLATFORMS, type PlatformKey } from "../platforms";

import facebookIcon from "../icons/facebook.svg";
import instagramIcon from "../icons/instagram.svg";
import linkedinIcon from "../icons/linkedin.svg";
import xIcon from "../icons/x.svg";
import tiktokIcon from "../icons/tiktok.svg";
import youtubeIcon from "../icons/youtube.svg";
import youtubeShortsIcon from "../icons/youtube-shorts.svg";

const PLATFORM_ICON_MAP: Record<PlatformKey, string> = {
  facebook: facebookIcon,
  instagram: instagramIcon,
  linkedin: linkedinIcon,
  x: xIcon,
  tiktok: tiktokIcon,
  youtube: youtubeIcon,
  youtube_shorts: youtubeShortsIcon,
};

interface PlatformCardProps {
  platform: PlatformKey;
  systemAppAvailable: boolean;
  hasCustomCredential: boolean;
  onConnect: (platform: PlatformKey, useSystemApp: boolean) => void;
  onConfigureCustom: (platform: PlatformKey) => void;
}

export default function PlatformCard({
  platform,
  systemAppAvailable,
  hasCustomCredential,
  onConnect,
  onConfigureCustom,
}: PlatformCardProps) {
  const config = PLATFORMS[platform];
  const icon = PLATFORM_ICON_MAP[platform];
  const [menuOpen, setMenuOpen] = useState(false);

  function handleClick() {
    // If system app is available, always show the choice menu
    if (systemAppAvailable) {
      setMenuOpen(true);
      return;
    }
    // No system app: use custom credential or open setup
    if (hasCustomCredential) {
      onConnect(platform, false);
    } else {
      onConfigureCustom(platform);
    }
  }

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Card
          className="group relative cursor-pointer p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-primary/40"
          onClick={handleClick}
        >
          {hasCustomCredential && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConfigureCustom(platform);
              }}
              className="absolute top-3 right-3 rounded-full p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100"
              title="Edit API credentials"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          )}

          <img
            src={icon}
            alt={config.name}
            className="mb-8 h-8 w-8 transition-transform duration-300 group-hover:scale-125"
          />

          <h4 className="mb-2 text-lg font-semibold">{config.name}</h4>

          <span className="text-sm text-foreground/70">
            {hasCustomCredential ? "Connect Account" : "Add New Account"}
          </span>
        </Card>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuItem
          className="cursor-pointer gap-3 py-3"
          onClick={() => onConnect(platform, true)}
        >
          <Globe className="h-4 w-4 text-primary" />
          <div>
            <p className="font-medium">Use mAutomate API</p>
            <p className="text-xs text-muted-foreground">Quick connect via our shared app</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {hasCustomCredential ? (
          <>
            <DropdownMenuItem
              className="cursor-pointer gap-3 py-3"
              onClick={() => onConnect(platform, false)}
            >
              <Key className="h-4 w-4 text-amber-500" />
              <div>
                <p className="font-medium">Use My Own Keys</p>
                <p className="text-xs text-muted-foreground">Connect with your saved credentials</p>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer gap-3 py-3"
              onClick={() => onConfigureCustom(platform)}
            >
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Edit API Keys</p>
                <p className="text-xs text-muted-foreground">Update your credentials</p>
              </div>
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem
            className="cursor-pointer gap-3 py-3"
            onClick={() => onConfigureCustom(platform)}
          >
            <Key className="h-4 w-4 text-amber-500" />
            <div>
              <p className="font-medium">Use My Own Keys</p>
              <p className="text-xs text-muted-foreground">Set up your own API credentials</p>
            </div>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
