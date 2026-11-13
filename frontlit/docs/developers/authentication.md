---
title: Authentication
description: Authenticate to the CourseLit API with a school API key or an OAuth access token, and learn how each one selects the school.
nav_order: 20
---

You authenticate every request to a school with one of two credentials: a **school API key** for your own servers and scripts, or an **OAuth access token** for apps that act on behalf of a signed-in person. AI assistants connect with OAuth, see [MCP server](/docs/developers/mcp-server).

Send exactly one credential per request. A request that carries more than one, for example an API key and a bearer token, is rejected with the error code `credential_ambiguous`.

## API keys

An API key belongs to a school, not to a person. It keeps working when the person who created it leaves the team, and it never has more access than the permissions you gave it.

### Create an API key

Only the school owner can create, list or revoke keys, and only from the admin. Keys cannot manage other keys.

<Steps>

<Step>

### Open the API keys settings

In the admin, open **Settings** and choose the **API keys** tab. The tab appears only for the school owner.

</Step>

<Step>

### Name the key and choose its permissions

Choose **Create API key**, give the key a name, and pick a permission preset or select permissions one by one. Give a key only what the integration needs. See [Permissions and scopes](/docs/developers/permissions-and-scopes).

</Step>

<Step>

### Choose when it expires

Pick **30 days**, **90 days**, **1 year**, a custom date, or **Never**. A key can last at most about two years, so a custom date must be in the future and within two years. Choosing **Never** creates a key without an expiry.

</Step>

<Step>

### Copy the key

The full key is shown once. CourseLit stores only a keyed hash of it, so a lost key cannot be recovered. Create a new key and revoke the old one instead.

</Step>

</Steps>

A school can have up to 50 active keys, meaning keys that are neither revoked nor expired. Creating a 51st returns an error until you revoke one.

### Key format

A key looks like this.

```text
cl_live_key_0190c0de0000700080000000000000a1.Qm9yZWRPZkZha2VLZXlTZWNyZXRQbGFjZWhvbGRlcg
```

The part before the dot, `cl_live_key_` followed by 32 hexadecimal characters, is a public identifier. It is safe to show in logs and is what the admin lists. The 43 characters after the dot are the secret. Treat the whole string as a password.

### Send the key

Pass the key in the `x-api-key` header.

```bash
curl https://api.courselit.app/v1/products \
  -H "x-api-key: $COURSELIT_API_KEY"
```

The key selects its school. If you also send `X-School-ID` with an API key, the API ignores it.

### Revoke a key

Revoke a key from **Settings**, **API keys**. It stops working immediately. The list also shows when each key was last used, which the API records at most once every five minutes.

### What happens with a bad key

A malformed, unknown, revoked or expired key, and a key whose school was deleted, all return the same `401` response with the code `unauthenticated`, so the response never reveals which case applied. After 30 failed key attempts from one client address within five minutes, the API refuses further key attempts from that address, even valid ones, until the window passes. See [Rate limits and retries](/docs/developers/rate-limits-and-retries).

## OAuth

Use OAuth when a person should sign in and approve your app, instead of pasting a key. The access token carries the permissions the person has in the school, narrowed to the scopes they approved.

CourseLit is an OAuth 2.1 authorization server with these properties.

- **Flow.** Authorization code with PKCE (S256). Refresh tokens are issued when the client requests the `offline_access` scope.
- **Scopes.** `data:read` and `data:write`, plus `offline_access`. The standard `openid`, `profile` and `email` scopes are also available for sign-in.
- **Client registration.** Dynamic client registration is open at `POST /api/auth/oauth2/register`, and clients can also identify themselves with a client ID metadata document. Registration is limited to 20 requests per minute.
- **Discovery.** The metadata is published at `/.well-known/oauth-authorization-server/api/auth` and `/.well-known/oauth-protected-resource/mcp` on the API host. The issuer is the API host followed by `/api/auth`.
- **Audience.** Tokens are accepted for the MCP resource, which is the API host followed by `/mcp`, and for the REST resource, which is the API host followed by `/api`.

Send the access token as a bearer token.

```bash
curl https://api.courselit.app/v1/products \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-School-ID: $SCHOOL_ID"
```

### Select the school

An OAuth token is tied to a person, who can belong to several schools, so name the school with `X-School-ID`. The value is the school's public ID, a string such as `sch_` followed by 32 hexadecimal characters. `GET /v1/schools` with an OAuth token lists the schools the person belongs to, and each item has an `id` to use here.

If you leave the header out, the API uses the school the person selected most recently in the admin. If none was ever selected, the request fails with the code `tenant_required`. If the person is not a member of the named school, it fails with `tenant_forbidden`.

AI assistants usually cannot add custom headers, so they act on the school selected in the admin.

### Scopes narrow permissions

OAuth never grants more than the person already has. Permissions ending in `:read` need the `data:read` scope. Every other permission, anything that creates, changes, deletes or sends, needs `data:write`. A token with only `data:read` can therefore read what the person can read, but cannot change anything.

## API key or OAuth

| | API key | OAuth access token |
| --- | --- | --- |
| Acts as | The school, with the key's own permissions | A person, with their permissions in the school, narrowed by scope |
| School selection | Fixed by the key | `X-School-ID`, or the last selected school |
| Created by | The school owner in the admin | Any team member who signs in and approves the app |
| Best for | Servers, scripts and automations | Apps and assistants used by people |
| Can reach payment settings, custom code and starting email sequences | No | Yes, if the person has the permission |

## Browser sessions

The admin and the school website use cookie sessions. These are for the CourseLit apps themselves and are not a way for integrations to authenticate.
