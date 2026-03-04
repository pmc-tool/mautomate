import { Star, Bot, UserCheck, Clock } from "lucide-react";
import { cn } from "../../../../client/utils";
import { ChannelIcon } from "../shared/ChannelIcon";

interface ConversationListItemProps {
  conversation: any;
  isSelected: boolean;
  onClick: () => void;
}

export function ConversationListItem({ conversation, isSelected, onClick }: ConversationListItemProps) {
  const contact = conversation.contact;
  const name = contact?.name || contact?.email || contact?.channelUserId || "Unknown";
  const timeAgo = formatTimeAgo(conversation.lastMessageAt || conversation.createdAt);
  const hasUnread = conversation.unreadCount > 0;

  const handlerIcon =
    conversation.handlerMode === "ai" ? Bot :
    conversation.handlerMode === "human" ? UserCheck :
    Clock;

  const handlerColor =
    conversation.handlerMode === "ai" ? "text-purple-500" :
    conversation.handlerMode === "human" ? "text-blue-500" :
    "text-orange-500";

  const HandlerIcon = handlerIcon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 border-l-2 transition-all",
        isSelected
          ? "bg-primary/5 border-l-primary"
          : hasUnread
            ? "border-l-transparent hover:bg-muted/60"
            : "border-l-transparent hover:bg-muted/40",
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Avatar */}
        <div className="relative flex-shrink-0 mt-0.5">
          <div className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold",
            isSelected
              ? "bg-primary text-primary-foreground"
              : hasUnread
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
          )}>
            {name.charAt(0).toUpperCase()}
          </div>
          {/* Channel indicator dot */}
          <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-[2px]">
            <ChannelIcon channel={conversation.channel} size={10} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className={cn("text-[13px] truncate", hasUnread ? "font-semibold" : "font-medium")}>
              {name}
            </span>
            <span className="text-muted-foreground text-[10px] flex-shrink-0">{timeAgo}</span>
          </div>

          <p className={cn(
            "text-[12px] truncate mt-0.5 leading-tight",
            hasUnread ? "text-foreground/80" : "text-muted-foreground"
          )}>
            {conversation.lastMessagePreview || "No messages yet"}
          </p>

          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1.5">
              <HandlerIcon size={11} className={handlerColor} />
              {conversation.status !== "open" && (
                <span className="text-muted-foreground text-[10px] capitalize">
                  {conversation.status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {conversation.isStarred && <Star size={10} className="text-yellow-500 fill-yellow-500" />}
              {hasUnread && (
                <span className="bg-primary text-primary-foreground flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold">
                  {conversation.unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function formatTimeAgo(dateStr: string | Date): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
