import { HttpError } from "wasp/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import type {
  GetSystemUpdateStatus,
  TriggerSystemUpdate,
  GetUpdateLog,
} from "wasp/server/operations";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assertAdmin(context: any) {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  if (!context.user.isAdmin) throw new HttpError(403, "Admin access required");
}

const UPDATE_REPO = "/home/ratul/update-repo";
const LOCK_FILE = path.join(UPDATE_REPO, ".update-lock");

function getSourceDir(): string {
  // Determine this instance's source directory from branding.json or fallback
  const brandingPath = getBrandingPath();
  if (brandingPath && fs.existsSync(brandingPath)) {
    try {
      const branding = JSON.parse(fs.readFileSync(brandingPath, "utf-8"));
      return branding.sourceDir || path.dirname(brandingPath);
    } catch {}
  }
  // Fallback: assume we're running from the source dir's .wasp/out
  return process.env.SOURCE_DIR || "/home/ratul/mautomate-app";
}

function getBrandingPath(): string | null {
  // Check env var first, then look for branding.json in source dir
  if (process.env.BRANDING_CONFIG) return process.env.BRANDING_CONFIG;
  const sourceDir = process.env.SOURCE_DIR || "/home/ratul/mautomate-app";
  const candidate = path.join(sourceDir, "branding.json");
  if (fs.existsSync(candidate)) return candidate;
  return null;
}

function isLockActive(): boolean {
  if (!fs.existsSync(LOCK_FILE)) return false;
  try {
    const content = fs.readFileSync(LOCK_FILE, "utf-8").trim();
    const pid = parseInt(content, 10);
    if (isNaN(pid)) return false;
    // Check if the process is still running
    try {
      process.kill(pid, 0);
      return true; // process exists
    } catch {
      // Process is dead — stale lock
      fs.unlinkSync(LOCK_FILE);
      return false;
    }
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Query: getSystemUpdateStatus
// ---------------------------------------------------------------------------

export const getSystemUpdateStatus: GetSystemUpdateStatus<void, any> = async (
  _args,
  context,
) => {
  assertAdmin(context);

  // Read current installed version
  let currentVersion = 0;
  const sourceDir = getSourceDir();
  const localVersionFile = path.join(sourceDir, "VERSION");
  if (fs.existsSync(localVersionFile)) {
    try {
      currentVersion = parseInt(fs.readFileSync(localVersionFile, "utf-8").trim(), 10) || 0;
    } catch {}
  }

  // Read available version from update repo
  let availableVersion = 0;
  let changelog = "";
  let updateDate = "";
  const remoteVersionFile = path.join(UPDATE_REPO, "version.json");
  if (fs.existsSync(remoteVersionFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(remoteVersionFile, "utf-8"));
      availableVersion = data.version || 0;
      changelog = data.changelog || "";
      updateDate = data.date || "";
    } catch {}
  }

  const isUpdateInProgress = isLockActive();
  const isUpdateAvailable = availableVersion > currentVersion && !isUpdateInProgress;

  return {
    currentVersion,
    availableVersion,
    changelog,
    updateDate,
    isUpdateAvailable,
    isUpdateInProgress,
  };
};

// ---------------------------------------------------------------------------
// Action: triggerSystemUpdate
// ---------------------------------------------------------------------------

export const triggerSystemUpdate: TriggerSystemUpdate<void, any> = async (
  _args,
  context,
) => {
  assertAdmin(context);

  if (isLockActive()) {
    throw new HttpError(409, "An update is already in progress");
  }

  const brandingPath = getBrandingPath();
  const updateScript = path.join(UPDATE_REPO, "update-instance.sh");

  if (!fs.existsSync(updateScript)) {
    throw new HttpError(500, "Update script not found on server");
  }

  const sourceDir = getSourceDir();
  const logFile = path.join(sourceDir, ".update-log");

  // Clear previous log
  fs.writeFileSync(logFile, `=== Update started at ${new Date().toISOString()} ===\n`);

  // Build args for the update script
  const args = brandingPath ? [brandingPath] : [];

  const logStream = fs.openSync(logFile, "a");
  const child = spawn("bash", [updateScript, ...args], {
    detached: true,
    stdio: ["ignore", logStream, logStream],
  });

  child.unref();

  return { started: true, pid: child.pid };
};

// ---------------------------------------------------------------------------
// Query: getUpdateLog
// ---------------------------------------------------------------------------

export const getUpdateLog: GetUpdateLog<void, any> = async (
  _args,
  context,
) => {
  assertAdmin(context);

  const sourceDir = getSourceDir();
  const logFile = path.join(sourceDir, ".update-log");

  if (!fs.existsSync(logFile)) {
    return { log: "", completed: true, success: true };
  }

  let log = "";
  try {
    log = fs.readFileSync(logFile, "utf-8");
  } catch {
    return { log: "", completed: true, success: true };
  }

  // Check completion markers in log
  const completed = log.includes("=== UPDATE COMPLETE ===") || log.includes("=== UPDATE FAILED ===");
  const success = log.includes("=== UPDATE COMPLETE ===");

  // Only return last 200 lines to keep payload manageable
  const lines = log.split("\n");
  const tail = lines.slice(-200).join("\n");

  return { log: tail, completed, success };
};
