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
      <div className="flex items-center justify-center my-5">
        <div className="text-muted-foreground text-[11px] text-center bg-muted/60 rounded-full px-4 py-1.5">
          {content}
          <span className="ml-2 opacity-50">
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
    <div className={cn("flex gap-2.5 mb-4 max-w-[70%]", alignRight ? "ml-auto flex-row-reverse" : "mr-auto")}>
      {/* Avatar */}
      <div className={cn(
        "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        isContact && "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
        isAi && "bg-violet-500 text-white",
        isAgent && "bg-emerald-500 text-white",
      )}>
        {isContact && (senderName?.charAt(0)?.toUpperCase() || <User size={14} />)}
        {isAi && <Bot size={14} />}
        {isAgent && (senderName?.charAt(0)?.toUpperCase() || <User size={14} />)}
      </div>

      {/* Bubble */}
      <div className="space-y-1">
        <div className={cn("flex items-center gap-2", alignRight && "flex-row-reverse")}>
          <span className="text-[12px] font-medium text-foreground/70">
            {isAi ? "AI Assistant" : senderName || (isContact ? "Customer" : "Agent")}
          </span>
          <span className="text-[10px] text-muted-foreground/60">{timeStr}</span>
        </div>
        <div className={cn(
          "rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed shadow-sm",
          isContact && "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-foreground rounded-tl-sm",
          isAi && "bg-gradient-to-br from-violet-500 to-violet-600 text-white rounded-tr-sm",
          isAgent && "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-tr-sm",
        )}>
          <p className="whitespace-pre-wrap break-words">{content}</p>
          {message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {(message.attachments as any[]).map((att: any, i: number) => (
                <div key={i} className="text-xs opacity-80 flex items-center gap-1">
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
