import { Card } from "../../client/components/ui/card";
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

  function handleClick() {
    if (systemAppAvailable) {
      onConnect(platform, true);
    } else if (hasCustomCredential) {
      onConnect(platform, false);
    } else {
      onConfigureCustom(platform);
    }
  }

  return (
    <Card
      className="group cursor-pointer p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-primary/40"
      onClick={handleClick}
    >
      <img
        src={icon}
        alt={config.name}
        className="mb-8 h-8 w-8 transition-transform duration-300 group-hover:scale-125"
      />

      <h4 className="mb-2 text-lg font-semibold">{config.name}</h4>

      <span className="text-sm text-foreground/70">Add New Account</span>
    </Card>
  );
}
