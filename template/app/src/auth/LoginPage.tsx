import { LoginForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AuthPageLayout } from "./AuthPageLayout";

export default function Login() {
  return (
    <AuthPageLayout
      title="Welcome back"
      subtitle="Sign in to your account to continue"
    >
      <LoginForm />
      <div className="mt-4 space-y-2 text-center text-sm">
        <p className="text-muted-foreground">
          Don't have an account?{" "}
          <WaspRouterLink
            to={routes.SignupRoute.to}
            className="font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Sign up
          </WaspRouterLink>
        </p>
        <p className="text-muted-foreground">
          Forgot your password?{" "}
          <WaspRouterLink
            to={routes.RequestPasswordResetRoute.to}
            className="font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Reset it
          </WaspRouterLink>
        </p>
      </div>
    </AuthPageLayout>
  );
}
