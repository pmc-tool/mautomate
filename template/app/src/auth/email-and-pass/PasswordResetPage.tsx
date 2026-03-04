import { ResetPasswordForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AuthPageLayout } from "../AuthPageLayout";

export function PasswordResetPage() {
  return (
    <AuthPageLayout
      title="Reset your password"
      subtitle="Enter your new password below"
    >
      <ResetPasswordForm />
      <div className="mt-4 text-center text-sm">
        <p className="text-muted-foreground">
          Password reset successful?{" "}
          <WaspRouterLink
            to={routes.LoginRoute.to}
            className="font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Go to login
          </WaspRouterLink>
        </p>
      </div>
    </AuthPageLayout>
  );
}
