import { SignupForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AuthPageLayout } from "./AuthPageLayout";

export function Signup() {
  return (
    <AuthPageLayout
      title="Create your account"
      subtitle="Start automating your marketing today"
    >
      <SignupForm />
      <div className="mt-4 text-center text-sm">
        <p className="text-muted-foreground">
          Already have an account?{" "}
          <WaspRouterLink
            to={routes.LoginRoute.to}
            className="font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Sign in
          </WaspRouterLink>
        </p>
      </div>
    </AuthPageLayout>
  );
}
