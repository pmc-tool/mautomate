import { FC, ReactNode, useState } from "react";
import { type AuthUser } from "wasp/auth";
import UserHeader from "./UserHeader";
import UserSidebar from "./UserSidebar";

interface Props {
  user: AuthUser;
  children?: ReactNode;
}

const UserDashboardLayout: FC<Props> = ({ children, user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
