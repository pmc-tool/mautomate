import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { chatWithBot } from "wasp/client/operations";
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
  Send,
  type LucideIcon,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  time: string;
}

interface WhatsAppPreviewProps {
  draft: Record<string, any>;
  chatbotId?: string;
}

const AVATAR_MAP: Record<string, LucideIcon> = {
  bot: Bot,
  message: MessageCircle,
  headphones: Headphones,
  sparkles: Sparkles,
  cpu: Cpu,
  brain: BrainCircuit,
};

function getTime() {
  const now = new Date();
  return `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export default function WhatsAppPreview({ draft, chatbotId }: WhatsAppPreviewProps) {
  const color = draft.color || "#017BE5";
  const AvatarIcon = AVATAR_MAP[draft.avatar || "bot"] || Bot;
  const welcomeMessage = draft.welcomeMessage || "Hello! How can I help you today?";
  const title = draft.title || "Chatbot";

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: welcomeMessage, time: getTime() },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newWelcome = draft.welcomeMessage || "Hello! How can I help you today?";
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === "assistant") {
        return [{ role: "assistant", content: newWelcome, time: getTime() }];
      }
      return prev;
    });
  }, [draft.welcomeMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || !chatbotId) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: trimmed, time: getTime() }]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await chatWithBot({ chatbotId, message: trimmed, history });
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply, time: getTime() }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: err?.message || "Sorry, something went wrong.", time: getTime() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[600px] w-[350px]">
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border shadow-xl">
        {/* WhatsApp Header */}
        <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <AvatarIcon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-xs text-white/70">online</p>
          </div>
        </div>

        {/* Messages */}
        <div
          className="flex-1 space-y-2 overflow-y-auto p-3"
          style={{
            backgroundColor: "#ECE5DD",
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cfc6' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        >
          {messages.map((msg, i) =>
            msg.role === "assistant" ? (
              <div key={i} className="flex justify-start">
                <div className="relative max-w-[80%] rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-sm">
                  <p className="text-[13px] text-gray-900 whitespace-pre-wrap">{msg.content}</p>
                  <p className="mt-0.5 text-right text-[10px] text-gray-500">{msg.time}</p>
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-end">
                <div className="relative max-w-[80%] rounded-lg rounded-tr-none bg-[#DCF8C6] px-3 py-2 shadow-sm">
                  <p className="text-[13px] text-gray-900 whitespace-pre-wrap">{msg.content}</p>
                  <div className="mt-0.5 flex items-center justify-end gap-1">
                    <p className="text-[10px] text-gray-500">{msg.time}</p>
                    <svg className="h-3 w-3 text-[#53BDEB]" viewBox="0 0 16 15" fill="currentColor">
                      <path d="M15.01 3.316l-.478-.372a.365.365 0 00-.51.063L8.666 9.88 5.64 6.328a.365.365 0 00-.54-.038l-.478.372a.365.365 0 00-.04.54l3.78 4.38a.365.365 0 00.54.038l6.148-7.82a.365.365 0 00-.04-.484z" />
                    </svg>
                  </div>
                </div>
              </div>
            )
          )}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-sm">
                <div className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
                  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
                  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* WhatsApp Input Bar */}
        <div className="bg-[#F0F0F0] px-2 py-2">
          <div className="flex items-center gap-2">
            <Smile className="h-5 w-5 shrink-0 text-gray-600" />
            <div className="flex flex-1 items-center rounded-full bg-white px-3 py-1.5">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={chatbotId ? "Type a message" : "Save to chat..."}
                disabled={!chatbotId || isLoading}
                className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-500 disabled:cursor-not-allowed"
              />
            </div>
            {input.trim() ? (
              <button
                onClick={handleSend}
                disabled={!chatbotId || isLoading}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] transition-opacity disabled:opacity-50"
              >
                <Send className="h-4 w-4 text-white" />
              </button>
            ) : (
              <>
                <Paperclip className="h-5 w-5 shrink-0 text-gray-600" />
                <Camera className="h-5 w-5 shrink-0 text-gray-600" />
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366]">
                  <Mic className="h-4 w-4 text-white" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
