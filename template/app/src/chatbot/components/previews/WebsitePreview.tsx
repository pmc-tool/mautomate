import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import { cn } from "../../../client/utils";
import { chatWithBot } from "wasp/client/operations";
import {
  Bot,
  MessageCircle,
  Headphones,
  Sparkles,
  Cpu,
  BrainCircuit,
  Send,
  Smile,
  Paperclip,
  type LucideIcon,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface WebsitePreviewProps {
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

export default function WebsitePreview({ draft, chatbotId }: WebsitePreviewProps) {
  const color = draft.color || "#017BE5";
  const position = draft.position || "right";
  const AvatarIcon = AVATAR_MAP[draft.avatar || "bot"] || Bot;
  const welcomeMessage = draft.welcomeMessage || "Hello! How can I help you today?";
  const title = draft.title || "Chatbot";

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: welcomeMessage },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Update welcome message if draft changes
  useEffect(() => {
    const newWelcome = draft.welcomeMessage || "Hello! How can I help you today?";
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === "assistant") {
        return [{ role: "assistant", content: newWelcome }];
      }
      return prev;
    });
  }, [draft.welcomeMessage]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    if (!chatbotId) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const history = messages.slice(); // current history before adding new user msg
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await chatWithBot({
        chatbotId,
        message: trimmed,
        history,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: err?.message || "Sorry, something went wrong. Please try again.",
        },
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
    <div className="relative h-[600px] w-[350px]">
      {/* Chat Window */}
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border bg-background shadow-xl">
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ backgroundColor: color }}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <AvatarIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-xs text-white/70">Online</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((msg, i) =>
            msg.role === "assistant" ? (
              <div key={i} className="flex gap-2">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: color }}
                >
                  <AvatarIcon className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2">
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {draft.showDateTime && (
                    <p className="text-muted-foreground mt-1 text-[10px]">Just now</p>
                  )}
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-end">
                <div
                  className="rounded-2xl rounded-tr-sm px-3 py-2 text-white"
                  style={{ backgroundColor: color }}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            )
          )}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex gap-2">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: color }}
              >
                <AvatarIcon className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2">
                <div className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: "0ms" }} />
                  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: "150ms" }} />
                  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="border-t p-3">
          <div className="flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-2">
            {draft.isAttachment && (
              <Paperclip className="text-muted-foreground h-4 w-4 shrink-0" />
            )}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={chatbotId ? "Type a message..." : "Save chatbot to chat..."}
              disabled={!chatbotId || isLoading}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            />
            {draft.isEmoji && (
              <Smile className="text-muted-foreground h-4 w-4 shrink-0" />
            )}
            <button
              onClick={handleSend}
              disabled={!input.trim() || !chatbotId || isLoading}
              className="flex h-7 w-7 items-center justify-center rounded-full transition-opacity disabled:opacity-50"
              style={{ backgroundColor: color }}
            >
              <Send className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        </div>

        {draft.showLogo && (
          <div className="border-t px-4 py-2 text-center">
            <p className="text-muted-foreground text-[10px]">Powered by mAutomate</p>
          </div>
        )}
      </div>

      {/* Floating Trigger Button */}
      <div className={cn("absolute -bottom-2", position === "right" ? "-right-4" : "-left-4")}>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full shadow-lg"
          style={{ backgroundColor: color }}
        >
          <AvatarIcon className="h-6 w-6 text-white" />
        </div>
        {draft.bubbleMessage && (
          <div
            className={cn(
              "absolute bottom-14 w-max max-w-48 rounded-lg bg-background px-3 py-2 text-xs shadow-lg border",
              position === "right" ? "right-0" : "left-0"
            )}
          >
            {draft.bubbleMessage}
          </div>
        )}
      </div>
    </div>
  );
}
