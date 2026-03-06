import facebookIcon from "../../client/static/landing/platforms/facebook.png";
import instagramIcon from "../../client/static/landing/platforms/instagram.png";
import xIcon from "../../client/static/landing/platforms/x.png";
import messengerIcon from "../../client/static/landing/platforms/messenger.png";
import whatsappIcon from "../../client/static/landing/platforms/whatsapp.png";
import linkedinIcon from "../../client/static/landing/platforms/linkedin.png";
import youtubeIcon from "../../client/static/landing/platforms/youtube.png";
import youtubeShortsIcon from "../../client/static/landing/platforms/youtube-shorts.png";
import tiktokIcon from "../../client/static/landing/platforms/tiktok.png";

const platforms = [
  { name: "Facebook", icon: facebookIcon, rounded: "rounded-[8px]" },
  { name: "Instagram", icon: instagramIcon, rounded: "" },
  { name: "x", icon: xIcon, rounded: "" },
  { name: "Messenger", icon: messengerIcon, rounded: "" },
  { name: "WhatsApp", icon: whatsappIcon, rounded: "rounded-full" },
  { name: "Linkedin", icon: linkedinIcon, rounded: "" },
  { name: "YouTube", icon: youtubeIcon, rounded: "" },
  { name: "YouTube Shorts", icon: youtubeShortsIcon, rounded: "" },
  { name: "TikTok", icon: tiktokIcon, rounded: "" },
];

export default function SocialConnections() {
  return (
    <div className="mx-auto my-16 flex max-w-[1200px] flex-col items-center gap-[24px] px-4 sm:my-24 sm:gap-[32px] sm:px-6 md:my-32 lg:px-8" id="features">
      <div className="flex flex-col items-center gap-[10px] text-center">
        <h2 className="text-[26px] font-semibold leading-[1.2] tracking-[0.44px] text-[#0a0f14] sm:text-[36px] md:text-[44px] dark:text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
          Power Your Social Connections Automatically
        </h2>
        <p className="max-w-[686px] text-[14px] leading-[1.6] text-[#7c7f85] sm:text-[16px] dark:text-muted-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
          Automate social engagement, scheduling, messaging, and analytics to grow your audience across multiple platforms effortlessly and maximize marketing performance today.
        </p>
      </div>

      <div className="flex w-full flex-wrap content-start items-start justify-center gap-[10px] rounded-[16px] bg-[#f8f4f1] p-[16px] sm:gap-[16px] sm:rounded-[22px] sm:p-[24px] dark:bg-card">
        {platforms.map((platform) => (
          <div
            key={platform.name}
            className="flex items-center gap-[8px] rounded-[10px] bg-white py-[8px] pl-[8px] pr-[14px] transition-all hover:shadow-md sm:gap-[12px] sm:rounded-[12px] sm:py-[12px] sm:pl-[12px] sm:pr-[20px] dark:bg-background"
          >
            <img
              src={platform.icon}
              alt={platform.name}
              className={`h-[26px] w-[26px] object-cover sm:h-[34px] sm:w-[34px] ${platform.rounded}`}
            />
            <span className="whitespace-nowrap text-[15px] font-medium leading-[1.2] tracking-[0.44px] text-[#0a0f14] sm:text-[18px] md:text-[22px] dark:text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              {platform.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
