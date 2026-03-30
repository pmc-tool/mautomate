import { FC, ReactNode, useState, useEffect, useRef } from "react";
import { type AuthUser } from "wasp/auth";
import { claimReferral } from "wasp/client/operations";
import UserHeader from "./UserHeader";
import UserSidebar from "./UserSidebar";

interface Props {
  user: AuthUser;
  children?: ReactNode;
}

const UserDashboardLayout: FC<Props> = ({ children, user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Claim affiliate referral on first authenticated page load
  const claimed = useRef(false);
  useEffect(() => {
    if (claimed.current) return;
    const ref = localStorage.getItem("mAutomate_ref");
    if (ref) {
      claimed.current = true;
      claimReferral({ code: ref })
        .then(() => localStorage.removeItem("mAutomate_ref"))
        .catch(() => {
          claimed.current = false; // Allow retry on next render
        });
    }
  }, []);

  return (
    <div className="bg-background text-foreground">
      <div className="flex h-screen overflow-hidden">
        <UserSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
          <UserHeader
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            user={user}
          />
          <main>
            <div className="mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6 2xl:p-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default UserDashboardLayout;
