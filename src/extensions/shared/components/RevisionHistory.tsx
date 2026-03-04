import { RotateCcw, Clock } from "lucide-react";
import { Button } from "../../../client/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../client/components/ui/accordion";

export interface PostRevision {
  id: string;
  action: string;
  notes: string | null;
  userName: string | null;
  createdAt: string;
  snapshot: Record<string, unknown> | null;
}

interface RevisionHistoryProps {
  revisions: PostRevision[];
  onRestore: (revisionId: string) => void;
}

const ACTION_STYLES: Record<string, { bg: string; text: string }> = {
  created: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
  },
  approved: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  rejected: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
  },
  reworked: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-400",
  },
  scheduled: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
  },
  published: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  moved: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
  },
  restored: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-400",
  },
  failed: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
  },
};

function getActionStyle(action: string): { bg: string; text: string } {
  return (
    ACTION_STYLES[action] || {
      bg: "bg-slate-100 dark:bg-slate-800",
      text: "text-slate-700 dark:text-slate-300",
    }
  );
}

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RevisionHistory({
  revisions,
  onRestore,
}: RevisionHistoryProps) {
  if (revisions.length === 0) {
    return (
      <div className="text-muted-foreground py-4 text-center text-sm">
        No revision history available.
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="revisions" className="border-none">
        <AccordionTrigger className="text-sm font-medium hover:no-underline">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Revision History ({revisions.length})
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="relative ml-3 border-l-2 border-muted pl-6">
            {revisions.map((revision, index) => {
              const style = getActionStyle(revision.action);
              const isLatest = index === 0;

              return (
                <div key={revision.id} className="relative mb-4 last:mb-0">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-background ${style.bg}`}
                  />

                  <div className="rounded-lg border bg-card p-3">
                    {/* Top row: action badge + timestamp */}
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${style.bg} ${style.text}`}
                        >
                          {revision.action}
                        </span>
                        {revision.userName && (
                          <span className="text-muted-foreground text-xs">
                            by {revision.userName}
                          </span>
                        )}
                      </div>
                      <span className="text-muted-foreground text-[10px]">
                        {formatTimestamp(revision.createdAt)}
                      </span>
                    </div>

                    {/* Notes */}
                    {revision.notes && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {revision.notes}
                      </p>
                    )}

                    {/* Restore button (not on the latest revision) */}
                    {!isLatest && (
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => onRestore(revision.id)}
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          Restore
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
