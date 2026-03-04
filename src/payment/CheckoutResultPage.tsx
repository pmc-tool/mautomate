import { useEffect } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { type AuthUser } from "wasp/auth";
import UserDashboardLayout from "../user-dashboard/layout/UserDashboardLayout";

const REDIRECT_DELAY_MS = 4000;

export default function CheckoutResultPage({ user }: { user: AuthUser }) {
  const navigate = useNavigate();
  const [urlSearchParams] = useSearchParams();
  const status = urlSearchParams.get("status");
  const ext = urlSearchParams.get("ext");

  const isExtensionPurchase = !!ext && status === "success";
  const redirectTarget = isExtensionPurchase ? "/marketplace" : "/account";

  useEffect(() => {
    const redirectTimeoutId = setTimeout(() => {
      navigate(redirectTarget);
    }, REDIRECT_DELAY_MS);

    return () => {
      clearTimeout(redirectTimeoutId);
    };
  }, []);

  if (status !== "success" && status !== "canceled") {
    return <Navigate to="/account" />;
  }

  return (
    <UserDashboardLayout user={user}>
      <div className="mt-10 flex flex-col items-stretch sm:mx-6 sm:items-center">
        <div className="flex flex-col gap-4 px-4 py-8 text-center shadow-xl ring-1 ring-gray-900/10 sm:max-w-md sm:rounded-lg sm:px-10 dark:ring-gray-100/10">
          <h1 className="text-xl font-semibold">
            {status === "success" && isExtensionPurchase && "🥳 Extension Purchased!"}
            {status === "success" && !isExtensionPurchase && "🥳 Payment Successful!"}
            {status === "canceled" && "😢 Payment Canceled."}
          </h1>
          <span className="">
            You will be redirected to your{" "}
            {isExtensionPurchase ? "marketplace" : "account"} page in{" "}
            {REDIRECT_DELAY_MS / 1000} seconds...
          </span>
        </div>
      </div>
    </UserDashboardLayout>
  );
}
