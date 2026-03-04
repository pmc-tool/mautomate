interface DashboardFilterBarProps {
  dateRange: "7d" | "30d" | "90d";
  postType: "all" | "social" | "seo";
  platform: string;
  platforms: string[];
  onDateRangeChange: (v: "7d" | "30d" | "90d") => void;
  onPostTypeChange: (v: "all" | "social" | "seo") => void;
  onPlatformChange: (v: string) => void;
}

const dateOptions: { label: string; value: "7d" | "30d" | "90d" }[] = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
];

const typeOptions: { label: string; value: "all" | "social" | "seo" }[] = [
  { label: "All", value: "all" },
  { label: "Social", value: "social" },
  { label: "SEO", value: "seo" },
];

function ButtonGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="border-border inline-flex rounded-lg border">
      {options.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
            value === opt.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          } ${i === 0 ? "rounded-l-md" : ""} ${i === options.length - 1 ? "rounded-r-md" : ""}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function DashboardFilterBar({
  dateRange,
  postType,
  platform,
  platforms,
  onDateRangeChange,
  onPostTypeChange,
  onPlatformChange,
}: DashboardFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ButtonGroup options={dateOptions} value={dateRange} onChange={onDateRangeChange} />
      <ButtonGroup options={typeOptions} value={postType} onChange={onPostTypeChange} />
      <select
        value={platform}
        onChange={(e) => onPlatformChange(e.target.value)}
        className="border-border bg-background text-foreground rounded-lg border px-3 py-1.5 text-sm"
      >
        <option value="">All Platforms</option>
        {platforms.map((p) => (
          <option key={p} value={p}>
            {p.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </option>
        ))}
      </select>
    </div>
  );
}
