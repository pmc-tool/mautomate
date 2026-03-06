import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Paperclip,
  Bot,
  UserCheck,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Inbox,
  Smile,
  Search,
  Pin,
} from "lucide-react";
import { useAction } from "wasp/client/operations";
import {
  sendInboxMessage,
  takeOverConversation,
  returnToAi,
  updateConversationStatus,
  toggleConversationStar,
} from "wasp/client/operations";
import { Button } from "../../../../client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../../client/components/ui/dropdown-menu";
import { cn } from "../../../../client/utils";
import { MessageBubble } from "./MessageBubble";
import { ChannelIcon } from "../shared/ChannelIcon";

interface ChatPanelProps {
  conversation: any;
  messages: any[];
  isLoading: boolean;
  onRefresh: () => void;
  currentUserId: string;
  sendTyping?: (conversationId: string, isTyping: boolean) => void;
  typingUsers?: string[];
}

export function ChatPanel({ conversation, messages, isLoading, onRefresh, currentUserId, sendTyping, typingUsers = [] }: ChatPanelProps) {
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sendMessageAction = useAction(sendInboxMessage);
  const takeOverAction = useAction(takeOverConversation);
  const returnToAiAction = useAction(returnToAi);
  const updateStatusAction = useAction(updateConversationStatus);
  const toggleStarAction = useAction(toggleConversationStar);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Emit typing indicator with debounce — MUST be before any early return
  const handleTypingEmit = useCallback(() => {
    if (!conversation?.id || !sendTyping) return;
    sendTyping(conversation.id, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(conversation.id, false);
    }, 2000);
  }, [conversation?.id, sendTyping]);

  // Empty state — AFTER all hooks
  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-3xl bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-black/20">
            <Inbox size={40} className="text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Select a conversation</h3>
          <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
            Choose a conversation from the list to view messages and respond to your customers
          </p>
        </div>
      </div>
    );
  }

  const contact = conversation.contact;
  const contactName = contact?.name || contact?.email || contact?.channelUserId || "Unknown";
  const isHumanMode = conversation.handlerMode === "human" && conversation.assignedTo === currentUserId;
  const canSend = isHumanMode;

  const handleSend = async () => {
    if (!messageText.trim() || !canSend) return;
    setIsSending(true);
    try {
      await sendMessageAction({
        conversationId: conversation.id,
        content: messageText.trim(),
      });
      setMessageText("");
      onRefresh();
      inputRef.current?.focus();
    } catch (err: any) {
      console.error("Send failed:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleTakeOver = async () => {
    try {
      await takeOverAction({ conversationId: conversation.id });
      onRefresh();
    } catch (err: any) {
      console.error("Take over failed:", err);
    }
  };

  const handleReturnToAi = async () => {
    try {
      await returnToAiAction({ conversationId: conversation.id });
      onRefresh();
    } catch (err: any) {
      console.error("Return to AI failed:", err);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await updateStatusAction({ conversationId: conversation.id, status: status as any });
      onRefresh();
    } catch (err: any) {
      console.error("Status change failed:", err);
    }
  };

  const handleToggleStar = async () => {
    try {
      await toggleStarAction({ conversationId: conversation.id });
      onRefresh();
    } catch (err: any) {
      console.error("Toggle star failed:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      // Stop typing indicator on send
      if (sendTyping && conversation?.id) {
        sendTyping(conversation.id, false);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  return (
    <div className="flex flex-1 flex-col h-full min-w-0">
      {/* Chat header */}
      <div className="flex items-center justify-between border-b px-5 py-3 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <div className="bg-gradient-to-br from-slate-600 to-slate-700 text-white flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold flex-shrink-0">
              {contactName.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white dark:bg-slate-900 p-[2px]">
              <ChannelIcon channel={conversation.channel} size={11} />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[15px] truncate">{contactName}</span>
              <span className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium leading-none",
                conversation.status === "open" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                conversation.status === "resolved" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              )}>
                {conversation.status}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {conversation.handlerMode === "ai" && (
                <span className="flex items-center gap-1 text-[11px] text-violet-600 dark:text-violet-400 font-medium">
                  <Bot size={11} /> AI handling
                </span>
              )}
              {conversation.handlerMode === "human" && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <UserCheck size={11} /> Agent assigned
                </span>
              )}
              {conversation.handlerMode === "queued" && (
                <span className="flex items-center gap-1 text-[11px] text-orange-600 dark:text-orange-400 font-medium">
                  <Clock size={11} /> Waiting for agent
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Primary action button */}
          {(conversation.handlerMode === "ai" || conversation.handlerMode === "queued") && (
            <Button variant="default" size="sm" onClick={handleTakeOver} className="h-8 text-xs px-4 rounded-lg">
              <UserCheck size={14} className="mr-1.5" />
              Take Over
            </Button>
          )}
          {conversation.handlerMode === "human" && conversation.assignedTo === currentUserId && (
            <Button variant="outline" size="sm" onClick={handleReturnToAi} className="h-8 text-xs px-4 rounded-lg">
              <Bot size={14} className="mr-1.5" />
              Return to AI
            </Button>
          )}

          <div className="h-5 w-px bg-border mx-1" />

          <button
            onClick={handleToggleStar}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Star size={16} className={conversation.isStarred ? "text-amber-500 fill-amber-500" : ""} />
          </button>

          <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Search size={16} />
          </button>

          <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Pin size={16} />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <MoreVertical size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleStatusChange("resolved")}>
                <CheckCircle size={14} className="mr-2 text-emerald-600" />
                Mark Resolved
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange("closed")}>
                <XCircle size={14} className="mr-2 text-slate-500" />
                Close Conversation
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleStatusChange("open")}>
                <Clock size={14} className="mr-2 text-blue-600" />
                Reopen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 bg-slate-50/50 dark:bg-slate-950/30">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={cn("flex gap-2 animate-pulse", i % 2 !== 0 && "justify-end")}>
                {i % 2 === 0 && <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />}
                <div className="h-14 w-48 rounded-2xl bg-slate-200 dark:bg-slate-700" />
                {i % 2 !== 0 && <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />}
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          <>
            {/* Date header for first message */}
            <div className="text-center mb-5">
              <span className="text-muted-foreground text-[11px] bg-white dark:bg-slate-800 px-4 py-1.5 rounded-full shadow-sm border border-slate-100 dark:border-slate-700">
                {new Date(messages[0].createdAt).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} isCurrentUser={msg.senderId === currentUserId} />
            ))}
            {conversation.handlerMode === "queued" && (
              <div className="text-center py-4">
                <span className="inline-flex items-center gap-1.5 text-[12px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-4 py-2 rounded-full border border-orange-200 dark:border-orange-800 shadow-sm">
                  <Clock size={12} />
                  Waiting for agent to take over...
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-5 py-2 border-t bg-white/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
            <span>
              {typingUsers.length === 1
                ? `${typingUsers[0]} is typing...`
                : `${typingUsers.join(", ")} are typing...`}
            </span>
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="border-t bg-white dark:bg-slate-900">
        {canSend ? (
          <div className="px-5 py-4">
            <div className="flex items-end gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
              <button className="text-slate-400 hover:text-foreground transition-colors p-0.5 flex-shrink-0 mb-0.5">
                <Paperclip size={18} />
              </button>
              <textarea
                ref={inputRef}
                placeholder="Type a message..."
                className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-slate-400 min-h-[22px] max-h-[120px] py-0.5"
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  handleTypingEmit();
                  // Auto-resize
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={handleKeyDown}
                disabled={isSending}
                rows={1}
              />
              <button className="text-slate-400 hover:text-foreground transition-colors p-0.5 flex-shrink-0 mb-0.5">
                <Smile size={18} />
              </button>
              <Button
                size="icon"
                className="h-8 w-8 rounded-xl flex-shrink-0 mb-0.5 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                onClick={handleSend}
                disabled={!messageText.trim() || isSending}
              >
                <Send size={15} />
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4">
            <div className="text-center text-sm py-3 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-muted-foreground border border-slate-200 dark:border-slate-700">
              {conversation.handlerMode === "ai" && (
                <span className="flex items-center justify-center gap-1.5">
                  <Bot size={15} className="text-violet-500" /> AI is handling this conversation. Click <strong className="text-foreground">Take Over</strong> to respond.
                </span>
              )}
              {conversation.handlerMode === "queued" && (
                <span className="flex items-center justify-center gap-1.5">
                  <Clock size={15} className="text-orange-500" /> Waiting for agent assignment. Click <strong className="text-foreground">Take Over</strong> to respond.
                </span>
              )}
              {conversation.handlerMode === "human" && conversation.assignedTo !== currentUserId && (
                "This conversation is assigned to another agent."
              )}
              {conversation.status === "closed" && "This conversation is closed."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
