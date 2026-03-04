import {
  Bot,
  MessageCircle,
  Headphones,
  Sparkles,
  Cpu,
  BrainCircuit,
  Smile,
  Paperclip,
  Mic,
  Send,
  type LucideIcon,
} from "lucide-react";

interface TelegramPreviewProps {
  draft: Record<string, any>;
}

const AVATAR_MAP: Record<string, LucideIcon> = {
  bot: Bot,
  message: MessageCircle,
  headphones: Headphones,
  sparkles: Sparkles,
  cpu: Cpu,
  brain: BrainCircuit,
};

export default function TelegramPreview({ draft }: TelegramPreviewProps) {
  const color = draft.color || "#017BE5";
  const AvatarIcon = AVATAR_MAP[draft.avatar || "bot"] || Bot;
  const welcomeMessage = draft.welcomeMessage || "Hello! How can I help you today?";
  const title = draft.title || "Chatbot";

  return (
    <div className="h-[600px] w-[350px]">
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border shadow-xl">
        {/* Telegram Header — blue gradient */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{
            background: "linear-gradient(135deg, #2AABEE 0%, #229ED9 100%)",
          }}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <AvatarIcon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-xs text-white/70">bot</p>
          </div>
        </div>

        {/* Messages — Telegram-style flat bubbles */}
        <div className="flex-1 space-y-2 overflow-y-auto bg-[#EFEFF4] p-3 dark:bg-gray-900">
          {/* Bot message */}
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-xl rounded-tl-sm bg-white px-3 py-2 shadow-sm dark:bg-gray-800">
              <p className="text-[13px] font-medium" style={{ color: "#2AABEE" }}>
                {title}
              </p>
              <p className="text-[13px] text-gray-900 dark:text-gray-100">{welcomeMessage}</p>
              <p className="mt-0.5 text-right text-[10px] text-gray-400">12:00</p>
            </div>
          </div>

          {/* User message */}
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-xl rounded-tr-sm bg-[#EFFDDE] px-3 py-2 shadow-sm dark:bg-[#2B5278]">
              <p className="text-[13px] text-gray-900 dark:text-gray-100">
                Tell me more about your services
              </p>
              <div className="mt-0.5 flex items-center justify-end gap-1">
                <p className="text-[10px] text-gray-400">12:01</p>
                <svg className="h-3 w-3 text-[#4FAE4E]" viewBox="0 0 16 15" fill="currentColor">
                  <path d="M15.01 3.316l-.478-.372a.365.365 0 00-.51.063L8.666 9.88 5.64 6.328a.365.365 0 00-.54-.038l-.478.372a.365.365 0 00-.04.54l3.78 4.38a.365.365 0 00.54.038l6.148-7.82a.365.365 0 00-.04-.484z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Bot reply */}
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-xl rounded-tl-sm bg-white px-3 py-2 shadow-sm dark:bg-gray-800">
              <p className="text-[13px] font-medium" style={{ color: "#2AABEE" }}>
                {title}
              </p>
              <p className="text-[13px] text-gray-900 dark:text-gray-100">
                I'd be happy to help! We offer a wide range of services tailored to your needs.
              </p>
              <p className="mt-0.5 text-right text-[10px] text-gray-400">12:01</p>
            </div>
          </div>
        </div>

        {/* Telegram Input Bar */}
        <div className="border-t bg-white px-3 py-2 dark:bg-gray-950">
          <div className="flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-gray-400" />
            <div className="flex flex-1 items-center rounded-xl bg-[#F0F0F0] px-3 py-1.5 dark:bg-gray-800">
              <span className="text-sm text-gray-400">Message</span>
            </div>
            <Smile className="h-5 w-5 text-gray-400" />
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2AABEE]">
              <Mic className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
