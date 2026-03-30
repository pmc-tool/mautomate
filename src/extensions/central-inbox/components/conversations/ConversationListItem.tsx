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
    conversation.handlerMode === "ai" ? "text-violet-500" :
    conversation.handlerMode === "human" ? "text-emerald-500" :
    "text-orange-500";

  const HandlerIcon = handlerIcon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-3 transition-all relative",
        isSelected
          ? "bg-primary/5 dark:bg-primary/10"
          : hasUnread
            ? "hover:bg-slate-50 dark:hover:bg-slate-800/60"
            : "hover:bg-slate-50 dark:hover:bg-slate-800/40",
      )}
    >
      {/* Active indicator bar */}
      {isSelected && (
        <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />
      )}

      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0 mt-0.5">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold",
            isSelected
              ? "bg-gradient-to-br from-slate-600 to-slate-700 text-white"
              : hasUnread
                ? "bg-gradient-to-br from-primary/80 to-primary text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
          )}>
            {name.charAt(0).toUpperCase()}
          </div>
          {/* Channel indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white dark:bg-slate-900 p-[2px] shadow-sm">
            <ChannelIcon channel={conversation.channel} size={10} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={cn("text-[13px] truncate", hasUnread ? "font-bold text-foreground" : "font-medium text-foreground/80")}>
              {name}
            </span>
            <span className="text-muted-foreground text-[10px] flex-shrink-0 tabular-nums">{timeAgo}</span>
          </div>

          <div className="flex items-center gap-1 mt-0.5">
            <ChannelIcon channel={conversation.channel} size={10} className="opacity-50 flex-shrink-0" />
            <span className="text-muted-foreground/70 text-[10px] capitalize">@{conversation.channel}</span>
          </div>

          <p className={cn(
            "text-[12px] truncate mt-1",
            hasUnread ? "text-foreground/80 font-medium" : "text-muted-foreground"
          )}>
            {conversation.lastMessagePreview || "No messages yet"}
          </p>

          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-1.5">
              <HandlerIcon size={11} className={handlerColor} />
              {conversation.status !== "open" && (
                <span className="text-muted-foreground text-[10px] capitalize">
                  {conversation.status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {conversation.isStarred && <Star size={11} className="text-amber-500 fill-amber-500" />}
              {hasUnread && (
                <span className="bg-emerald-500 text-white flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-bold shadow-sm">
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
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
