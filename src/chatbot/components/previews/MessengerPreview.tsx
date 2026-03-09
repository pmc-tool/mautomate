import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { chatWithBot } from "wasp/client/operations";
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
  Send,
  type LucideIcon,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface MessengerPreviewProps {
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

export default function MessengerPreview({ draft, chatbotId }: MessengerPreviewProps) {
  const color = draft.color || "#017BE5";
  const AvatarIcon = AVATAR_MAP[draft.avatar || "bot"] || Bot;
  const welcomeMessage = draft.welcomeMessage || "Hello! How can I help you today?";
  const title = draft.title || "Chatbot";

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: welcomeMessage },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newWelcome = draft.welcomeMessage || "Hello! How can I help you today?";
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === "assistant") {
        return [{ role: "assistant", content: newWelcome }];
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

    const history = messages.slice();
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await chatWithBot({ chatbotId, message: trimmed, history });
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: err?.message || "Sorry, something went wrong." },
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

  const now = new Date();
  const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="h-[600px] w-[350px]">
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border bg-background shadow-xl">
        {/* Messenger Header */}
        <div className="flex items-center gap-3 bg-[#0084FF] px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <AvatarIcon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-xs text-white/70">Active now</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto bg-white p-4 dark:bg-gray-950">
          {messages.map((msg, i) =>
            msg.role === "assistant" ? (
              <div key={i} className="flex items-end gap-2">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: color }}
                >
                  <AvatarIcon className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-[#E4E6EB] px-3 py-2 dark:bg-gray-800">
                  <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-end">
                <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-[#0084FF] px-3 py-2">
                  <p className="text-sm text-white whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            )
          )}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex items-end gap-2">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: color }}
              >
                <AvatarIcon className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="rounded-2xl rounded-bl-sm bg-[#E4E6EB] px-3 py-2 dark:bg-gray-800">
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

        {/* Messenger Input Bar */}
        <div className="border-t bg-white px-3 py-2 dark:bg-gray-950">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 shrink-0 text-[#0084FF]" />
            <div className="flex flex-1 items-center rounded-full bg-[#F0F2F5] px-3 py-1.5 dark:bg-gray-800">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={chatbotId ? "Aa" : "Save to chat..."}
                disabled={!chatbotId || isLoading}
                className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-500 disabled:cursor-not-allowed dark:text-gray-100"
              />
            </div>
            {input.trim() ? (
              <button
                onClick={handleSend}
                disabled={!chatbotId || isLoading}
                className="flex h-8 w-8 items-center justify-center rounded-full transition-opacity disabled:opacity-50"
              >
                <Send className="h-5 w-5 text-[#0084FF]" />
              </button>
            ) : (
              <ThumbsUp className="h-5 w-5 shrink-0 text-[#0084FF]" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
