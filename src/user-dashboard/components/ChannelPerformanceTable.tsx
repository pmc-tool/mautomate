import {
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Globe,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../client/components/ui/card";

interface ChannelData {
  channel: string;
  postType: "social" | "seo";
  total: number;
  published: number;
  scheduled: number;
  failed: number;
  avgSeoScore: number | null;
  publishRate: number;
}

const channelIcons: Record<string, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  x: Twitter,
};

function getChannelIcon(channel: string, postType: string): LucideIcon {
  if (postType === "social" && channelIcons[channel]) {
    return channelIcons[channel];
  }
  if (postType === "seo") return FileText;
  return Globe;
}

function formatChannelName(channel: string): string {
  return channel.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function rateColor(rate: number): string {
  if (rate >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (rate >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

export default function ChannelPerformanceTable({ channels }: { channels: ChannelData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Channel Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {channels.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No posts yet. Create your first post to see channel metrics.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-muted/50 border-border border-b">
                  <th className="px-4 py-3 font-medium">Channel</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium text-right">Posts</th>
                  <th className="px-4 py-3 font-medium text-right">Published</th>
                  <th className="px-4 py-3 font-medium text-right">Scheduled</th>
                  <th className="px-4 py-3 font-medium text-right">Failed</th>
                  <th className="px-4 py-3 font-medium text-right">SEO Score</th>
                  <th className="px-4 py-3 font-medium text-right">Publish Rate</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((ch) => {
                  const Icon = getChannelIcon(ch.channel, ch.postType);
                  return (
                    <tr key={`${ch.postType}:${ch.channel}`} className="border-border border-b last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className="text-muted-foreground h-4 w-4" />
                          <span>{formatChannelName(ch.channel)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            ch.postType === "social"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                          }`}
                        >
                          {ch.postType === "social" ? "Social" : "SEO"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{ch.total}</td>
                      <td className="px-4 py-3 text-right">{ch.published}</td>
                      <td className="px-4 py-3 text-right">{ch.scheduled}</td>
                      <td className="px-4 py-3 text-right">
                        {ch.failed > 0 ? (
                          <span className="text-red-600 dark:text-red-400">{ch.failed}</span>
                        ) : (
                          ch.failed
                        )}
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-right">
                        {ch.avgSeoScore != null ? ch.avgSeoScore : "\u2014"}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${rateColor(ch.publishRate)}`}>
                        {ch.publishRate}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
