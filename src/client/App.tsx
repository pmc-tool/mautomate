import { useEffect, useMemo } from "react";
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
    const userDashboardPaths = ["/dashboard", "/file-upload", "/social-connect", "/brand-voice", "/chatbot", "/account", "/checkout", "/marketplace", "/extensions", "/post-hub", "/content-calendar", "/inbox", "/video-studio", "/affiliate"];
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
    <>
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
    </>
  );
}
