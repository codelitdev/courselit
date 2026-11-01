import { fromNodeHeaders } from "better-auth/node";
import type { Express, Response } from "express";
import type { DispatchDeps } from "./deps.js";
import {
  findLearnerGoogleRequest,
  finishLearnerGoogleSignIn,
  learnerGoogleFailureUrl,
} from "./learner-sign-in.js";
import { escapeHtml } from "./system-mail.js";

const BEGIN_PATH = "/learner-login/google";
const FINISH_PATH = "/learner-login/google/finish";

function sendExpired(res: Response) {
  res
    .status(400)
    .type("html")
    .send(
      `<!doctype html><html><body style="font-family: sans-serif; padding: 24px;"><p>${escapeHtml(
        "This sign-in link has expired. Go back to the school's website and try again.",
      )}</p></body></html>`,
    );
}

function copySetCookies(from: globalThis.Response, res: Response) {
  const cookies = from.headers.getSetCookie?.() ?? [];
  if (cookies.length > 0) res.append("Set-Cookie", cookies);
}

/**
 * "Sign in with Google" for school websites runs here, on the API host, so
 * the CourseLit session Google sign-in creates never lands on a host a school
 * controls. The school website only ever receives a single-use ticket.
 */
export function registerLearnerGoogleRoutes(app: Express, deps: DispatchDeps) {
  const auth = deps.auth.auth;
  const publicApiUrl = deps.auth.publicApiUrl;

  app.get(BEGIN_PATH, async (req, res, next) => {
    try {
      const token = typeof req.query.request === "string" ? req.query.request : "";
      const request = token
        ? await findLearnerGoogleRequest(deps.db, token, deps.clock)
        : null;
      if (!request) return sendExpired(res);
      const callback = new URL(FINISH_PATH, publicApiUrl);
      callback.searchParams.set("request", token);
      const failure = new URL(callback);
      failure.searchParams.set("error", "1");
      const response = await auth.api.signInSocial({
        body: {
          provider: "google",
          callbackURL: callback.toString(),
          errorCallbackURL: failure.toString(),
          disableRedirect: true,
        },
        headers: fromNodeHeaders(req.headers),
        asResponse: true,
      });
      const body = (await response.json().catch(() => null)) as { url?: string } | null;
      if (!response.ok || !body?.url) return sendExpired(res);
      copySetCookies(response, res);
      res.redirect(302, body.url);
    } catch (error) {
      next(error);
    }
  });

  app.get(FINISH_PATH, async (req, res, next) => {
    try {
      const token = typeof req.query.request === "string" ? req.query.request : "";
      if (!token) return sendExpired(res);
      const headers = fromNodeHeaders(req.headers);
      const session = req.query.error ? null : await auth.api.getSession({ headers });
      const finished = session
        ? await finishLearnerGoogleSignIn(
            deps.db,
            {
              requestToken: token,
              user: {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name,
                image: session.user.image,
              },
            },
            deps.clock,
          )
        : null;
      if (session) {
        // The learner now has a school session to come; the CourseLit-wide
        // session Google sign-in made here has done its job.
        const signedOut = await auth.api.signOut({ headers, asResponse: true });
        copySetCookies(signedOut, res);
      }
      if (finished?.ok) return res.redirect(302, finished.value.redirectUrl);
      const failure = await learnerGoogleFailureUrl(deps.db, token);
      return failure ? res.redirect(302, failure) : sendExpired(res);
    } catch (error) {
      next(error);
    }
  });
}
