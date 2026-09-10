import { ssoClient } from "@better-auth/sso/client";
import { createAuthClient } from "better-auth/client";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
  basePath: "/api/learner-auth",
  plugins: [emailOTPClient(), ssoClient()],
});
