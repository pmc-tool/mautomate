import type { WebSocketDefinition, WaspSocketData } from "wasp/server/webSocket";

// ---------------------------------------------------------------------------
// Socket.IO server-side handler
// ---------------------------------------------------------------------------
// Wasp 0.21 auto-wires this as the webSocket fn in main.wasp.
// We define rooms, event handlers, and a global io reference for
// broadcasting from server-side code (webhooks, jobs, etc.).
// ---------------------------------------------------------------------------

// Global io reference so other server modules can broadcast
let _io: any = null;
export function getIO(): any {
  return _io;
}

export const webSocketFn: WebSocketDefinition = (io, context) => {
  _io = io;

  io.on("connection", (socket) => {
    const user = socket.data?.user;
    if (!user) return; // unauthenticated socket — ignore

    // Auto-join user's personal room
    socket.join(`user:${user.id}`);
    // Join agents room (for handoff notifications)
    socket.join(`agents:${user.id}`);

    // ---- Join a specific conversation room ----
    socket.on("inbox:join_conversation", (data: { conversationId: string }) => {
      if (data?.conversationId) {
        socket.join(`conversation:${data.conversationId}`);
      }
    });

    // ---- Leave a specific conversation room ----
    socket.on("inbox:leave_conversation", (data: { conversationId: string }) => {
      if (data?.conversationId) {
        socket.leave(`conversation:${data.conversationId}`);
      }
    });

    // ---- Mark conversation as read ----
    socket.on("inbox:mark_read", async (data: { conversationId: string }) => {
      if (!data?.conversationId) return;
      try {
        await context.entities.InboxConversation.updateMany({
          where: { id: data.conversationId, userId: user.id },
          data: { unreadCount: 0 },
        });
      } catch (_) {
        // silently ignore
      }
    });

    // ---- Typing indicators ----
    socket.on("inbox:typing", (data: { conversationId: string; isTyping: boolean }) => {
      if (!data?.conversationId) return;
      socket.to(`conversation:${data.conversationId}`).emit("inbox:typing", {
        conversationId: data.conversationId,
        userId: user.id,
        userName: user.fullName || user.email || "Agent",
        isTyping: data.isTyping,
      });
    });

    // ---- Presence ----
    socket.on("inbox:presence", (data: { status: string }) => {
      io.to(`agents:${user.id}`).emit("inbox:presence", {
        userId: user.id,
        status: data?.status || "online",
      });
    });

    // Broadcast presence on connect
    io.to(`agents:${user.id}`).emit("inbox:presence", {
      userId: user.id,
      status: "online",
    });

    socket.on("disconnect", () => {
      io.to(`agents:${user.id}`).emit("inbox:presence", {
        userId: user.id,
        status: "offline",
      });
    });
  });
};

// ---------------------------------------------------------------------------
// Helper functions for broadcasting from server-side (operations, jobs, webhooks)
// ---------------------------------------------------------------------------

export function emitNewMessage(userId: string, conversationId: string, message: any) {
  const io = getIO();
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit("inbox:new_message", { conversationId, message });
  io.to(`user:${userId}`).emit("inbox:new_message", { conversationId, message });
}

export function emitConversationUpdated(userId: string, conversationId: string, updates: any) {
  const io = getIO();
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit("inbox:conversation_updated", { conversationId, ...updates });
  io.to(`user:${userId}`).emit("inbox:conversation_updated", { conversationId, ...updates });
}

export function emitNewConversation(userId: string, conversation: any) {
  const io = getIO();
  if (!io) return;
  io.to(`user:${userId}`).emit("inbox:new_conversation", { conversation });
}

export function emitHandoffRequest(userId: string, conversationId: string, reason: string) {
  const io = getIO();
  if (!io) return;
  io.to(`agents:${userId}`).emit("inbox:handoff_request", { conversationId, reason });
  io.to(`user:${userId}`).emit("inbox:handoff_request", { conversationId, reason });
}
