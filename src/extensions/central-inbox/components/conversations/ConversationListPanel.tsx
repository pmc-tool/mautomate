import { useState } from "react";
import {
  Search,
  Star,
  User,
  Users,
  MessageSquare,
  Inbox,
  Settings,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router";
import { Input } from "../../../../client/components/ui/input";
import { cn } from "../../../../client/utils";
import { ConversationListItem } from "./ConversationListItem";
import { ChannelIcon } from "../shared/ChannelIcon";

const CHANNELS = [
  { id: "all", label: "All" },
  { id: "website", label: "Web" },
  { id: "whatsapp", label: "WA" },
  { id: "telegram", label: "TG" },
  { id: "messenger", label: "FB" },
  { id: "instagram", label: "IG" },
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

  return (
    <div className="flex h-full w-[300px] flex-shrink-0 flex-col border-r bg-background">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Inbox size={18} className="text-primary" />
          <h2 className="text-[15px] font-semibold">Inbox</h2>
          {totalActive > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[11px] font-semibold text-primary">
              {totalActive}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <Link to="/inbox/contacts">
            <button className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <Users size={15} />
            </button>
          </Link>
          <Link to="/inbox/settings">
            <button className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <Settings size={15} />
            </button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search size={14} className="text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search..."
            className="h-8 pl-8 text-xs bg-muted/40 border-0 focus-visible:ring-1"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
      </div>

      {/* Channel pills — single compact row */}
      <div className="flex items-center gap-1 px-3 py-2 border-b">
        {CHANNELS.map((ch) => (
          <button
            key={ch.id}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
              activeChannel === ch.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            onClick={() => handleChannelChange(ch.id)}
          >
            {ch.id !== "all" && (
              <ChannelIcon
                channel={ch.id}
                size={12}
                className={activeChannel === ch.id ? "text-primary-foreground" : ""}
              />
            )}
            {ch.label}
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b bg-muted/20">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          return (
            <button
              key={f.id}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                activeFilter === f.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => handleFilterChange(f.id)}
            >
              <Icon size={12} />
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-0.5 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                <div className="h-9 w-9 rounded-full bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-muted" />
                  <div className="h-2.5 w-1/2 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Inbox size={32} className="mb-2 opacity-30" />
            <p className="text-sm font-medium">No conversations</p>
            <p className="text-xs mt-0.5 opacity-70">Messages will appear here</p>
          </div>
        ) : (
          <div className="py-1">
            {conversations.map((convo) => (
              <ConversationListItem
                key={convo.id}
                conversation={convo}
                isSelected={selectedId === convo.id}
                onClick={() => onSelect(convo.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
