import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { getAuditLogs, useQuery } from "wasp/client/operations";
import { ClipboardList, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import Breadcrumb from "../../layout/Breadcrumb";
import DefaultLayout from "../../layout/DefaultLayout";
import { Badge } from "../../../client/components/ui/badge";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../client/components/ui/select";

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ACTION_CATEGORIES = [
  { value: "all", label: "All Actions" },
  { value: "setting.", label: "Settings" },
  { value: "extension.", label: "Extensions" },
  { value: "post.", label: "Posts" },
  { value: "user.", label: "Users" },
  { value: "branding.", label: "Branding" },
];

function actionBadgeColor(action: string): string {
  if (action.startsWith("setting.")) return "bg-blue-500/10 text-blue-500";
  if (action.startsWith("extension.")) return "bg-purple-500/10 text-purple-500";
  if (action.startsWith("post.")) return "bg-green-500/10 text-green-500";
  if (action.startsWith("user.")) return "bg-amber-500/10 text-amber-500";
  if (action.startsWith("branding.")) return "bg-pink-500/10 text-pink-500";
  return "bg-muted text-muted-foreground";
}

export default function AdminActivityPage({ user }: { user: AuthUser }) {
  const [actionFilter, setActionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("");
  const [cursors, setCursors] = useState<string[]>([]);
  const page = cursors.length;

  const currentCursor = cursors.length > 0 ? cursors[cursors.length - 1] : undefined;

  const { data, isLoading } = useQuery(getAuditLogs, {
    action: actionFilter === "all" ? undefined : actionFilter,
    userId: userFilter || undefined,
    cursor: currentCursor,
    limit: 50,
  });

  const items = data?.items ?? [];
  const nextCursor = data?.nextCursor;

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName="Activity Log" />

      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Filter size={16} className="text-muted-foreground" />
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setCursors([]); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Filter by user ID..."
            value={userFilter}
            onChange={(e) => { setUserFilter(e.target.value); setCursors([]); }}
            className="w-64"
          />
        </div>

        {/* Table */}
        <div className="bg-card border-border overflow-hidden rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b">
                  <th className="text-muted-foreground px-4 py-3 text-left font-medium">Time</th>
                  <th className="text-muted-foreground px-4 py-3 text-left font-medium">Action</th>
                  <th className="text-muted-foreground px-4 py-3 text-left font-medium">User</th>
                  <th className="text-muted-foreground px-4 py-3 text-left font-medium">Resource</th>
                  <th className="text-muted-foreground px-4 py-3 text-left font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-muted-foreground px-4 py-8 text-center">
                      Loading...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-muted-foreground px-4 py-8 text-center">
                      <ClipboardList size={32} className="mx-auto mb-2 opacity-50" />
                      No activity logs found.
                    </td>
                  </tr>
                ) : (
                  items.map((log: any) => (
                    <tr key={log.id} className="border-border hover:bg-muted/50 border-b transition-colors">
                      <td className="text-muted-foreground whitespace-nowrap px-4 py-3 text-xs">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={actionBadgeColor(log.action)}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-xs">
                        {log.userEmail || log.userId || "-"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {log.resource || "-"}
                      </td>
                      <td className="text-muted-foreground max-w-xs truncate px-4 py-3 text-xs">
                        {log.detail || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="border-border flex items-center justify-between border-t px-4 py-3">
            <span className="text-muted-foreground text-xs">
              Page {page + 1}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setCursors((prev) => prev.slice(0, -1))}
              >
                <ChevronLeft size={14} />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!nextCursor}
                onClick={() => {
                  if (nextCursor) setCursors((prev) => [...prev, nextCursor]);
                }}
              >
                Next
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}
