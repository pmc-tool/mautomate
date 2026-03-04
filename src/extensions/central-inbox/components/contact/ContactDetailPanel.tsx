import { useState } from "react";
import { Mail, Phone, Globe, Tag, Plus, X, StickyNote, Info, Hash } from "lucide-react";
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

interface ContactDetailPanelProps {
  conversation: any;
  onRefresh: () => void;
}

export function ContactDetailPanel({ conversation, onRefresh }: ContactDetailPanelProps) {
  const [newTag, setNewTag] = useState("");
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

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

  return (
    <div className="flex h-full w-[260px] flex-col border-l flex-shrink-0 bg-background">
      <div className="flex-1 overflow-y-auto">
        {/* Contact header */}
        <div className="px-4 pt-5 pb-4 border-b text-center">
          <div className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary mx-auto flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold">
            {contactName.charAt(0).toUpperCase()}
          </div>
          <h3 className="mt-2 font-semibold text-sm">{contactName}</h3>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <ChannelIcon channel={conversation.channel} size={12} />
            <span className="text-muted-foreground text-[11px] capitalize">{conversation.channel}</span>
          </div>
        </div>

        <div className="p-3 space-y-4">
          {/* Contact info */}
          <Section icon={Info} title="Details">
            <div className="space-y-2">
              {contact?.email && (
                <InfoRow icon={Mail} value={contact.email} />
              )}
              {contact?.phone && (
                <InfoRow icon={Phone} value={contact.phone} />
              )}
              {contact?.channelUserId && (
                <InfoRow icon={Hash} value={contact.channelUserId} muted />
              )}
              {contact?.lastSeenAt && (
                <p className="text-muted-foreground text-[11px] pl-5">
                  Last seen {new Date(contact.lastSeenAt).toLocaleDateString()}
                </p>
              )}
              {!contact?.email && !contact?.phone && !contact?.channelUserId && (
                <p className="text-muted-foreground text-[11px]">No contact details</p>
              )}
            </div>
          </Section>

          {/* Tags */}
          <Section icon={Tag} title="Tags">
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/80"
                  >
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} className="hover:text-destructive ml-0.5">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-1">
              <Input
                placeholder="Add tag..."
                className="h-6 text-[11px] px-2"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={handleAddTag}
                disabled={!newTag.trim()}
              >
                <Plus size={12} />
              </Button>
            </div>
          </Section>

          {/* Conversation info */}
          <Section icon={Info} title="Conversation">
            <div className="space-y-1.5 text-[12px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="capitalize font-medium">{conversation.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Handler</span>
                <span className="capitalize font-medium">
                  {conversation.handlerMode === "ai" ? "AI" : conversation.handlerMode}
                </span>
              </div>
              {conversation.handoffReason && (
                <div className="pt-1">
                  <span className="text-muted-foreground text-[11px]">Handoff reason</span>
                  <p className="text-[11px] mt-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded px-2 py-1">
                    {conversation.handoffReason}
                  </p>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(conversation.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </Section>

          {/* Internal notes */}
          <Section icon={StickyNote} title="Notes">
            {notes.length > 0 && (
              <div className="space-y-2 mb-2">
                {notes.map((note: any) => (
                  <div key={note.id} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200/60 dark:border-yellow-800/60 rounded-lg p-2">
                    <p className="text-[11px] leading-relaxed">{note.content}</p>
                    <p className="text-muted-foreground mt-1 text-[10px]">
                      {new Date(note.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <Textarea
              placeholder="Add a note..."
              className="text-[11px] min-h-[50px] resize-none"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full h-6 text-[11px] mt-1.5"
              onClick={handleAddNote}
              disabled={!newNote.trim() || isAddingNote}
            >
              Add Note
            </Button>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground tracking-wider mb-2">
        <Icon size={11} /> {title}
      </h4>
      {children}
    </div>
  );
}

function InfoRow({ icon: Icon, value, muted }: { icon: any; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={12} className="text-muted-foreground flex-shrink-0" />
      <span className={`truncate text-[12px] ${muted ? "text-muted-foreground" : ""}`}>{value}</span>
    </div>
  );
}
