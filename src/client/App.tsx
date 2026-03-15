import { Component, useEffect, useMemo, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router";
import { routes } from "wasp/client/router";
import { Toaster } from "../client/components/ui/toaster";
import "./Main.css";
import NavBar from "./components/NavBar/NavBar";
import {
  demoNavigationitems,
  marketingNavigationItems,
} from "./components/NavBar/constants";
import CookieConsentBanner from "./components/cookie-consent/Banner";
import { BrandingProvider } from "../branding/BrandingContext";

// ---------------------------------------------------------------------------
// C2: Error Boundary — catches unhandled React errors
// ---------------------------------------------------------------------------

interface ErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Report to server (fire-and-forget)
    fetch("/api/error-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error?.message,
        stack: error?.stack,
        component: info?.componentStack?.slice(0, 500),
        url: window.location.href,
      }),
    }).catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
          <div className="max-w-md text-center">
            <h1 className="mb-2 text-2xl font-bold">Something went wrong</h1>
            <p className="mb-6 text-gray-400">
              An unexpected error occurred. Please refresh the page to continue.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-white px-6 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * use this component to wrap all child components
 * this is useful for templates, themes, and context
 */
export default function App() {
  const location = useLocation();
  const isMarketingPage = useMemo(() => {
    return (
      location.pathname === "/" ||
      location.pathname.startsWith("/pricing") ||
      location.pathname === "/blog" ||
      location.pathname.startsWith("/blog/") ||
      location.pathname === "/articles" ||
      location.pathname.startsWith("/articles/") ||
      location.pathname === "/docs" ||
      location.pathname.startsWith("/docs/")
    );
  }, [location]);

  const navigationItems = isMarketingPage
    ? marketingNavigationItems
    : demoNavigationitems;

  const shouldDisplayAppNavBar = useMemo(() => {
    return (
      location.pathname !== routes.LoginRoute.build() &&
      location.pathname !== routes.SignupRoute.build()
    );
  }, [location]);

  const isAdminDashboard = useMemo(() => {
    return location.pathname.startsWith("/admin");
  }, [location]);

  const isUserDashboard = useMemo(() => {
    const userDashboardPaths = ["/dashboard", "/file-upload", "/social-connect", "/brand-voice", "/chatbot", "/account", "/checkout", "/marketplace", "/extensions", "/post-hub", "/content-calendar", "/inbox", "/video-studio", "/affiliate", "/long-story"];
    return userDashboardPaths.some(
      (path) => location.pathname === path || location.pathname.startsWith(path + "/")
    );
  }, [location]);

  // Capture affiliate referral code from URL param or cookie
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("mAutomate_ref", ref);
      return;
    }
    // Also check cookie set by /api/affiliate/track/:code
    if (!localStorage.getItem("mAutomate_ref")) {
      const match = document.cookie.match(/(?:^|;\s*)mAutomate_ref=([^;]+)/);
      if (match) {
        localStorage.setItem("mAutomate_ref", decodeURIComponent(match[1]));
      }
    }
  }, [location.search]);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView();
      }
    }
  }, [location]);

  return (
    <AppErrorBoundary>
      <BrandingProvider>
        <div className="bg-background text-foreground min-h-screen">
          {isAdminDashboard || isUserDashboard ? (
            <Outlet />
          ) : (
            <>
              {shouldDisplayAppNavBar && (
                <NavBar navigationItems={navigationItems} />
              )}
              <div className="mx-auto max-w-(--breakpoint-2xl)">
                <Outlet />
              </div>
            </>
          )}
        </div>
        <Toaster position="bottom-right" />
        <CookieConsentBanner />
      </BrandingProvider>
    </AppErrorBoundary>
  );
}
