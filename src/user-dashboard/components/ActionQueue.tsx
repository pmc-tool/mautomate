import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../client/components/ui/card";

interface ActionItem {
  type: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  count: number;
  link: string;
}

const severityConfig = {
  high: { label: "HIGH", bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400" },
  medium: { label: "MED", bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400" },
  low: { label: "LOW", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400" },
};

export default function ActionQueue({ items }: { items: ActionItem[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Action Queue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            All clear! No actions needed.
          </p>
        ) : (
          items.slice(0, 6).map((item) => {
            const config = severityConfig[item.severity];
            return (
              <div
                key={item.type}
                className="border-border flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`${config.bg} ${config.text} shrink-0 rounded px-2 py-0.5 text-xs font-bold`}
                  >
                    {config.label}
                  </span>
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-medium">{item.title}</p>
                    <p className="text-muted-foreground truncate text-xs">{item.description}</p>
                  </div>
                </div>
                <Link
                  to={item.link}
                  className="text-primary hover:text-primary/80 shrink-0"
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
