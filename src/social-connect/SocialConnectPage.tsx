import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  getSocialAccounts,
  getSocialAppCredentials,
  getSystemSocialApps,
  initiateSocialOAuth,
  disconnectSocialAccount,
} from "wasp/client/operations";
import UserDashboardLayout from "../user-dashboard/layout/UserDashboardLayout";
import { toast } from "../client/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "../client/components/ui/alert";
import { Card } from "../client/components/ui/card";
import { Button } from "../client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../client/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../client/components/ui/dropdown-menu";
import { Loader2, AlertCircle, Plus, ChevronDown, Globe, Key, Settings2 } from "lucide-react";
import { PLATFORMS, PLATFORM_KEYS, type PlatformKey } from "./platforms";
import PlatformCard from "./components/PlatformCard";
import AccountsTable from "./components/AccountsTable";
import CredentialDialog from "./components/CredentialDialog";

import facebookIcon from "./icons/facebook.svg";
import instagramIcon from "./icons/instagram.svg";
import linkedinIcon from "./icons/linkedin.svg";
import xIcon from "./icons/x.svg";
import tiktokIcon from "./icons/tiktok.svg";
import youtubeIcon from "./icons/youtube.svg";
import youtubeShortsIcon from "./icons/youtube-shorts.svg";

const PLATFORM_ICON_MAP: Record<PlatformKey, string> = {
  facebook: facebookIcon,
  instagram: instagramIcon,
  linkedin: linkedinIcon,
  x: xIcon,
  tiktok: tiktokIcon,
  youtube: youtubeIcon,
  youtube_shorts: youtubeShortsIcon,
};

