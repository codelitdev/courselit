# PRD: Better-Auth Migration & SAML SSO Support

## 1. Objective

Migrate the authentication system of `apps/web` from `next-auth` to `better-auth`. The new system must support multi-tenancy and provide the following authentication methods, configurable per domain:

1.  **Email + 6-digit OTP** (Existing functionality, migrated).
2.  **Google / GitHub OAuth** (Configurable via domain settings).
3.  **SAML SSO** (Configurable via domain settings).

## 2. Current State vs. Future State

| Feature           | Current (`next-auth`)                 | Future (`better-auth`)                                         |
| :---------------- | :------------------------------------ | :------------------------------------------------------------- |
| **Core Auth**     | `next-auth` v4/v5                     | `better-auth`                                                  |
| **Database**      | MongoDB (Custom Models)               | MongoDB (Better-Auth Schema + Custom Models)                   |
| **Multi-tenancy** | `Domain` model + Header check         | `Domain` model + Better-Auth Organization/Multi-tenant plugins |
| **Email Auth**    | Custom `CredentialsProvider` with OTP | `email-otp` plugin                                             |
| **Social Auth**   | Not implemented / Static              | Dynamic per-tenant configuration (Google/GitHub)               |
| **SSO**           | Not implemented                       | SAML SSO via `sso` plugin                                      |

## 3. Technical Architecture

### 3.1. Database Schema Changes

#### `Domain` Model

We need to update the `Domain` model (in `apps/web/models/Domain.ts`) to store authentication settings.

```typescript
interface AuthProviderConfig {
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
}

interface SAMLConfig {
  enabled: boolean;
  entryPoint: string;
  issuer: string;
  cert: string;
  // ...other SAML specific fields
}

// Add to Domain Schema
auth: {
  emailOtp: { enabled: boolean; default: true },
  google: AuthProviderConfig,
  github: AuthProviderConfig,
  saml: SAMLConfig
}
```

#### User Collection (Reuse Existing)

We will reuse the existing `users` collection defined in `packages/common-logic`.
We need to update `UserSchema` in `packages/common-logic/src/models/user/index.ts` to support `better-auth` requirements:

```typescript
// Add to UserSchema
emailVerified: { type: Boolean, default: false },
image: { type: String }, // Map to avatar or keep separate
account: { type: Object }, // For better-auth account linking if needed, or use separate collection
```

**Mapping Strategy**:

- `id`: Map to `_id` (ObjectId) or `userId` (String). Better-auth MongoDB adapter typically handles `_id`.
- `email`: Exists.
- `name`: Exists.
- `image`: Add field or map to `avatar.url`.
- `emailVerified`: Add field.

#### Better-Auth Auxiliary Collections

We will let `better-auth` create the following new collections (or use existing if we want to map them, but new is cleaner for these):

- `session`
- `account`
- `verification`
- `organization` (if we use the org plugin)
- `member` (if we use the org plugin)

**Migration Note**: No data migration for users is needed. We just need to ensure the schema is updated.

### 3.2. Authentication Flows

#### Multi-Tenancy

The application identifies the tenant via the `domain` header (or hostname).

- **Login Page**: When a user visits `/login` on a specific domain:
    1.  Fetch `Domain` config.
    2.  Render enabled login buttons (Email, Google, GitHub, SSO).
- **Better-Auth Initialization**:
    - We need a way to dynamically load providers based on the current request/domain.
    - `better-auth` allows hooking into the context. We might need a custom adapter or middleware that initializes `better-auth` with the specific tenant's config, OR use a "multi-tenant" setup where all providers are registered but filtered at runtime.
    - _Strategy_: Use `better-auth`'s multi-tenant capabilities. If dynamic client ID/Secret for OAuth is complex, we might start with a platform-wide Google/GitHub app (if acceptable) or investigate `better-auth`'s dynamic provider configuration. _Assumption for PRD_: We will implement dynamic configuration.

#### Custom Adapter for Scoped User Uniqueness

Since `better-auth` by default assumes global email uniqueness, but our users are scoped by `domain`, we must ensure all database operations are scoped.
We will implement a **Custom Adapter Wrapper** around the standard MongoDB adapter.

**Strategy**:

1.  **Context Propagation**: Use `AsyncLocalStorage` (or similar mechanism compatible with Next.js) to make the current `domainId` available to the adapter.
2.  **Adapter Overrides**:
    - `getUserByEmail(email)`: Intercept this call. Retrieve `domainId` from context. Query database with `{ email, domain: domainId }`.
    - `createUser(user)`: Inject `domain: domainId` into the user object before saving.
    - `createSession(session)`: Ensure session is linked to the correct user/domain.

This ensures that when "alice@example.com" logs in, `better-auth` finds the specific Alice for the current domain, not a random one.

### 3.3. User Interface

#### `/dashboard/settings`

Add a new "Authentication" tab.

- **Email Auth**: Toggle On/Off.
- **Google Auth**: Toggle On/Off + Input fields for `Client ID`, `Client Secret`.
- **GitHub Auth**: Toggle On/Off + Input fields for `Client ID`, `Client Secret`.
- **SAML SSO**: Toggle On/Off + Input fields for `Entry Point`, `Issuer`, `Certificate`, etc. + Display "Service Provider Metadata" (ACS URL, Entity ID) for the user to configure their IdP.

#### `/login`

- Dynamic rendering based on enabled methods.
- "Sign in with Google" (if enabled).
- "Sign in with GitHub" (if enabled).
- "Sign in with SSO" (if enabled).
- Email input for OTP.

## 4. Implementation Plan

### Phase 1: Setup & Core Auth

1.  Install `better-auth` and MongoDB adapter.
2.  Configure `better-auth` with `email-otp` plugin.
3.  Update `Domain` model to include `auth` settings structure.
4.  Create a basic `auth.ts` file using `better-auth`.
5.  Replace `next-auth` session provider with `better-auth` client.

### Phase 2: Multi-Tenancy & Dynamic Config

1.  Implement logic to load auth config from `Domain` model.
2.  Configure `better-auth` to respect tenant settings (enable/disable providers).
3.  Implement the UI in `/dashboard/settings` to save these settings.

### Phase 3: SSO & OAuth

1.  Integrate `@better-auth/sso` plugin.
2.  Implement the SAML configuration UI.
3.  Implement the OAuth configuration UI.
4.  Verify flows for Google, GitHub, and SAML.

### Phase 4: Migration & Cleanup

1.  Remove `next-auth` dependencies and code (`auth.ts`, `auth.config.ts`, `VerificationToken` model).
2.  Test all flows thoroughly.

## 5. Open Questions / Risks

- **Dynamic OAuth Secrets**: Does `better-auth` natively support different Client IDs/Secrets per request/tenant?
    - _Mitigation_: If not natively supported, we may need to instantiate the auth handler per-request or use a custom middleware wrapper.
- **User Migration**: Mapping existing passwords (if any) or ensuring seamless transition for OTP users.
    - _Note_: Since we use OTP, there are no passwords to migrate. Just user profiles (Email, Name, ID).
