import { VerifyEmailForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AuthPageLayout } from "../AuthPageLayout";

export function EmailVerificationPage() {
  return (
    <AuthPageLayout
      title="Verify your email"
      subtitle="Check your inbox for a verification link"
    >
      <VerifyEmailForm />
      <div className="mt-4 text-center text-sm">
        <p className="text-muted-foreground">
          Email verified?{" "}
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
