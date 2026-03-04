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
  Camera,
  type LucideIcon,
} from "lucide-react";

interface WhatsAppPreviewProps {
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

export default function WhatsAppPreview({ draft }: WhatsAppPreviewProps) {
  const color = draft.color || "#017BE5";
  const AvatarIcon = AVATAR_MAP[draft.avatar || "bot"] || Bot;
  const welcomeMessage = draft.welcomeMessage || "Hello! How can I help you today?";
  const title = draft.title || "Chatbot";

  return (
    <div className="h-[600px] w-[350px]">
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border shadow-xl">
        {/* WhatsApp Header — dark teal */}
        <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <AvatarIcon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-xs text-white/70">online</p>
          </div>
        </div>

        {/* Messages — WhatsApp chat background */}
        <div
          className="flex-1 space-y-2 overflow-y-auto p-3"
          style={{
            backgroundColor: "#ECE5DD",
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cfc6' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        >
          {/* Bot message — WhatsApp style with tail */}
          <div className="flex justify-start">
            <div className="relative max-w-[80%] rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-sm">
              <p className="text-[13px] text-gray-900">{welcomeMessage}</p>
              <p className="mt-0.5 text-right text-[10px] text-gray-500">12:00</p>
            </div>
          </div>

          {/* User message — green bubble with tail */}
          <div className="flex justify-end">
            <div className="relative max-w-[80%] rounded-lg rounded-tr-none bg-[#DCF8C6] px-3 py-2 shadow-sm">
              <p className="text-[13px] text-gray-900">Tell me more about your services</p>
              <div className="mt-0.5 flex items-center justify-end gap-1">
                <p className="text-[10px] text-gray-500">12:01</p>
                <svg className="h-3 w-3 text-[#53BDEB]" viewBox="0 0 16 15" fill="currentColor">
                  <path d="M15.01 3.316l-.478-.372a.365.365 0 00-.51.063L8.666 9.88 5.64 6.328a.365.365 0 00-.54-.038l-.478.372a.365.365 0 00-.04.54l3.78 4.38a.365.365 0 00.54.038l6.148-7.82a.365.365 0 00-.04-.484z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Bot reply */}
          <div className="flex justify-start">
            <div className="relative max-w-[80%] rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-sm">
              <p className="text-[13px] text-gray-900">
                I'd be happy to help! We offer a wide range of services tailored to your needs.
              </p>
              <p className="mt-0.5 text-right text-[10px] text-gray-500">12:01</p>
            </div>
          </div>
        </div>

        {/* WhatsApp Input Bar */}
        <div className="bg-[#F0F0F0] px-2 py-2">
          <div className="flex items-center gap-2">
            <Smile className="h-5 w-5 text-gray-600" />
            <div className="flex flex-1 items-center rounded-full bg-white px-3 py-1.5">
              <span className="text-sm text-gray-500">Type a message</span>
            </div>
            <div className="flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-gray-600" />
              <Camera className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366]">
              <Mic className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
