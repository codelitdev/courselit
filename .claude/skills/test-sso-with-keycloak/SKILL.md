---
name: test-sso-with-keycloak
description: Browser-test learner SAML single sign-on end to end against a real Keycloak IdP on the local stack. Use after any change to learner SSO (apps/api/src/sso-protocol, learner-sso-*, sso-admin, sign-in policy, the admin SSO settings or the storefront SSO button), or when asked to test SSO with a real identity provider.
---

# Test learner SSO with Keycloak

Unit tests and the mock IdP in `apps/api/src/sso-protocol/test-idp.ts` sign responses with our own helpers, so they can't catch how a real IdP behaves. After changing learner SSO, also run this browser test against Keycloak. Testing against Keycloak has already found a turned-off connection that could never be turned back on, and the fact that Keycloak's default client signs only the Response (which we refuse).

Everything runs through `keycloak-sso.sh` in this folder. Run it from the repository root: `.claude/skills/test-sso-with-keycloak/keycloak-sso.sh <command>`. It reads `PUBLIC_API_URL` and `DATABASE_URL` from `apps/api/.env`.

## Requirements

- Docker, and the local stack running: API, worker, admin and storefront, with `SEED=1` and `BILLING_MODE=oss` in `apps/api/.env`.
- **Keycloak must be served over HTTPS with a certificate the browser trusts.** The API only accepts `https` IdP URLs, and the browser refuses self-signed certificates. By default the script serves Keycloak with `tailscale serve` (tailnet-only) on port 9443 under this machine's Tailscale name. Choose another port with `KC_TS_PORT` if 9443 is taken, and never use `tailscale funnel`. Without Tailscale, put Keycloak behind any trusted HTTPS proxy and set `KC_PUBLIC_URL`.
- A browser tool. Use a separate (incognito) profile for the learner, so admin and learner cookies stay apart.

## Run the test

1. `keycloak-sso.sh up`. It prints the IdP metadata URL and the learner login, `lena` / `Lena-pass-123` (email `lena.kc@acme.test`).
2. In the admin, sign in as the seeded owner, `owner@example.com`. The sign-in code is printed in the API log (`[CourseLit OTP]`).
3. Open **Settings → Login providers → Single sign-on → Set up**. Paste the output of `keycloak-sso.sh metadata`, set a button label, and select **Create**. Note the connection ID (`sso_…`) in the page URL.
   - A school can show only one SSO connection. If one exists, delete it first. The IdP entity ID can't be changed, so a Keycloak with a different hostname also needs a new connection.
4. `keycloak-sso.sh point <connection>`.
5. In the admin, add the domain `acme.test`. `.test` domains can't hold a real DNS record, so run `keycloak-sso.sh verify-domain <connection>`, then reload the page.
6. Select **Test connection** and sign in at Keycloak as `lena`. The result should show the provider, a persistent subject, `lena.kc@acme.test`, "Lena Keycloak", and "On a verified domain".
7. Select **Turn on**.
8. As the learner, open the school's storefront `/login`, for example `http://school-a.localhost:<storefront port>/login`. Select **Sign in with** followed by the label, sign in at Keycloak, and expect to land on `/dashboard`. `/api/v1/learner/me` should return `lena.kc@acme.test`.

## Checks worth repeating

- Signing in again reuses the same identity: still one row in `school_sso_identities` and one school account.
- The learner's `school_sessions` row has `sso_connection_id` set. No Better Auth `session` row exists for the shadow user, whose email is `sso-…@users.invalid`.
- **Require SSO for these domains**: an email code for `someone@acme.test` is refused on the storefront, while other domains still work.
- **Turn off** ends the learner's session at once (`/learner/me` returns 401).
- Changing the subject attribute, sign-in URL or certificates on a turned-off connection makes it **Draft**, so it can be tested and turned on again.
- `keycloak-sso.sh signing response-only`, then **Test connection**: it fails with `signature_invalid` and the hint about signing the assertion. Restore with `keycloak-sso.sh signing assertion`.
- Saving SSO settings with an old admin sign-in asks the owner to sign in again.

## Gotchas

- Admin writes need a recent sign-in. If the sign-in dialog appears, sign in again and repeat the change.
- `psql -c "a; b"` runs as one transaction: if one statement fails, the earlier updates roll back.
- Keycloak's session sends `SessionNotOnOrAfter` (10 hours by default), so SSO sessions end sooner than the 7-day default. That's expected.
- Deleting a connection keeps its learners. Their shadow users stay until they sign in another way.

## Clean up

Always run `keycloak-sso.sh down` when you finish. It removes the Keycloak container and the `tailscale serve` port, which is a change to the machine's Tailscale config. Close the browser tabs you opened.
