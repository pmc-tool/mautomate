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
      <div className="flex flex-1 items-center justify-center bg-muted/10">
        <div className="text-center max-w-xs">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/60">
            <Inbox size={32} className="text-muted-foreground/60" />
          </div>
          <h3 className="text-base font-semibold text-foreground/80">Select a conversation</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Choose a conversation from the list to view messages and respond
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
      <div className="flex items-center justify-between border-b px-4 py-2 bg-background">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold flex-shrink-0">
            {contactName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">{contactName}</span>
              <ChannelIcon channel={conversation.channel} size={13} />
              <span className={cn(
                "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
                conversation.status === "open" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                conversation.status === "resolved" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              )}>
                {conversation.status}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {conversation.handlerMode === "ai" && (
                <span className="flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400">
                  <Bot size={11} /> AI handling
                </span>
              )}
              {conversation.handlerMode === "human" && (
                <span className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400">
                  <UserCheck size={11} /> Agent assigned
                </span>
              )}
              {conversation.handlerMode === "queued" && (
                <span className="flex items-center gap-1 text-[11px] text-orange-600 dark:text-orange-400">
                  <Clock size={11} /> Waiting for agent
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Primary action button */}
          {(conversation.handlerMode === "ai" || conversation.handlerMode === "queued") && (
            <Button variant="default" size="sm" onClick={handleTakeOver} className="h-7 text-xs px-3">
              <UserCheck size={13} className="mr-1" />
              Take Over
            </Button>
          )}
          {conversation.handlerMode === "human" && conversation.assignedTo === currentUserId && (
            <Button variant="outline" size="sm" onClick={handleReturnToAi} className="h-7 text-xs px-3">
              <Bot size={13} className="mr-1" />
              Return to AI
            </Button>
          )}

          <button
            onClick={handleToggleStar}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
          >
            <Star size={15} className={conversation.isStarred ? "text-yellow-500 fill-yellow-500" : ""} />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors">
                <MoreVertical size={15} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => handleStatusChange("resolved")}>
                <CheckCircle size={14} className="mr-2 text-green-600" />
                Resolve
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange("closed")}>
                <XCircle size={14} className="mr-2 text-gray-500" />
                Close
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 bg-muted/10">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={cn("flex gap-2 animate-pulse", i % 2 !== 0 && "justify-end")}>
                {i % 2 === 0 && <div className="h-7 w-7 rounded-full bg-muted flex-shrink-0" />}
                <div className="h-12 w-44 rounded-xl bg-muted" />
                {i % 2 !== 0 && <div className="h-7 w-7 rounded-full bg-muted flex-shrink-0" />}
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
            <div className="text-center mb-4">
              <span className="text-muted-foreground text-[11px] bg-background px-3 py-1 rounded-full border">
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
              <div className="text-center py-3">
                <span className="inline-flex items-center gap-1.5 text-[12px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-full border border-orange-200 dark:border-orange-800">
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
        <div className="px-4 py-1.5 border-t bg-background/80">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
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
      <div className="border-t bg-background">
        {canSend ? (
          <div className="px-4 py-3">
            <div className="flex items-end gap-2 bg-muted/30 rounded-xl border px-3 py-2">
              <button className="text-muted-foreground hover:text-foreground transition-colors p-1 flex-shrink-0 mb-0.5">
                <Paperclip size={16} />
              </button>
              <textarea
                ref={inputRef}
                placeholder="Type a message..."
                className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground min-h-[20px] max-h-[120px] py-0.5"
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
              <button className="text-muted-foreground hover:text-foreground transition-colors p-1 flex-shrink-0 mb-0.5">
                <Smile size={16} />
              </button>
              <Button
                size="icon"
                className="h-7 w-7 rounded-lg flex-shrink-0 mb-0.5"
                onClick={handleSend}
                disabled={!messageText.trim() || isSending}
              >
                <Send size={14} />
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3">
            <div className="text-center text-sm py-2.5 px-4 rounded-xl bg-muted/40 text-muted-foreground">
              {conversation.handlerMode === "ai" && (
                <span className="flex items-center justify-center gap-1.5">
                  <Bot size={14} /> AI is handling this conversation. Click <strong className="text-foreground">Take Over</strong> to respond.
                </span>
              )}
              {conversation.handlerMode === "queued" && (
                <span className="flex items-center justify-center gap-1.5">
                  <Clock size={14} /> Waiting for agent assignment. Click <strong className="text-foreground">Take Over</strong> to respond.
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