export default function SocialConnectPage({ user }: { user: AuthUser }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [credentialPlatform, setCredentialPlatform] =
    useState<PlatformKey | null>(null);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(
    null
  );
  // Platform pending connection method choice (shown in chooser dialog)
  const [chooserPlatform, setChooserPlatform] = useState<PlatformKey | null>(null);

  // ----------------------------------------------------------------
  // Queries
  // ----------------------------------------------------------------
  const {
    data: accounts,
    isLoading: accountsLoading,
    error: accountsError,
  } = useQuery(getSocialAccounts);

  const {
    data: credentials,
    isLoading: credentialsLoading,
    error: credentialsError,
  } = useQuery(getSocialAppCredentials);

  const {
    data: systemApps,
    isLoading: systemAppsLoading,
    error: systemAppsError,
  } = useQuery(getSystemSocialApps);

  const isLoading = accountsLoading || credentialsLoading || systemAppsLoading;
  const loadError = accountsError || credentialsError || systemAppsError;

  // ----------------------------------------------------------------
  // URL param feedback (OAuth callback result)
  // ----------------------------------------------------------------
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success) {
      toast({
        title: "Account connected",
        description: `Your ${success} account has been connected successfully.`,
      });
      setSearchParams({}, { replace: true });
    } else if (error) {
      toast({
        title: "Connection failed",
        description: decodeURIComponent(error),
        variant: "destructive",
      });
      setSearchParams({}, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount

  // ----------------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------------
  const handleConnect = useCallback(
    async (platform: PlatformKey, useSystemApp: boolean) => {
      setConnectingPlatform(platform);
      try {
        const result = await initiateSocialOAuth({ platform, useSystemApp });
        if (result?.authUrl) {
          window.location.href = result.authUrl;
        }
      } catch (err: any) {
        toast({
          title: "Connection error",
          description:
            err?.message ?? "Failed to start OAuth flow. Please try again.",
          variant: "destructive",
        });
        setConnectingPlatform(null);
      }
    },
    []
  );

  const handleDisconnect = useCallback(async (accountId: string) => {
    try {
      await disconnectSocialAccount({ id: accountId });
      toast({
        title: "Account disconnected",
        description: "The social account has been disconnected.",
      });
    } catch (err: any) {
      toast({
        title: "Disconnect failed",
        description:
          err?.message ?? "Failed to disconnect the account. Please try again.",
        variant: "destructive",
      });
    }
  }, []);

  const handleConfigureCustom = useCallback((platform: PlatformKey) => {
    setCredentialPlatform(platform);
  }, []);

  const handleReconnect = useCallback(
    (platform: PlatformKey, useSystemApp: boolean) => {
      handleConnect(platform, useSystemApp);
    },
    [handleConnect]
  );

  /**
   * Handles a platform selection from the banner dropdown.
   * If system app is available, shows a chooser so user can pick
   * between mAutomate API or their own keys.
   */
  const handleDropdownConnect = useCallback(
    (platform: PlatformKey) => {
      if (isSystemAppAvailable(platform)) {
        setChooserPlatform(platform);
      } else if (hasCustomCredential(platform)) {
        handleConnect(platform, false);
      } else {
        handleConfigureCustom(platform);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [systemApps, credentials, handleConnect, handleConfigureCustom]
  );

  // ----------------------------------------------------------------
  // Derived data helpers
  // ----------------------------------------------------------------
  function hasCustomCredential(platform: PlatformKey): boolean {
    if (!credentials) return false;
    return credentials.some((c: any) => c.platform === platform);
  }

  function isSystemAppAvailable(platform: PlatformKey): boolean {
    if (!systemApps) return false;
    return !!(systemApps as Record<string, any>)[platform]?.enabled;
  }

  function getExistingCredential(platform: PlatformKey) {
    if (!credentials) return null;
    const cred = credentials.find((c: any) => c.platform === platform);
    return cred
      ? { clientId: cred.clientId, redirectUri: cred.redirectUri }
      : null;
  }

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  return (
    <UserDashboardLayout user={user}>
      <div className="space-y-10">
        {/* Redirect overlay */}
        {connectingPlatform && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertTitle>Redirecting...</AlertTitle>
            <AlertDescription>
              You are being redirected to authenticate. Please wait.
            </AlertDescription>
          </Alert>
        )}

        {/* Error state */}
        {loadError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load data</AlertTitle>
            <AlertDescription>
              {(loadError as any)?.message ??
                "Could not load your social connect data. Please refresh and try again."}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading state */}
        {isLoading && !loadError && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Main content */}
        {!isLoading && !loadError && (
          <>
            {/* ======================================================= */}
            {/* Section 1: Banner Card                                   */}
            {/* ======================================================= */}
            <Card className="overflow-hidden border-none bg-primary/5 shadow-sm">
              <div className="flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
                {/* Left: text + CTA */}
                <div className="max-w-lg space-y-3">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Add New Account
                  </h2>
                  <p className="text-muted-foreground">
                    Connect your social media accounts to publish and schedule
                    content across all your platforms from one place.
                  </p>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="mt-2 gap-2">
                        <Plus className="h-4 w-4" />
                        Link a social account
                        <ChevronDown className="h-4 w-4 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      {PLATFORM_KEYS.map((key) => (
                        <DropdownMenuItem
                          key={key}
                          className="cursor-pointer gap-3 py-2.5"
                          onClick={() => handleDropdownConnect(key)}
                        >
                          <img
                            src={PLATFORM_ICON_MAP[key]}
                            alt={PLATFORMS[key].name}
                            className="h-5 w-5"
                          />
                          {PLATFORMS[key].name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Right: decorative placeholder (kept minimal) */}
                <div className="hidden sm:block" aria-hidden>
                  <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-primary/10">
                    <Plus className="h-10 w-10 text-primary/40" />
                  </div>
                </div>
              </div>
            </Card>

            {/* ======================================================= */}
            {/* Section 2: Platform Cards Grid                           */}
            {/* ======================================================= */}
            <section>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {PLATFORM_KEYS.map((platform) => (
                  <PlatformCard
                    key={platform}
                    platform={platform}
                    systemAppAvailable={isSystemAppAvailable(platform)}
                    hasCustomCredential={hasCustomCredential(platform)}
                    onConnect={handleConnect}
                    onConfigureCustom={handleConfigureCustom}
                  />
                ))}
              </div>
            </section>

            {/* ======================================================= */}
            {/* Section 3: Manage Accounts Table                         */}
            {/* ======================================================= */}
            {accounts && accounts.length > 0 && (
              <AccountsTable
                accounts={accounts as any}
                onDisconnect={handleDisconnect}
                onReconnect={handleReconnect}
                onEditCredentials={handleConfigureCustom}
              />
            )}
          </>
        )}

        {/* Connection method chooser dialog */}
        <Dialog
          open={chooserPlatform !== null}
          onOpenChange={(open) => { if (!open) setChooserPlatform(null); }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>
                Connect {chooserPlatform ? PLATFORMS[chooserPlatform].name : ""}
              </DialogTitle>
              <DialogDescription>
                Choose how you want to connect your account.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <button
                className="flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted"
                onClick={() => {
                  if (chooserPlatform) handleConnect(chooserPlatform, true);
                  setChooserPlatform(null);
                }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Use mAutomate API</p>
                  <p className="text-sm text-muted-foreground">
                    Quick connect — no setup needed
                  </p>
                </div>
              </button>

              <button
                className="flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted"
                onClick={() => {
                  const p = chooserPlatform;
                  setChooserPlatform(null);
                  if (!p) return;
                  if (hasCustomCredential(p)) {
                    handleConnect(p, false);
                  } else {
                    handleConfigureCustom(p);
                  }
                }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                  <Key className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-semibold">Use My Own API Keys</p>
                  <p className="text-sm text-muted-foreground">
                    {chooserPlatform && hasCustomCredential(chooserPlatform)
                      ? "Connect with your saved credentials"
                      : "Set up your own app credentials"}
                  </p>
                </div>
              </button>

              {chooserPlatform && hasCustomCredential(chooserPlatform) && (
                <button
                  className="flex w-full items-center gap-4 rounded-lg border border-dashed p-4 text-left transition-colors hover:bg-muted"
                  onClick={() => {
                    const p = chooserPlatform;
                    setChooserPlatform(null);
                    if (p) handleConfigureCustom(p);
                  }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Settings2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">Edit API Keys</p>
                    <p className="text-sm text-muted-foreground">
                      Update your saved credentials
                    </p>
                  </div>
                </button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Credential dialog -- single shared instance */}
        <CredentialDialog
          open={credentialPlatform !== null}
          onOpenChange={(open) => {
            if (!open) setCredentialPlatform(null);
          }}
          platform={credentialPlatform}
          existingCredential={
            credentialPlatform
              ? getExistingCredential(credentialPlatform)
              : null
          }
        />
      </div>
    </UserDashboardLayout>
  );
}
