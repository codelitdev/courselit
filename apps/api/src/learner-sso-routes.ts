import express, { type Express, type RequestHandler, type Response } from "express";
import { CLIENT_IP_HEADER } from "./auth/api-key-throttle.js";
import type { DispatchDeps } from "./deps.js";
import {
  beginSsoRedirect,
  completeSsoResponse,
  findSsoConnectionByPublicId,
  ssoServiceProviderMetadata,
} from "./learner-sso-sign-in.js";
import { assertRateLimit } from "./rate-limit.js";
import { escapeHtml } from "./system-mail.js";

const ACS_BODY_LIMIT = "256kb";
const ACS_WINDOW_MS = 10 * 60 * 1000;
const ACS_LIMIT = 60;

function sendExpired(res: Response) {
  res
    .status(404)
    .setHeader("Cache-Control", "no-store")
    .type("html")
    .send(
      `<!doctype html><html><body style="font-family: sans-serif; padding: 24px;"><p>${escapeHtml(
        "This sign-in link has expired. Go back to the school's website and try again.",
      )}</p></body></html>`,
    );
}

/**
 * Single sign-on for school websites runs on the API host. The IdP posts the
 * response to `/learner-login/sso/:conn/acs` cross-site, so no cookie is
 * involved: the request token in RelayState finds the sign-in, and the nonce
 * cookie on the school's host (checked when the ticket is redeemed) ties it
 * to the browser that started it.
 */
export function registerLearnerSsoRoutes(app: Express, deps: DispatchDeps) {
  const publicApiUrl = deps.auth.publicApiUrl;
  const billing = deps.billing.billing;

  app.get("/learner-login/sso/:conn/start", async (req, res, next) => {
    try {
      const token = typeof req.query.request === "string" ? req.query.request : "";
      const outcome = await beginSsoRedirect(
        deps.db,
        { connectionPublicId: req.params.conn, requestToken: token, publicApiUrl },
        deps.clock,
      );
      if (outcome.kind === "unavailable") return sendExpired(res);
      res.setHeader("Cache-Control", "no-store");
      res.redirect(302, outcome.url);
    } catch (error) {
      next(error);
    }
  });

  app.get("/learner-login/sso/:conn/metadata", async (req, res, next) => {
    try {
      const xml = await ssoServiceProviderMetadata(deps.db, req.params.conn, publicApiUrl);
      if (!xml) return sendExpired(res);
      res.setHeader("Cache-Control", "no-store");
      res.type("application/samlmetadata+xml").send(xml);
    } catch (error) {
      next(error);
    }
  });

  // Mounted for this route only, and registered before any global body
  // parser, so a larger global limit can never apply to it first.
  const parseAcsBody: RequestHandler = (req, res, next) => {
    express.urlencoded({ extended: false, limit: ACS_BODY_LIMIT, parameterLimit: 10 })(
      req,
      res,
      (error?: unknown) => {
        if (error) {
          res.status(413).type("text").send("The request is too large.");
          return;
        }
        next();
      },
    );
  };
  app.post("/learner-login/sso/:conn/acs", parseAcsBody, async (req, res, next) => {
    try {
      const connection = await findSsoConnectionByPublicId(deps.db, req.params.conn);
      if (!connection) return sendExpired(res);
      const limited = await assertRateLimit(
        deps.db,
        {
          schoolId: connection.schoolId,
          userId: String(req.headers[CLIENT_IP_HEADER] ?? "unknown"),
          scope: "learner_sso",
          action: "acs",
          subjectId: "acs",
          windowMs: ACS_WINDOW_MS,
          limit: ACS_LIMIT,
        },
        deps.clock,
      );
      if (!limited.ok) {
        res.setHeader("Retry-After", "60");
        res.status(429).type("text").send("Too many sign-in attempts. Try again shortly.");
        return;
      }
      const body = (req.body ?? {}) as Record<string, unknown>;
      const outcome = await completeSsoResponse(
        deps.db,
        {
          connectionPublicId: req.params.conn,
          samlResponse: body.SAMLResponse,
          relayState: body.RelayState,
          publicApiUrl,
          billing,
        },
        deps.clock,
      );
      if (outcome.kind === "unavailable") return sendExpired(res);
      res.setHeader("Cache-Control", "no-store");
      res.redirect(302, outcome.url);
    } catch (error) {
      next(error);
    }
  });
}
