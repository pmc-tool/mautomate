import { useState } from "react";
import {
  Search,
  Star,
  User,
  Users,
  MessageSquare,
  Inbox,
  Settings,
  SlidersHorizontal,
  Download,
  CalendarDays,
} from "lucide-react";
import { Link } from "react-router";
import { Input } from "../../../../client/components/ui/input";
import { cn } from "../../../../client/utils";
import { ConversationListItem } from "./ConversationListItem";
import { ChannelIcon } from "../shared/ChannelIcon";

const CHANNELS = [
  { id: "all", label: "All" },
  { id: "website", label: "Website" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "telegram", label: "Telegram" },
  { id: "messenger", label: "Messenger" },
  { id: "instagram", label: "Instagram" },
];

const FILTERS = [
  { id: "all", label: "All", icon: MessageSquare },
  { id: "mine", label: "Mine", icon: User },
  { id: "unassigned", label: "Unassigned", icon: Users },
  { id: "starred", label: "Starred", icon: Star },
];

interface ConversationListPanelProps {
  conversations: any[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
  stats?: any;
  filters: {
    channel?: string;
    assignedTo?: string | null;
    isStarred?: boolean;
    search?: string;
  };
  onFiltersChange: (filters: any) => void;
}

export function ConversationListPanel({
  conversations,
  selectedId,
  onSelect,
  isLoading,
  stats,
  filters,
  onFiltersChange,
}: ConversationListPanelProps) {
  const [searchValue, setSearchValue] = useState(filters.search || "");
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeChannel, setActiveChannel] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const handleFilterChange = (filterId: string) => {
    setActiveFilter(filterId);
    const update: any = { ...filters };
    delete update.assignedTo;
    delete update.isStarred;
    if (filterId === "mine") update.assignedTo = "me";
    else if (filterId === "unassigned") update.assignedTo = null;
    else if (filterId === "starred") update.isStarred = true;
    onFiltersChange(update);
  };

  const handleChannelChange = (channelId: string) => {
    setActiveChannel(channelId);
    const update: any = { ...filters };
    if (channelId === "all") delete update.channel;
    else update.channel = channelId;
    onFiltersChange(update);
  };

  const handleSearch = () => {
    onFiltersChange({ ...filters, search: searchValue || undefined });
  };

  const totalActive = stats?.total || conversations.length;

  const displayConversations = showUnreadOnly
    ? conversations.filter((c) => c.unreadCount > 0)
    : conversations;

  return (
    <div className="flex h-full w-[320px] flex-shrink-0 flex-col border-r bg-white dark:bg-slate-900">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Inbox size={16} className="text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-bold">All</h2>
            {totalActive > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 text-[11px] font-bold text-foreground/70">
                {totalActive}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <Link to="/inbox/contacts">
            <button className="rounded-lg p-2 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground transition-colors" title="Contacts">
              <Users size={16} />
            </button>
          </Link>
          <button className="rounded-lg p-2 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground transition-colors" title="Filter">
            <SlidersHorizontal size={16} />
          </button>
          <button className="rounded-lg p-2 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground transition-colors" title="Export">
            <Download size={16} />
          </button>
          <button className="rounded-lg p-2 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground transition-colors" title="Calendar">
            <CalendarDays size={16} />
          </button>
          <Link to="/inbox/settings">
            <button className="rounded-lg p-2 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground transition-colors" title="Settings">
              <Search size={16} />
            </button>
          </Link>
        </div>
      </div>

      {/* Sort + Unread toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <button
          className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
        >
          {sortOrder === "newest" ? "Newest" : "Oldest"}
          <svg width="10" height="10" viewBox="0 0 10 10" className="ml-0.5"><path d="M2 4l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-[12px] text-muted-foreground">Unread</span>
          <button
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className={cn(
              "relative h-5 w-9 rounded-full transition-colors",
              showUnreadOnly ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"
            )}
          >
            <span className={cn(
              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
              showUnreadOnly ? "left-[18px]" : "left-0.5"
            )} />
          </button>
        </label>
      </div>

      {/* Channel section */}
      <div className="px-4 py-2 border-b">
        <button className="flex items-center justify-between w-full text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          All Channel
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 4l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
        <div className="flex flex-wrap gap-1">
          {CHANNELS.map((ch) => (
            <button
              key={ch.id}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                activeChannel === ch.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground"
              )}
              onClick={() => handleChannelChange(ch.id)}
            >
              {ch.id !== "all" && (
                <ChannelIcon
                  channel={ch.id}
                  size={11}
                  className={activeChannel === ch.id ? "text-primary-foreground" : ""}
                />
              )}
              {ch.label}
            </button>
          ))}
        </div>
      </div>

      {/* Agent filter section */}
      <div className="px-4 py-2 border-b">
        <button className="flex items-center justify-between w-full text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          All Agents
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 4l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => {
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  activeFilter === f.id
                    ? "bg-slate-100 dark:bg-slate-800 text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-foreground"
                )}
                onClick={() => handleFilterChange(f.id)}
              >
                <Icon size={11} />
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-0.5 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="h-2.5 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : displayConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Inbox size={36} className="mb-3 opacity-20" />
            <p className="text-sm font-medium">No conversations</p>
            <p className="text-xs mt-1 opacity-70">Messages will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {displayConversations.map((convo) => (
              <ConversationListItem
                key={convo.id}
                conversation={convo}
                isSelected={selectedId === convo.id}
                onClick={() => onSelect(convo.id)}
              />
            ))}
          </div>
        )}

        {/* Bottom status */}
        {!isLoading && displayConversations.length > 0 && (
          <div className="py-4 text-center border-t">
            <span className="text-[11px] text-muted-foreground/60 flex items-center justify-center gap-1.5">
              All Items Loaded
              <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
