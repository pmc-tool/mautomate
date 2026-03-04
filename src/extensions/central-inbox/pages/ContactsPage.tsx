import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery, useAction } from "wasp/client/operations";
import { getInboxContacts, updateInboxContact } from "wasp/client/operations";
import { ArrowLeft, Search, Mail, Phone, Globe, Tag, MessageSquare } from "lucide-react";
import { Link } from "react-router";
import UserDashboardLayout from "../../../user-dashboard/layout/UserDashboardLayout";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Card, CardContent } from "../../../client/components/ui/card";
import { Badge } from "../../../client/components/ui/badge";
import { ScrollArea } from "../../../client/components/ui/scroll-area";
import { Skeleton } from "../../../client/components/ui/skeleton";
import { ChannelIcon } from "../components/shared/ChannelIcon";

export default function ContactsPage({ user }: { user: AuthUser }) {
  const [search, setSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<any>(null);

  const { data: contactsData, isLoading } = useQuery(getInboxContacts, {
    search: search || undefined,
  });

  const contacts = contactsData?.contacts || [];

  return (
    <UserDashboardLayout user={user}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/inbox">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Inbox Contacts</h1>
          <span className="text-muted-foreground text-sm">({contacts.length})</span>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search size={16} className="text-muted-foreground absolute left-3 top-3" />
          <Input
            placeholder="Search contacts..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Contact list */}
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No contacts yet</p>
            <p className="text-sm">Contacts are created automatically when someone messages you.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {contacts.map((contact: any) => {
              const name = contact.name || contact.email || contact.channelUserId || "Unknown";
              const tags = Array.isArray(contact.tags) ? (contact.tags as string[]) : [];
              const convCount = contact.conversations?.length || 0;

              return (
                <Card key={contact.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium flex-shrink-0">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{name}</span>
                          {contact.channel && <ChannelIcon channel={contact.channel} size={14} />}
                        </div>

                        {contact.email && (
                          <div className="flex items-center gap-1.5 mt-1 text-muted-foreground text-xs">
                            <Mail size={12} />
                            <span className="truncate">{contact.email}</span>
                          </div>
                        )}

                        {contact.phone && (
                          <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground text-xs">
                            <Phone size={12} />
                            <span>{contact.phone}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 mt-1 text-muted-foreground text-xs">
                          <MessageSquare size={12} />
                          <span>{convCount} conversation{convCount !== 1 ? "s" : ""}</span>
                        </div>

                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-[10px]">
                                {tag}
                              </Badge>
                            ))}
                            {tags.length > 3 && (
                              <Badge variant="outline" className="text-[10px]">
                                +{tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        {contact.lastSeenAt && (
                          <p className="text-muted-foreground text-[10px] mt-1.5">
                            Last seen {new Date(contact.lastSeenAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </UserDashboardLayout>
  );
}
