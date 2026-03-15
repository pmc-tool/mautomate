import { useState, useEffect, useRef } from "react";
import { type AuthUser } from "wasp/auth";
import {
  getSystemUpdateStatus,
  triggerSystemUpdate,
  getUpdateLog,
  useQuery,
} from "wasp/client/operations";
import {
  Download,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Shield,
  ArrowUpCircle,
} from "lucide-react";
import Breadcrumb from "../../layout/Breadcrumb";
import DefaultLayout from "../../layout/DefaultLayout";
import { Badge } from "../../../client/components/ui/badge";
import { Button } from "../../../client/components/ui/button";
import { Card, CardContent } from "../../../client/components/ui/card";
import { toast } from "../../../client/hooks/use-toast";

export default function AdminSystemUpdatePage({ user }: { user: AuthUser }) {
  const { data: status, isLoading, refetch: refetchStatus } = useQuery(getSystemUpdateStatus);
  const [updating, setUpdating] = useState(false);
  const [polling, setPolling] = useState(false);
  const [logContent, setLogContent] = useState("");
  const [updateCompleted, setUpdateCompleted] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start polling logs when update is in progress
  useEffect(() => {
    if ((updating || status?.isUpdateInProgress) && !polling) {
      setPolling(true);
      let consecutiveErrors = 0;
      pollRef.current = setInterval(async () => {
        try {
          const result = await getUpdateLog();
          consecutiveErrors = 0;
          setLogContent(result.log);
          if (result.completed) {
            setUpdateCompleted(true);
            setUpdateSuccess(result.success);
            setUpdating(false);
            setPolling(false);
            if (pollRef.current) clearInterval(pollRef.current);
            refetchStatus();
            if (result.success) {
              toast({ title: "Update completed successfully!" });
            } else {
              toast({ title: "Update failed", description: "Check the log for details", variant: "destructive" });
            }
          }
        } catch {
          consecutiveErrors++;
          if (consecutiveErrors >= 2) {
            setLogContent((prev) =>
              prev.includes("Server restarting") ? prev : prev + "\n\n⏳ Server restarting..."
            );
          }
          // After many consecutive errors, assume update finished and server came back
          if (consecutiveErrors >= 15) {
            setUpdateCompleted(true);
            setUpdateSuccess(true);
            setUpdating(false);
            setPolling(false);
            if (pollRef.current) clearInterval(pollRef.current);
            refetchStatus();
            toast({ title: "Update completed — server restarted" });
          }
        }
      }, 2000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [updating, status?.isUpdateInProgress]);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logContent]);

  const handleUpdate = async () => {
    if (!window.confirm(
      "This will update the system and restart the server. The app will be unavailable for about 30 seconds. Continue?"
    )) return;

    setUpdating(true);
    setUpdateCompleted(false);
    setLogContent("");
    try {
      await triggerSystemUpdate();
      toast({ title: "Update started" });
    } catch (err: any) {
      toast({ title: "Failed to start update", description: err?.message, variant: "destructive" });
      setUpdating(false);
    }
  };

  const isInProgress = updating || status?.isUpdateInProgress;

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName="System Update" />

      {/* Version Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">v{status?.currentVersion ?? "..."}</p>
              <p className="text-sm text-muted-foreground">Installed Version</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
              <ArrowUpCircle className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">v{status?.availableVersion ?? "..."}</p>
              <p className="text-sm text-muted-foreground">Latest Available</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
              {status?.isUpdateAvailable ? (
                <Download className="h-6 w-6 text-amber-500" />
              ) : (
                <CheckCircle className="h-6 w-6 text-green-500" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold">
                {isLoading
                  ? "Checking..."
                  : isInProgress
                    ? "Updating..."
                    : status?.isUpdateAvailable
                      ? "Update Available"
                      : "Up to Date"}
              </p>
              <p className="text-xs text-muted-foreground">
                {status?.updateDate ? `Released ${status.updateDate}` : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Update Panel */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1">
                {isInProgress
                  ? "Update in Progress..."
                  : status?.isUpdateAvailable
                    ? "New Update Available"
                    : "System is Up to Date"}
              </h3>

              {status?.isUpdateAvailable && status.changelog && (
                <div className="mt-3 rounded-lg border bg-muted/50 p-4">
                  <p className="text-sm font-medium mb-1">What's new in v{status.availableVersion}:</p>
                  <p className="text-sm text-muted-foreground">{status.changelog}</p>
                </div>
              )}

              {status?.isUpdateAvailable && !isInProgress && (
                <p className="mt-3 text-sm text-amber-600 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  The server will restart during the update (~30 seconds downtime)
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {status?.isUpdateAvailable && !isInProgress && (
                <Button onClick={handleUpdate} className="gap-2">
                  <Download className="h-4 w-4" />
                  Update Now
                </Button>
              )}

              {!isInProgress && (
                <Button variant="outline" onClick={() => refetchStatus()} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Check for Updates
                </Button>
              )}

              {isInProgress && (
                <Badge className="bg-blue-500 hover:bg-blue-600 gap-1.5 px-3 py-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Updating...
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Update Log */}
      {(logContent || isInProgress) && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Update Log</h3>
              {updateCompleted && (
                <Badge className={updateSuccess ? "bg-green-500" : "bg-red-500"}>
                  {updateSuccess ? "Completed" : "Failed"}
                </Badge>
              )}
            </div>
            <pre
              ref={logRef}
              className="max-h-96 overflow-auto rounded-lg bg-zinc-950 p-4 text-xs text-zinc-300 font-mono leading-relaxed"
            >
              {logContent || "Waiting for output..."}
            </pre>
          </CardContent>
        </Card>
      )}
    </DefaultLayout>
  );
}
