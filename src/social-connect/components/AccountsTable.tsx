import { useState, useMemo } from "react";
import { Search, RefreshCw, X, User } from "lucide-react";
import { Button } from "../../client/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../client/components/ui/avatar";
import { cn } from "../../client/utils";
import { PLATFORMS, type PlatformKey } from "../platforms";

import facebookIcon from "../icons/facebook.svg";
import instagramIcon from "../icons/instagram.svg";
import linkedinIcon from "../icons/linkedin.svg";
import xIcon from "../icons/x.svg";
import tiktokIcon from "../icons/tiktok.svg";
import youtubeIcon from "../icons/youtube.svg";
import youtubeShortsIcon from "../icons/youtube-shorts.svg";

const PLATFORM_ICON_MAP: Record<PlatformKey, string> = {
  facebook: facebookIcon,
  instagram: instagramIcon,
  linkedin: linkedinIcon,
  x: xIcon,
  tiktok: tiktokIcon,
  youtube: youtubeIcon,
  youtube_shorts: youtubeShortsIcon,
};

interface Account {
  id: string;
  platform: string;
  platformUserId: string;
  platformUsername: string | null;
  displayName: string | null;
  profileImageUrl: string | null;
  useSystemApp: boolean;
  isActive: boolean;
  createdAt: Date;
}

interface AccountsTableProps {
  accounts: Account[];
  onDisconnect: (accountId: string) => void;
  onReconnect: (platform: PlatformKey, useSystemApp: boolean) => void;
}

export default function AccountsTable({
  accounts,
  onDisconnect,
  onReconnect,
}: AccountsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return accounts;
    const q = searchQuery.toLowerCase();
    return accounts.filter((account) => {
      const name = (account.displayName ?? "").toLowerCase();
      const username = (account.platformUsername ?? "").toLowerCase();
      const platformName = getPlatformName(account.platform).toLowerCase();
      return name.includes(q) || username.includes(q) || platformName.includes(q);
    });
  }, [accounts, searchQuery]);

  function handleDisconnect(accountId: string) {
    if (confirmingId !== accountId) {
      setConfirmingId(accountId);
      return;
    }
    onDisconnect(accountId);
    setConfirmingId(null);
  }

  function handleReconnect(account: Account) {
    onReconnect(account.platform as PlatformKey, account.useSystemApp);
  }

  if (accounts.length === 0) return null;

  return (
    <section>
      <h2 className="mb-7 text-2xl font-semibold">Manage Accounts</h2>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search accounts..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setConfirmingId(null);
          }}
          className="h-[52px] w-full rounded-full border-none bg-foreground/5 pl-12 pr-5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:bg-foreground/10 focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-5 py-3.5 text-left font-medium text-muted-foreground">
                Name / Username
              </th>
              <th className="px-5 py-3.5 text-left font-medium text-muted-foreground">
                Connected
              </th>
              <th className="px-5 py-3.5 text-left font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-5 py-3.5 text-left font-medium text-muted-foreground">
                Platform
              </th>
              <th className="px-5 py-3.5 text-right font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-10 text-center text-muted-foreground"
                >
                  No accounts match your search.
                </td>
              </tr>
            ) : (
              filteredAccounts.map((account) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  isConfirming={confirmingId === account.id}
                  onDisconnect={() => handleDisconnect(account.id)}
                  onReconnect={() => handleReconnect(account)}
                  onBlurDisconnect={() => {
                    if (confirmingId === account.id) setConfirmingId(null);
                  }}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Account row                                                        */
/* ------------------------------------------------------------------ */

interface AccountRowProps {
  account: Account;
  isConfirming: boolean;
  onDisconnect: () => void;
  onReconnect: () => void;
  onBlurDisconnect: () => void;
}

function AccountRow({
  account,
  isConfirming,
  onDisconnect,
  onReconnect,
  onBlurDisconnect,
}: AccountRowProps) {
  const platformKey = account.platform as PlatformKey;
  const platformName = getPlatformName(account.platform);
  const platformIcon = PLATFORM_ICON_MAP[platformKey];
  const initials = getInitials(account.displayName ?? account.platformUsername);

  return (
    <tr className="border-b last:border-b-0 transition-colors hover:bg-muted/30">
      {/* Name / Username */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            {account.profileImageUrl ? (
              <AvatarImage
                src={account.profileImageUrl}
                alt={account.displayName ?? "Profile"}
              />
            ) : null}
            <AvatarFallback className="text-xs">
              {initials || <User className="h-3.5 w-3.5" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium leading-tight">
              {account.displayName || account.platformUsername || "Connected account"}
            </p>
            {account.platformUsername && account.displayName && (
              <p className="truncate text-xs text-muted-foreground leading-tight mt-0.5">
                @{account.platformUsername}
              </p>
            )}
            {!account.displayName && !account.platformUsername && (
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                {platformName}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Connected date */}
      <td className="px-5 py-4 text-muted-foreground">
        {formatDate(account.createdAt)}
      </td>

      {/* Status */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-block h-[9px] w-[9px] shrink-0 rounded-full",
              account.isActive ? "bg-green-500" : "bg-muted-foreground/40"
            )}
          />
          <span className={account.isActive ? "text-foreground" : "text-muted-foreground"}>
            {account.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </td>

      {/* Platform icon */}
      <td className="px-5 py-4">
        {platformIcon ? (
          <img
            src={platformIcon}
            alt={platformName}
            className="h-5 w-5"
            title={platformName}
          />
        ) : (
          <span className="text-muted-foreground">{platformName}</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-green-600 hover:text-green-700 hover:bg-green-500/10"
            onClick={onReconnect}
            title="Reconnect"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9",
              isConfirming
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "text-destructive hover:text-destructive hover:bg-destructive/10"
            )}
            onClick={onDisconnect}
            onBlur={onBlurDisconnect}
            title={isConfirming ? "Click again to confirm" : "Disconnect"}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getPlatformName(platform: string): string {
  const config = PLATFORMS[platform as PlatformKey];
  return config?.name ?? platform;
}

function getInitials(name: string | null): string {
  if (!name) return "";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
