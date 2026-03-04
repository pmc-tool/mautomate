import { Bot, User, AlertCircle, Check, CheckCheck } from "lucide-react";
import { cn } from "../../../../client/utils";

interface MessageBubbleProps {
  message: any;
  isCurrentUser?: boolean;
}

export function MessageBubble({ message, isCurrentUser }: MessageBubbleProps) {
  const { senderType, content, senderName, createdAt, status } = message;

  if (senderType === "system") {
    return (
      <div className="flex items-center justify-center my-4">
        <div className="text-muted-foreground text-[11px] text-center bg-background border rounded-full px-3 py-1">
          {content}
          <span className="ml-1.5 opacity-50">
            {new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
    );
  }

  const isContact = senderType === "contact";
  const isAi = senderType === "ai";
  const isAgent = senderType === "agent";
  const alignRight = isAgent || isAi;

  const timeStr = new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={cn("flex gap-2 mb-3 max-w-[75%]", alignRight ? "ml-auto flex-row-reverse" : "mr-auto")}>
      {/* Avatar */}
      <div className={cn(
        "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-medium mt-5",
        isContact && "bg-muted text-muted-foreground",
        isAi && "bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 dark:from-purple-900/50 dark:to-purple-800/50 dark:text-purple-300",
        isAgent && "bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 dark:from-blue-900/50 dark:to-blue-800/50 dark:text-blue-300",
      )}>
        {isContact && (senderName?.charAt(0)?.toUpperCase() || <User size={13} />)}
        {isAi && <Bot size={13} />}
        {isAgent && (senderName?.charAt(0)?.toUpperCase() || <User size={13} />)}
      </div>

      {/* Bubble */}
      <div className="space-y-0.5">
        <div className={cn("flex items-center gap-1.5", alignRight && "flex-row-reverse")}>
          <span className="text-muted-foreground text-[11px] font-medium">
            {isAi ? "AI Assistant" : senderName || (isContact ? "Customer" : "Agent")}
          </span>
          <span className="text-muted-foreground/60 text-[10px]">{timeStr}</span>
        </div>
        <div className={cn(
          "rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
          isContact && "bg-background border text-foreground rounded-tl-md",
          isAi && "bg-purple-50 dark:bg-purple-950/30 text-foreground border border-purple-100 dark:border-purple-900/50 rounded-tr-md",
          isAgent && "bg-primary text-primary-foreground rounded-tr-md",
        )}>
          <p className="whitespace-pre-wrap break-words">{content}</p>
          {message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {(message.attachments as any[]).map((att: any, i: number) => (
                <div key={i} className="text-xs opacity-70 flex items-center gap-1">
                  [{att.type || "file"}: {att.name}]
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Delivery status */}
        {alignRight && status && status !== "sent" && (
          <div className={cn("flex gap-0.5 text-[10px]", alignRight && "justify-end")}>
            {status === "delivered" && <Check size={10} className="text-muted-foreground" />}
            {status === "read" && <CheckCheck size={10} className="text-blue-500" />}
            {status === "failed" && (
              <span className="flex items-center gap-0.5 text-destructive">
                <AlertCircle size={10} /> Failed
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
