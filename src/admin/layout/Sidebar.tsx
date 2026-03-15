import {
  BookOpenText,
  BookText,
  ClipboardList,
  Download,
  FolderOpen,
  Gift,
  Megaphone,
  Newspaper,
  LayoutDashboard,
  Link2,
  Palette,
  Puzzle,
  Settings,
  Sheet,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";
import Logo from "../../client/static/logo.png";
import { useBranding } from "../../branding/BrandingContext";
import { cn } from "../../client/utils";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
}

const Sidebar = ({ sidebarOpen, setSidebarOpen }: SidebarProps) => {
  const location = useLocation();
  const { pathname } = location;
  const branding = useBranding();

  const trigger = useRef<any>(null);
  const sidebar = useRef<any>(null);

  const storedSidebarExpanded = localStorage.getItem("sidebar-expanded");
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
    localStorage.setItem("sidebar-expanded", sidebarExpanded.toString());
    if (sidebarExpanded) {
      document.querySelector("body")?.classList.add("sidebar-expanded");
    } else {
      document.querySelector("body")?.classList.remove("sidebar-expanded");
    }
  }, [sidebarExpanded]);

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
              {/* <!-- Menu Item Dashboard --> */}
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  cn(
                    "text-muted-foreground hover:bg-accent hover:text-accent-foreground group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium duration-300 ease-in-out",
                    {
                      "bg-accent text-accent-foreground": isActive,
                    },
                  )
                }
              >
                <LayoutDashboard />
                Dashboard
              </NavLink>

              {/* <!-- Menu Item Dashboard --> */}

              {/* <!-- Menu Item Users --> */}
              <li>
                <NavLink
                  to="/admin/users"
                  end
                  className={({ isActive }) =>
                    cn(
                      "text-muted-foreground hover:bg-accent hover:text-accent-foreground group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium duration-300 ease-in-out",
                      {
                        "bg-accent text-accent-foreground": isActive,
                      },
                    )
                  }
                >
                  <Sheet />
                  Users
                </NavLink>
              </li>
              {/* <!-- Menu Item Users --> */}

              {/* <!-- Menu Item Settings --> */}
              <li>
                <NavLink
                  to="/admin/settings"
                  end
                  className={({ isActive }) =>
                    cn(
                      "text-muted-foreground hover:bg-accent hover:text-accent-foreground group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium duration-300 ease-in-out",
                      {
                        "bg-accent text-accent-foreground": isActive,
                      },
                    )
                  }
                >
                  <Settings />
                  Settings
                </NavLink>
              </li>
              {/* <!-- Menu Item Settings --> */}

              {/* <!-- Menu Item Branding --> */}
              <li>
                <NavLink
                  to="/admin/branding"
                  end
                  className={({ isActive }) =>
                    cn(
                      "text-muted-foreground hover:bg-accent hover:text-accent-foreground group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium duration-300 ease-in-out",
                      {
                        "bg-accent text-accent-foreground": isActive,
                      },
                    )
                  }
                >
                  <Palette />
                  Branding
                </NavLink>
              </li>
              {/* <!-- Menu Item Branding --> */}

              {/* <!-- Menu Item Extension Settings --> */}
              <li>
                <NavLink
                  to="/admin/extensions"
                  end
                  className={({ isActive }) =>
                    cn(
                      "text-muted-foreground hover:bg-accent hover:text-accent-foreground group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium duration-300 ease-in-out",
                      {
                        "bg-accent text-accent-foreground": isActive,
                      },
                    )
                  }
                >
                  <Puzzle />
                  Extensions
                </NavLink>
              </li>
              {/* <!-- Menu Item Extension Settings --> */}

              {/* <!-- Menu Item Affiliate --> */}
              <li>
                <NavLink
                  to="/admin/affiliate"
                  className={({ isActive }) =>
                    cn(
                      "text-muted-foreground hover:bg-accent hover:text-accent-foreground group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium duration-300 ease-in-out",
                      {
                        "bg-accent text-accent-foreground": isActive || pathname.startsWith("/admin/affiliate"),
                      },
                    )
                  }
                >
                  <Gift />
                  Affiliate
                </NavLink>
              </li>
              {/* <!-- Menu Item Affiliate --> */}

              {/* <!-- Menu Item Announcements --> */}
              <li>
                <NavLink
                  to="/admin/announcements"
                  end
                  className={({ isActive }) =>
                    cn(
                      "text-muted-foreground hover:bg-accent hover:text-accent-foreground group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium duration-300 ease-in-out",
                      {
                        "bg-accent text-accent-foreground": isActive,
                      },
                    )
                  }
                >
                  <Megaphone />
                  Announcements
                </NavLink>
              </li>
              {/* <!-- Menu Item Announcements --> */}

              {/* <!-- Menu Item Social Connect --> */}
              <li>
                <NavLink
                  to="/admin/social-connect"
                  end
                  className={({ isActive }) =>
                    cn(
                      "text-muted-foreground hover:bg-accent hover:text-accent-foreground group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium duration-300 ease-in-out",
                      {
                        "bg-accent text-accent-foreground": isActive,
                      },
                    )
                  }
                >
                  <Link2 />
                  Social Connect
                </NavLink>
              </li>
              {/* <!-- Menu Item Social Connect --> */}

              {/* <!-- Menu Item Blog --> */}
              <li>
                <NavLink
                  to="/admin/blog"
                  end
                  className={({ isActive }) =>
                    cn(
                      "text-muted-foreground hover:bg-accent hover:text-accent-foreground group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium duration-300 ease-in-out",
                      {
                        "bg-accent text-accent-foreground": isActive,
                      },
                    )
                  }
                >
                  <Newspaper />
                  Blog
                </NavLink>
              </li>
              {/* <!-- Menu Item Blog --> */}

              {/* <!-- Menu Item Articles --> */}
              <li>
                <NavLink
                  to="/admin/articles"
                  end
                  className={({ isActive }) =>
                    cn(
                      "text-muted-foreground hover:bg-accent hover:text-accent-foreground group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium duration-300 ease-in-out",
                      {
                        "bg-accent text-accent-foreground": isActive,
                      },
                    )
                  }
                >
                  <BookOpenText />
                  Articles
                </NavLink>
              </li>
              {/* <!-- Menu Item Articles --> */}

              {/* <!-- Menu Item Docs --> */}
              <li>
                <NavLink
                  to="/admin/docs"
                  end
                  className={({ isActive }) =>
                    cn(
                      "text-muted-foreground hover:bg-accent hover:text-accent-foreground group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium duration-300 ease-in-out",
                      {
                        "bg-accent text-accent-foreground": isActive,
                      },
                    )
                  }
                >
                  <BookText size={20} />
                  Docs
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/docs/categories"
                  end
                  className={({ isActive }) =>
                    cn(
                      "text-muted-foreground hover:bg-accent hover:text-accent-foreground group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium duration-300 ease-in-out",
                      {
                        "bg-accent text-accent-foreground": isActive,
                      },
                    )
                  }
                >
                  <FolderOpen size={20} />
                  Doc Categories
                </NavLink>
              </li>
              {/* <!-- Menu Item Docs --> */}

              {/* <!-- Menu Item System Update --> */}
              <li>
                <NavLink
                  to="/admin/system-update"
                  end
                  className={({ isActive }) =>
                    cn(
                      "text-muted-foreground hover:bg-accent hover:text-accent-foreground group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium duration-300 ease-in-out",
                      {
                        "bg-accent text-accent-foreground": isActive,
                      },
                    )
                  }
                >
                  <Download size={20} />
                  System Update
                </NavLink>
              </li>
              {/* <!-- Menu Item System Update --> */}

              {/* <!-- Menu Item Activity Log --> */}
              <li>
                <NavLink
                  to="/admin/activity"
                  end
                  className={({ isActive }) =>
                    cn(
                      "text-muted-foreground hover:bg-accent hover:text-accent-foreground group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium duration-300 ease-in-out",
                      {
                        "bg-accent text-accent-foreground": isActive,
                      },
                    )
                  }
                >
                  <ClipboardList size={20} />
                  Activity Log
                </NavLink>
              </li>
              {/* <!-- Menu Item Activity Log --> */}
            </ul>
          </div>

        </nav>
        {/* <!-- Sidebar Menu --> */}
      </div>
    </aside>
  );
};

export default Sidebar;
