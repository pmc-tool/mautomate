import {
  Bot,
  Calendar,
  Columns3,
  DollarSign,
  FileUp,
  FileText,
  Film,
  Gift,
  ImagePlus,
  Lock,
  Inbox,
  LayoutDashboard,
  Video,
  Link2,
  Megaphone,
  Search,
  Settings,
  Share2,
  Store,
  TrendingUp,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";
import { useQuery } from "wasp/client/operations";
import { getUserExtensions } from "wasp/client/operations";
import Logo from "../../client/static/logo.png";
import { useBranding } from "../../branding/BrandingContext";
import { cn } from "../../client/utils";
import { getEnabledExtensions } from "../../extensions/registry";
import { CreditsWidget } from "../../client/components/CreditsWidget";

const EXTENSION_ICON_MAP: Record<string, LucideIcon> = {
  ImagePlus: ImagePlus,
  Share2: Share2,
  Search: Search,
  Inbox: Inbox,
  Video: Video,
  Film: Film,
};

interface UserSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
}

const UserSidebar = ({ sidebarOpen, setSidebarOpen }: UserSidebarProps) => {
  const location = useLocation();
  const branding = useBranding();
  const trigger = useRef<any>(null);
  const sidebar = useRef<any>(null);

  const { data: userExtensions } = useQuery(getUserExtensions);
  const enabledExtensions = getEnabledExtensions();
  const activeExtensions = enabledExtensions.filter((ext) =>
    userExtensions?.some((ue) => ue.extensionId === ext.id && ue.isActive)
  );

  const hasSeoAgent = activeExtensions.some((ext) => ext.id === "seo-agent");
  const seoExtensionEnabled = enabledExtensions.some((ext) => ext.id === "seo-agent");
  const nonSeoExtensions = activeExtensions.filter((ext) => ext.id !== "seo-agent");

  const storedSidebarExpanded = localStorage.getItem("user-sidebar-expanded");
  const [sidebarExpanded, setSidebarExpanded] = useState(
    storedSidebarExpanded === null ? false : storedSidebarExpanded === "true",
  );

  // close on click outside
  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return;
      if (
        !sidebarOpen ||
        sidebar.current.contains(target) ||
        trigger.current.contains(target)
      )
        return;
      setSidebarOpen(false);
    };
    document.addEventListener("click", clickHandler);
    return () => document.removeEventListener("click", clickHandler);
  });

  // close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  });

  useEffect(() => {
    localStorage.setItem("user-sidebar-expanded", sidebarExpanded.toString());
    if (sidebarExpanded) {
      document.querySelector("body")?.classList.add("sidebar-expanded");
    } else {
      document.querySelector("body")?.classList.remove("sidebar-expanded");
    }
  }, [sidebarExpanded]);

  const linkClassName = ({ isActive }: { isActive: boolean }) =>
    cn(
      "text-muted-foreground hover:bg-accent hover:text-accent-foreground group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium duration-300 ease-in-out",
      {
        "bg-accent text-accent-foreground": isActive,
      },
    );

  return (
    <aside
      ref={sidebar}
      className={cn(
        "bg-muted absolute top-0 left-0 z-9999 flex h-screen w-72.5 flex-col overflow-y-hidden border-r duration-300 ease-linear lg:static lg:translate-x-0",
        {
          "translate-x-0": sidebarOpen,
          "-translate-x-full": !sidebarOpen,
        },
      )}
    >
      {/* <!-- SIDEBAR HEADER --> */}
      <div className="flex items-center justify-between gap-2 px-6 py-5.5 lg:py-6.5">
        <NavLink to="/">
          <img src={branding.logoUrl || Logo} alt={branding.appName} className="h-9 w-auto" onError={(e) => { (e.target as HTMLImageElement).src = Logo; }} />
        </NavLink>

        <button
          ref={trigger}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-controls="sidebar"
          aria-expanded={sidebarOpen}
          className="block lg:hidden"
        >
          <X />
        </button>
      </div>
      {/* <!-- SIDEBAR HEADER --> */}

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        {/* <!-- Sidebar Menu --> */}
        <nav className="mt-5 px-4 py-4 lg:mt-9 lg:px-6">
          {/* <!-- Menu Group --> */}
          <div>
            <h3 className="text-muted-foreground mb-4 ml-4 text-sm font-semibold">
              MENU
            </h3>

            <ul className="mb-6 flex flex-col gap-1.5">
              <li>
                <NavLink to="/dashboard" end className={linkClassName}>
                  <LayoutDashboard />
                  Dashboard
                </NavLink>
              </li>

              <li>
                <NavLink to="/file-upload" end className={linkClassName}>
                  <FileUp />
                  File Manager
                </NavLink>
              </li>

              <li>
                <NavLink to="/social-connect" end className={linkClassName}>
                  <Link2 />
                  Social Connect
                </NavLink>
              </li>

              <li>
                <NavLink to="/brand-voice" className={({ isActive }) =>
                  linkClassName({ isActive: isActive || location.pathname.startsWith("/brand-voice") })
                }>
                  <Megaphone />
                  Brand Voice
                </NavLink>
              </li>

              <li>
                <NavLink to="/chatbot" end className={linkClassName}>
                  <Bot />
                  Chatbot
                </NavLink>
              </li>

              <li>
                <NavLink to="/account" end className={linkClassName}>
                  <Settings />
                  Account
                </NavLink>
              </li>

              <li>
                <NavLink to="/marketplace" end className={linkClassName}>
                  <Store />
                  Marketplace
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Affiliate */}
          <div>
            <h3 className="text-muted-foreground mb-4 ml-4 text-sm font-semibold">
              AFFILIATE
            </h3>
            <ul className="mb-6 flex flex-col gap-1.5">
              <li>
                <NavLink to="/affiliate" end className={linkClassName}>
                  <Gift />
                  Dashboard
                </NavLink>
              </li>
              <li>
                <NavLink to="/affiliate/earnings" end className={linkClassName}>
                  <DollarSign />
                  Earnings
                </NavLink>
              </li>
              <li>
                <NavLink to="/affiliate/withdraw" end className={linkClassName}>
                  <Wallet />
                  Withdraw
                </NavLink>
              </li>
            </ul>
          </div>

          {/* SEO & Content — always visible when SEO extension exists (locked or active) */}
          {(hasSeoAgent || seoExtensionEnabled || activeExtensions.some((ext) => ext.id === "social-media-agent")) && (
            <div>
              <h3 className="text-muted-foreground mb-4 ml-4 text-sm font-semibold">
                SEO & CONTENT
              </h3>
              <ul className="mb-6 flex flex-col gap-1.5">
                {/* SEO Agent Projects */}
                {hasSeoAgent ? (
                  <li>
                    <NavLink to="/extensions/seo-agent" className={({ isActive }) =>
                      linkClassName({ isActive: isActive || location.pathname.startsWith("/extensions/seo-agent") })
                    }>
                      <Search />
                      SEO Projects
                    </NavLink>
                  </li>
                ) : seoExtensionEnabled ? (
                  <li>
                    <NavLink to="/marketplace" className={linkClassName}>
                      <Search />
                      <span className="flex items-center gap-2">
                        SEO Projects
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      </span>
                    </NavLink>
                  </li>
                ) : null}

                {/* Keyword Research */}
                {hasSeoAgent ? (
                  <li>
                    <NavLink to="/seo/keywords" className={({ isActive }) =>
                      linkClassName({ isActive: isActive || location.pathname.startsWith("/seo/keywords") })
                    }>
                      <TrendingUp />
                      Keyword Research
                    </NavLink>
                  </li>
                ) : seoExtensionEnabled ? (
                  <li>
                    <NavLink to="/marketplace" className={linkClassName}>
                      <TrendingUp />
                      <span className="flex items-center gap-2">
                        Keyword Research
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      </span>
                    </NavLink>
                  </li>
                ) : null}

                {/* All Articles */}
                {hasSeoAgent && (
                  <li>
                    <NavLink to="/seo/articles" className={({ isActive }) =>
                      linkClassName({ isActive: isActive || location.pathname.startsWith("/seo/articles") })
                    }>
                      <FileText />
                      All Articles
                    </NavLink>
                  </li>
                )}

                {/* Post Hub — visible when either agent is active */}
                {(hasSeoAgent || activeExtensions.some((ext) => ext.id === "social-media-agent")) && (
                  <>
                    <li>
                      <NavLink to="/post-hub" className={({ isActive }) =>
                        linkClassName({ isActive: isActive || location.pathname.startsWith("/post-hub") })
                      }>
                        <Columns3 />
                        Post Hub
                      </NavLink>
                    </li>
                    <li>
                      <NavLink to="/content-calendar" className={({ isActive }) =>
                        linkClassName({ isActive: isActive || location.pathname.startsWith("/content-calendar") })
                      }>
                        <Calendar />
                        Content Calendar
                      </NavLink>
                    </li>
                  </>
                )}
              </ul>
            </div>
          )}

          {/* Extensions — non-SEO extensions */}
          {nonSeoExtensions.length > 0 && (
            <div>
              <h3 className="text-muted-foreground mb-4 ml-4 text-sm font-semibold">
                EXTENSIONS
              </h3>
              <ul className="mb-6 flex flex-col gap-1.5">
                {nonSeoExtensions.map((ext) => {
                  const Icon = EXTENSION_ICON_MAP[ext.icon] || ImagePlus;
                  return (
                    <li key={ext.id}>
                      <NavLink to={ext.route} end className={linkClassName}>
                        <Icon />
                        {ext.name}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </nav>
        {/* <!-- Sidebar Menu --> */}

        {/* Credits Widget */}
        <div className="mt-auto px-4 pb-4 lg:px-6">
          <CreditsWidget />
        </div>
      </div>
    </aside>
  );
};

export default UserSidebar;
