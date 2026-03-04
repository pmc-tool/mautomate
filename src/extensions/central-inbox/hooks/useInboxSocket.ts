import { useEffect, useCallback, useRef } from "react";
import { useSocket, useSocketListener } from "wasp/client/webSocket";

// ---------------------------------------------------------------------------
// WebSocket hook for the inbox — wraps Wasp's Socket.IO client
// ---------------------------------------------------------------------------

interface UseInboxSocketOptions {
  conversationId?: string | null;
  onNewMessage?: (data: any) => void;
  onConversationUpdated?: (data: any) => void;
  onNewConversation?: (data: any) => void;
  onHandoffRequest?: (data: any) => void;
  onTyping?: (data: any) => void;
  onPresence?: (data: any) => void;
}

export function useInboxSocket(options: UseInboxSocketOptions = {}) {
  const { socket, isConnected } = useSocket();
  const prevConvoRef = useRef<string | null>(null);

  // Join/leave conversation rooms
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Leave previous conversation room
    if (prevConvoRef.current && prevConvoRef.current !== options.conversationId) {
      socket.emit("inbox:leave_conversation", { conversationId: prevConvoRef.current });
    }

    // Join new conversation room
    if (options.conversationId) {
      socket.emit("inbox:join_conversation", { conversationId: options.conversationId });
      socket.emit("inbox:mark_read", { conversationId: options.conversationId });
    }

    prevConvoRef.current = options.conversationId || null;

    return () => {
      if (options.conversationId && socket) {
        socket.emit("inbox:leave_conversation", { conversationId: options.conversationId });
      }
    };
  }, [socket, isConnected, options.conversationId]);

  // Event listeners
  useSocketListener("inbox:new_message", (data: any) => {
    options.onNewMessage?.(data);
  });

  useSocketListener("inbox:conversation_updated", (data: any) => {
    options.onConversationUpdated?.(data);
  });

  useSocketListener("inbox:new_conversation", (data: any) => {
    options.onNewConversation?.(data);
  });

  useSocketListener("inbox:handoff_request", (data: any) => {
    options.onHandoffRequest?.(data);
  });

  useSocketListener("inbox:typing", (data: any) => {
    options.onTyping?.(data);
  });

  useSocketListener("inbox:presence", (data: any) => {
    options.onPresence?.(data);
  });

  // Emit helpers
  const sendTyping = useCallback(
    (conversationId: string, isTyping: boolean) => {
      if (socket && isConnected) {
        socket.emit("inbox:typing", { conversationId, isTyping });
      }
    },
    [socket, isConnected]
  );

  const markRead = useCallback(
    (conversationId: string) => {
      if (socket && isConnected) {
        socket.emit("inbox:mark_read", { conversationId });
      }
    },
    [socket, isConnected]
  );

  return { socket, isConnected, sendTyping, markRead };
}
