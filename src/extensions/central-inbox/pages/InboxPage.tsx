import { useState, useCallback, useEffect, useRef } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import {
  getConversations,
  getConversation,
  getInboxStats,
} from "wasp/client/operations";
import { ConversationListPanel } from "../components/conversations/ConversationListPanel";
import { ChatPanel } from "../components/chat/ChatPanel";
import { ContactDetailPanel } from "../components/contact/ContactDetailPanel";
import { useInboxSocket } from "../hooks/useInboxSocket";
import UserSidebar from "../../../user-dashboard/layout/UserSidebar";
import UserHeader from "../../../user-dashboard/layout/UserHeader";

export default function InboxPage({ user }: { user: AuthUser }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});

  const {
    data: conversationsData,
    isLoading: convosLoading,
    refetch: refetchConversations,
  } = useQuery(getConversations, filters);

  const {
    data: conversationDetail,
    isLoading: detailLoading,
    refetch: refetchDetail,
  } = useQuery(
    getConversation,
    selectedConvoId ? { id: selectedConvoId } : undefined,
    { enabled: !!selectedConvoId }
  );

  const { data: stats } = useQuery(getInboxStats);

  // Typing indicator state
  const [typingUsers, setTypingUsers] = useState<Record<string, { name: string; timeout: NodeJS.Timeout }>>({});
  const typingUsersRef = useRef(typingUsers);
  typingUsersRef.current = typingUsers;

  const conversations = conversationsData?.conversations || [];
  const messages = conversationDetail?.messages || [];

  // Stable refs for socket callbacks
  const selectedConvoIdRef = useRef(selectedConvoId);
  selectedConvoIdRef.current = selectedConvoId;
  const refetchConversationsRef = useRef(refetchConversations);
  refetchConversationsRef.current = refetchConversations;
  const refetchDetailRef = useRef(refetchDetail);
  refetchDetailRef.current = refetchDetail;

  // All callbacks defined before the hook — stable hook count
  const handleNewMessage = useCallback((data: any) => {
    refetchConversationsRef.current();
    if (data.conversationId === selectedConvoIdRef.current) refetchDetailRef.current();
  }, []);

  const handleConversationUpdated = useCallback((data: any) => {
    refetchConversationsRef.current();
    if (data.conversationId === selectedConvoIdRef.current) refetchDetailRef.current();
  }, []);

  const handleNewConversation = useCallback(() => {
    refetchConversationsRef.current();
  }, []);

  const handleHandoffRequest = useCallback(() => {
    refetchConversationsRef.current();
  }, []);

  const handleTyping = useCallback((data: any) => {
    if (!data?.userId || data.userId === user.id) return;
    const key = data.userId;
    if (data.isTyping) {
      const existing = typingUsersRef.current[key];
      if (existing?.timeout) clearTimeout(existing.timeout);
      const timeout = setTimeout(() => {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, 3000);
      setTypingUsers((prev) => ({
        ...prev,
        [key]: { name: data.userName || "Someone", timeout },
      }));
    } else {
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (next[key]?.timeout) clearTimeout(next[key].timeout);
        delete next[key];
        return next;
      });
    }
  }, [user.id]);

  const { markRead, sendTyping } = useInboxSocket({
    conversationId: selectedConvoId,
    onNewMessage: handleNewMessage,
    onConversationUpdated: handleConversationUpdated,
    onNewConversation: handleNewConversation,
    onHandoffRequest: handleHandoffRequest,
    onTyping: handleTyping,
  });

  useEffect(() => {
    if (selectedConvoId) markRead(selectedConvoId);
  }, [selectedConvoId, markRead]);

  const handleRefresh = () => {
    refetchConversations();
    refetchDetail();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <UserSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <UserHeader sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} user={user} />

        {/* Full-height 3-panel inbox directly below dashboard header */}
        <div className="flex flex-1 overflow-hidden">
          <ConversationListPanel
            conversations={conversations}
            selectedId={selectedConvoId}
            onSelect={setSelectedConvoId}
            isLoading={convosLoading}
            stats={stats}
            filters={filters}
            onFiltersChange={setFilters}
          />

          <ChatPanel
            conversation={conversationDetail}
            messages={messages}
            isLoading={detailLoading && !!selectedConvoId}
            onRefresh={handleRefresh}
            currentUserId={user.id}
            sendTyping={sendTyping}
            typingUsers={Object.values(typingUsers).map((u) => u.name)}
          />

          <div className="hidden xl:block">
            <ContactDetailPanel
              conversation={conversationDetail}
              onRefresh={handleRefresh}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
