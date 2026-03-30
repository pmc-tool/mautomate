import { useState } from "react";
import { Mail, Phone, Globe, Tag, Plus, X, StickyNote, Hash, Calendar, Clock, Shield } from "lucide-react";
import { useAction } from "wasp/client/operations";
import {
  addContactTag,
  removeContactTag,
  addInboxNote,
} from "wasp/client/operations";
import { Button } from "../../../../client/components/ui/button";
import { Input } from "../../../../client/components/ui/input";
import { Textarea } from "../../../../client/components/ui/textarea";
import { ChannelIcon } from "../shared/ChannelIcon";
import { cn } from "../../../../client/utils";

interface ContactDetailPanelProps {
  conversation: any;
  onRefresh: () => void;
}

export function ContactDetailPanel({ conversation, onRefresh }: ContactDetailPanelProps) {
  const [newTag, setNewTag] = useState("");
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "notes">("details");

  const addTagAction = useAction(addContactTag);
  const removeTagAction = useAction(removeContactTag);
  const addNoteAction = useAction(addInboxNote);

  if (!conversation) return null;

  const contact = conversation.contact;
  const tags = Array.isArray(contact?.tags) ? (contact.tags as string[]) : [];
  const notes = conversation.notes || [];
  const contactName = contact?.name || contact?.email || contact?.channelUserId || "Unknown";

  const handleAddTag = async () => {
    if (!newTag.trim() || !contact?.id) return;
    try {
      await addTagAction({ contactId: contact.id, tag: newTag.trim() });
      setNewTag("");
      onRefresh();
    } catch (err) {
      console.error("Add tag failed:", err);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!contact?.id) return;
    try {
      await removeTagAction({ contactId: contact.id, tag });
      onRefresh();
    } catch (err) {
      console.error("Remove tag failed:", err);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsAddingNote(true);
    try {
      await addNoteAction({ conversationId: conversation.id, content: newNote.trim() });
      setNewNote("");
      onRefresh();
    } catch (err) {
      console.error("Add note failed:", err);
    } finally {
      setIsAddingNote(false);
    }
  };

  function formatTimeAgo(dateStr: string | Date): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - date.getTime());
    const diffDay = Math.floor(diffMs / 86400000);
    if (diffDay === 0) return "Today";
    if (diffDay === 1) return "Yesterday";
    if (diffDay < 7) return `${diffDay} Days Ago`;
    if (diffDay < 30) return `${Math.floor(diffDay / 7)} Weeks Ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div className="flex h-full w-[300px] flex-col border-l flex-shrink-0 bg-white dark:bg-slate-900">
      {/* Tabs */}
      <div className="flex border-b">
        <button
          className={cn(
            "flex-1 py-3 text-[13px] font-medium transition-colors border-b-2",
            activeTab === "details"
              ? "text-foreground border-primary"
              : "text-muted-foreground border-transparent hover:text-foreground"
          )}
          onClick={() => setActiveTab("details")}
        >
          Details
        </button>
        <button
          className={cn(
            "flex-1 py-3 text-[13px] font-medium transition-colors border-b-2 relative",
            activeTab === "notes"
              ? "text-foreground border-primary"
              : "text-muted-foreground border-transparent hover:text-foreground"
          )}
          onClick={() => setActiveTab("notes")}
        >
          Notes
          {notes.length > 0 && (
            <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/10 px-1 text-[9px] font-bold text-primary">
              {notes.length}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "details" ? (
          <>
            {/* Contact header card */}
            <div className="px-5 pt-6 pb-5 text-center border-b bg-slate-50/50 dark:bg-slate-800/30">
              <div className="bg-gradient-to-br from-slate-600 to-slate-800 text-white mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl font-semibold shadow-lg">
                {contactName.charAt(0).toUpperCase()}
              </div>
              <h3 className="mt-3 font-semibold text-base">{contactName}</h3>
              <div className="flex items-center justify-center gap-2 mt-1.5">
                <span className="text-muted-foreground text-xs capitalize">Channel</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="flex items-center gap-1 text-xs font-medium">
                  <ChannelIcon channel={conversation.channel} size={12} />
                  <span className="capitalize">{conversation.channel}</span>
                </span>
              </div>
              {contact?.channelUserId && (
                <p className="mt-1.5 text-[11px] text-primary font-mono">
                  @ {contact.channelUserId}
                </p>
              )}
            </div>

            {/* Info table */}
            <div className="px-5 py-4 border-b">
              <h4 className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider mb-3">
                Details
              </h4>
              <div className="space-y-0">
                {contact?.email && (
                  <DetailRow icon={Mail} label="Email" value={contact.email} />
                )}
                {contact?.phone && (
                  <DetailRow icon={Phone} label="Phone" value={contact.phone} />
                )}
                <DetailRow
                  icon={Shield}
                  label="Status"
                  value={<span className="capitalize font-medium">{conversation.status}</span>}
                />
                <DetailRow
                  icon={Calendar}
                  label="Created"
                  value={formatTimeAgo(conversation.createdAt)}
                />
                {conversation.updatedAt && conversation.updatedAt !== conversation.createdAt && (
                  <DetailRow
                    icon={Clock}
                    label="Updated"
                    value={formatTimeAgo(conversation.updatedAt)}
                  />
                )}
                {contact?.lastSeenAt && (
                  <DetailRow
                    icon={Globe}
                    label="Last Seen"
                    value={formatTimeAgo(contact.lastSeenAt)}
                  />
                )}
                {contact?.ipAddress && (
                  <DetailRow icon={Hash} label="IP Address" value={contact.ipAddress} />
                )}
              </div>

              {conversation.handoffReason && (
                <div className="mt-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 p-3">
                  <p className="text-[11px] font-medium text-orange-700 dark:text-orange-300 mb-0.5">Handoff Reason</p>
                  <p className="text-[12px] text-orange-600 dark:text-orange-400">
                    {conversation.handoffReason}
                  </p>
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="px-5 py-4">
              <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground tracking-wider mb-3">
                <Tag size={11} /> Tags
              </h4>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-foreground/80"
                    >
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="hover:text-destructive ml-0.5 opacity-50 hover:opacity-100 transition-opacity">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-1.5">
                <Input
                  placeholder="Add tag..."
                  className="h-7 text-[11px] px-2.5 rounded-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0 rounded-full"
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                >
                  <Plus size={12} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Notes tab */
          <div className="p-5">
            {notes.length > 0 && (
              <div className="space-y-3 mb-4">
                {notes.map((note: any) => (
                  <div key={note.id} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/60 rounded-xl p-3">
                    <p className="text-[12px] leading-relaxed">{note.content}</p>
                    <p className="text-muted-foreground mt-2 text-[10px]">
                      {new Date(note.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <Textarea
              placeholder="Add an internal note..."
              className="text-[12px] min-h-[80px] resize-none rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <Button
              variant="default"
              size="sm"
              className="w-full h-8 text-xs mt-2 rounded-lg"
              onClick={handleAddNote}
              disabled={!newNote.trim() || isAddingNote}
            >
              <StickyNote size={12} className="mr-1.5" />
              Add Note
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
        <Icon size={13} className="text-muted-foreground/60" />
        {label}
      </span>
      <span className="text-[12px] text-right truncate max-w-[140px]">{value}</span>
    </div>
  );
}
