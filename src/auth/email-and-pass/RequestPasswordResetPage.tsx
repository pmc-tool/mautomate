import { ForgotPasswordForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AuthPageLayout } from "../AuthPageLayout";

export function RequestPasswordResetPage() {
  return (
    <AuthPageLayout
      title="Forgot password?"
      subtitle="Enter your email and we'll send you a reset link"
    >
      <ForgotPasswordForm />
      <div className="mt-4 text-center text-sm">
        <p className="text-muted-foreground">
          Remember your password?{" "}
          <WaspRouterLink
            to={routes.LoginRoute.to}
            className="font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Back to login
          </WaspRouterLink>
        </p>
      </div>
    </AuthPageLayout>
  );
}
