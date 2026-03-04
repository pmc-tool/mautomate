import {
  Bot,
  MessageCircle,
  Headphones,
  Sparkles,
  Cpu,
  BrainCircuit,
  ThumbsUp,
  ImageIcon,
  Mic,
  Plus,
  type LucideIcon,
} from "lucide-react";

interface MessengerPreviewProps {
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

export default function MessengerPreview({ draft }: MessengerPreviewProps) {
  const color = draft.color || "#017BE5";
  const AvatarIcon = AVATAR_MAP[draft.avatar || "bot"] || Bot;
  const welcomeMessage = draft.welcomeMessage || "Hello! How can I help you today?";
  const title = draft.title || "Chatbot";

  return (
    <div className="h-[600px] w-[350px]">
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border bg-background shadow-xl">
        {/* Messenger Header — blue gradient */}
        <div className="flex items-center gap-3 bg-[#0084FF] px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <AvatarIcon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-xs text-white/70">Active now</p>
          </div>
          <div className="flex gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 5.5a2.5 2.5 0 015 0v1h8v-1a2.5 2.5 0 015 0v1.02A2.5 2.5 0 0123 9v8a2.5 2.5 0 01-2.5 2.5h-17A2.5 2.5 0 011 17V9a2.5 2.5 0 012-2.48V5.5z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Messages — Messenger-style rounded bubbles */}
        <div className="flex-1 space-y-3 overflow-y-auto bg-white p-4 dark:bg-gray-950">
          {/* Bot message with avatar */}
          <div className="flex items-end gap-2">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: color }}
            >
              <AvatarIcon className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-[#E4E6EB] px-3 py-2 dark:bg-gray-800">
              <p className="text-sm text-gray-900 dark:text-gray-100">{welcomeMessage}</p>
            </div>
          </div>

          {/* User message — blue bubble, no avatar */}
          <div className="flex justify-end">
            <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-[#0084FF] px-3 py-2">
              <p className="text-sm text-white">Tell me more about your services</p>
            </div>
          </div>

          {/* Bot reply */}
          <div className="flex items-end gap-2">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: color }}
            >
              <AvatarIcon className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-[#E4E6EB] px-3 py-2 dark:bg-gray-800">
              <p className="text-sm text-gray-900 dark:text-gray-100">
                I'd be happy to help! We offer a wide range of services tailored to your needs.
              </p>
            </div>
          </div>
        </div>

        {/* Messenger Input Bar */}
        <div className="border-t bg-white px-3 py-2 dark:bg-gray-950">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-[#0084FF]" />
            <ImageIcon className="h-5 w-5 text-[#0084FF]" />
            <Mic className="h-5 w-5 text-[#0084FF]" />
            <div className="flex flex-1 items-center rounded-full bg-[#F0F2F5] px-3 py-1.5 dark:bg-gray-800">
              <span className="text-sm text-gray-500">Aa</span>
            </div>
            <ThumbsUp className="h-5 w-5 text-[#0084FF]" />
          </div>
        </div>
      </div>
    </div>
  );
}
