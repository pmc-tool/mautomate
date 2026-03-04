import { Search, Filter, X } from "lucide-react";
import { Input } from "../../../client/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../client/components/ui/select";
import { Button } from "../../../client/components/ui/button";

interface FilterBarProps {
  postType: string;
  onPostTypeChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  platform: string;
  onPlatformChange: (v: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  onClearFilters: () => void;
}

export function FilterBar({
  postType,
  onPostTypeChange,
  status,
  onStatusChange,
  platform,
  onPlatformChange,
  search,
  onSearchChange,
  onClearFilters,
}: FilterBarProps) {
  const hasActiveFilters =
    postType !== "all" ||
    status !== "all" ||
    platform !== "all" ||
    search.trim() !== "";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
      {/* Search input */}
      <div className="relative min-w-[200px] flex-1">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search posts..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Post type select */}
      <Select value={postType} onValueChange={onPostTypeChange}>
        <SelectTrigger className="w-[140px]">
          <Filter className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Post Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="social">Social</SelectItem>
          <SelectItem value="seo">SEO</SelectItem>
        </SelectContent>
      </Select>

      {/* Status select */}
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="scheduled">Scheduled</SelectItem>
          <SelectItem value="published">Published</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
        </SelectContent>
      </Select>

      {/* Platform select */}
      <Select value={platform} onValueChange={onPlatformChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Platform" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Platforms</SelectItem>
          <SelectItem value="facebook">Facebook</SelectItem>
          <SelectItem value="instagram">Instagram</SelectItem>
          <SelectItem value="linkedin">LinkedIn</SelectItem>
          <SelectItem value="x">X</SelectItem>
          <SelectItem value="blog">Blog</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          <X className="mr-1 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
