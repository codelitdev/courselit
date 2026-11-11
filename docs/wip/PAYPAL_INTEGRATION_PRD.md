# PayPal Integration PRD

## Document Control

- Status: Draft
- Last updated: April 19, 2026
- Owner: Payments/Platform team
- Target workspace: `apps/web` (`@courselit/web`)

## Executive Summary

CourseLit should add PayPal as a supported payment gateway alongside Stripe, Razorpay, and Lemon Squeezy.

PayPal is a strong fit for one-time payments and an acceptable fit for subscriptions and EMI, provided we adopt a provider-managed recurring object model similar to our Lemon Squeezy approach:

- one-time payments use PayPal Orders with dynamic pricing and product name
- subscriptions use a generic PayPal product plus cadence-specific recurring plan templates
- EMI uses the same monthly recurring template model with finite billing cycles

This PRD recommends implementing PayPal in a way that is:

- scalable for multi-tenant usage
- secure against forged callbacks and tenant leakage
- maintainable within the existing `payments-new` abstraction

## Problem Statement

CourseLit currently supports:

- Stripe
- Razorpay
- Lemon Squeezy

PayPal is already partially modeled in the codebase, but is not implemented:

- `paypal` exists in payment method constants
- `paypalSecret` exists in site settings types/schema
- provider resolution throws `not implemented`
- admin settings render a disabled PayPal credential field

Relevant files:

- [apps/web/payments-new/index.ts](/home/rajat/dev/proj/courselit/apps/web/payments-new/index.ts:21)
- [packages/common-models/src/site-info.ts](/home/rajat/dev/proj/courselit/packages/common-models/src/site-info.ts:1)
- [packages/orm-models/src/models/site-info.ts](/home/rajat/dev/proj/courselit/packages/orm-models/src/models/site-info.ts:1)
- [apps/web/components/admin/settings/index.tsx](/home/rajat/dev/proj/courselit/apps/web/components/admin/settings/index.tsx:1106)

The product requirement is that CourseLit must preserve its dynamic checkout behavior:

- creator-defined product name at checkout
- creator-defined price at checkout
- no requirement to predefine one provider-side product per CourseLit product

That model already works well with Stripe and Razorpay, and is partially approximated in Lemon Squeezy using a generic provider product and overrideable pricing. PayPal must fit this model as closely as possible without introducing operational fragility.

## Goals

1. Support PayPal for all existing paid CourseLit payment plan types:
    - one-time
    - subscription
    - EMI
2. Preserve dynamic price and display-name behavior at checkout.
3. Reuse the existing `payments-new` provider abstraction with minimal cross-provider branching.
4. Maintain tenant isolation for a multi-tenant application.
5. Keep the admin setup flow understandable and low-friction.
6. Ensure webhook verification, idempotency, and replay safety.
7. Avoid uncontrolled growth of provider-side objects over time.
8. Fit PayPal into the existing CourseLit payment architecture without changing existing payment constructs, plan semantics, invoice semantics, membership lifecycle semantics, or non-PayPal provider behavior.

## Non-Goals

- Replacing or redesigning the existing payment architecture
- Refactoring existing Stripe, Razorpay, or Lemon Squeezy flows to make PayPal fit
- Changing existing CourseLit payment plan constructs or introducing new plan types for PayPal
- Changing current invoice, membership, checkout, or webhook abstractions unless a change is strictly additive and backward-compatible
- Building provider-agnostic recurring object storage for all gateways in phase 1
- Supporting PayPal marketplace payouts or partner/referral flows
- Supporting multiple active payment gateways per tenant at the same time
- Migrating existing Stripe, Razorpay, or Lemon Squeezy subscriptions to PayPal

## Current State

Current provider behavior in `payments-new`:

- Stripe creates checkout sessions with inline recurring price data and dynamic product names.
- Razorpay creates orders or recurring plans/subscriptions on the fly.
- Lemon Squeezy relies on a generic provider product with stored variant IDs and overrides custom price/name at checkout.

Relevant implementation references:

- [apps/web/payments-new/stripe-payment.ts](/home/rajat/dev/proj/courselit/apps/web/payments-new/stripe-payment.ts:43)
- [apps/web/payments-new/razorpay-payment.ts](/home/rajat/dev/proj/courselit/apps/web/payments-new/razorpay-payment.ts:97)
- [apps/web/payments-new/lemonsqueezy-payment.ts](/home/rajat/dev/proj/courselit/apps/web/payments-new/lemonsqueezy-payment.ts:53)
- [apps/web/app/api/payment/initiate/route.ts](/home/rajat/dev/proj/courselit/apps/web/app/api/payment/initiate/route.ts:1)
- [apps/web/app/api/payment/webhook/route.ts](/home/rajat/dev/proj/courselit/apps/web/app/api/payment/webhook/route.ts:1)
- [apps/web/components/public/payments/checkout.tsx](/home/rajat/dev/proj/courselit/apps/web/components/public/payments/checkout.tsx:174)

## Product and API Constraints

### Architectural constraint

PayPal must be designed within the boundaries of the payment abstractions already present in CourseLit.

This means:

- no redesign of the `Payment` interface purely for PayPal
- no change to the meaning of existing CourseLit payment plan types
- no change to the existing `initiate -> invoice pending -> webhook verify -> invoice paid -> membership activate` lifecycle
- no change to existing provider implementations except additive registration and shared hardening that is independently valuable
- no PayPal-driven rewrite of checkout UI beyond provider-specific redirect handling

If PayPal cannot fit a behavior cleanly into these existing abstractions, the preferred response is to constrain the PayPal implementation, not to expand the global abstraction surface in phase 1.

### One-time payments

PayPal Orders supports dynamic purchase units, item names, invoice IDs, and custom identifiers. This is a good fit for CourseLit one-time payments.

### Subscriptions

PayPal recurring billing requires a billing plan, and plans require a product. This is not as flexible as Stripe inline recurring pricing, but it is conceptually close to our Lemon Squeezy model.

Important implication:

- we should not attempt to use a single recurring template for all cadences
- monthly and yearly recurring flows should use different base plan templates

### EMI

PayPal recurring plans support finite billing cycles. This is a strong fit for EMI because EMI in CourseLit is already modeled as a monthly recurring charge with a fixed number of installments.

## Proposed Product Model

CourseLit should implement PayPal using the following model:

### One-time

- create a PayPal Order dynamically at checkout
- set dynamic amount
- set dynamic item name
- set `invoice_id` and `custom_id` for CourseLit invoice/membership tracking
- redirect buyer to PayPal approval flow

### Subscription

- configure one generic PayPal product per tenant
- configure one monthly recurring billing plan template per tenant
- configure one yearly recurring billing plan template per tenant
- create subscriptions from the relevant template
- override price and subscriber-facing metadata at subscription creation where PayPal allows

### EMI

- reuse the monthly recurring plan template
- create a subscription with finite monthly billing cycles equal to `emiTotalInstallments`
- use the per-cycle amount from `emiAmount`

This is intentionally similar to Lemon Squeezy:

- separate base recurring objects by cadence
- override dynamic business values per checkout where allowed
- avoid one provider object per CourseLit product

## Recommended Tenant Configuration Model

The current `paypalSecret` field is not enough. Phase 1 should expand site settings to support a secure and maintainable PayPal integration.

### Required settings

- `paypalClientId`
- `paypalClientSecret`

### Recommended recurring object settings

- `paypalProductId`
- `paypalMonthlyPlanId`
- `paypalYearlyPlanId`

### Optional future settings

- `paypalBrandName`
- `paypalMerchantCountry`

### Why store template IDs instead of creating plans every time

Storing template IDs gives us:

- predictable recurring cadence behavior
- less API churn
- easier debugging and support
- lower risk of runaway provider object creation

This is better for scalability and maintainability than creating a brand-new plan for every CourseLit checkout.

## UX and Setup Flow

Admin setup should feel closer to Lemon Squeezy than Stripe.

### Admin configuration flow

1. Merchant connects PayPal credentials.
2. Merchant selects PayPal as payment method.
3. Merchant creates a generic PayPal product and cadence-specific recurring plans in the PayPal portal.
4. Merchant enters the existing PayPal product/plan template IDs in CourseLit settings.
5. Merchant configures webhook in PayPal.
6. CourseLit validates the configuration before saving.

Admin UX requirement:

- PayPal settings should reuse the same admin UX pattern as Lemon Squeezy.
- The UI should use explicitly labeled fields for the generic PayPal product ID, monthly plan ID, and yearly plan ID.
- The UX should make it clear that these IDs are created in the PayPal portal and then pasted into CourseLit.
- CourseLit should accept a single set of PayPal credentials and IDs, just like the app does for other gateways.
- CourseLit should not introduce separate app-level live/test environment toggles for PayPal in phase 1.

### Product decision

CourseLit should not support auto-provisioning of PayPal products or recurring plan templates.

The merchant should create the generic PayPal product and the recurring plan templates in the PayPal portal, then copy their IDs into CourseLit settings.

This is intentional and should mirror the existing Lemon Squeezy operating model:

- CourseLit does not provision provider-side catalog objects on behalf of the merchant
- the merchant remains the source of truth for provider-side product and plan setup
- CourseLit stores and reuses the IDs needed for checkout initiation

## Detailed Functional Requirements

### FR1: Payment method availability

When a tenant selects PayPal and provides valid configuration, CourseLit should allow paid plans to be purchased via PayPal.

### FR2: One-time initiation

For one-time plans, initiating payment should:

- create a PayPal Order
- include dynamic price
- include dynamic product title
- persist a pending CourseLit invoice before redirect
- return enough information for frontend approval redirect

### FR3: Subscription initiation

For monthly and yearly subscriptions, initiating payment should:

- choose the correct base PayPal plan template by cadence
- create a PayPal subscription approval session using CourseLit invoice/membership metadata
- persist a pending CourseLit invoice before redirect

### FR4: EMI initiation

For EMI plans, initiating payment should:

- use the monthly recurring base template
- set finite cycle count equal to `emiTotalInstallments`
- set cycle price equal to `emiAmount`
- persist a pending CourseLit invoice before redirect

### FR5: Verification

PayPal payments must continue to use the existing server-side webhook confirmation flow and must not trust browser redirects alone.

Webhook signature/authenticity verification is out of scope for this PRD and will be handled in a separate cross-provider follow-up.

### FR6: Membership activation

Membership activation must continue to flow through the existing invoice + webhook pipeline, preserving current behavior for:

- active membership granting
- included products
- EMI completion handling
- recurring invoice processing

### FR7: Subscription cancellation

For subscription and EMI memberships, CourseLit should be able to cancel the PayPal subscription using the stored subscription ID.

### FR8: Subscription validation

The provider must support validation of subscription status when a previously active membership re-enters checkout.

## Proposed Technical Design

### 1. Provider implementation

Add:

- `apps/web/payments-new/paypal-payment.ts`

This provider should implement the existing `Payment` interface:

- `setup`
- `initiate`
- `verify`
- `getPaymentIdentifier`
- `getMetadata`
- `getName`
- `cancel`
- `getSubscriptionId`
- `validateSubscription`
- `getCurrencyISOCode`

Implementation rule:

- PayPal must conform to the current `Payment` contract as it exists today.
- Phase 1 should not broaden the interface solely to express PayPal-specific concepts.
- If PayPal needs intermediate helper methods, they should remain internal to `paypal-payment.ts`.

### 2. Provider selection

Update:

- [apps/web/payments-new/index.ts](/home/rajat/dev/proj/courselit/apps/web/payments-new/index.ts:21)

Behavior:

- remove the `not implemented` branch for PayPal
- instantiate and set up `PayPalPayment`

Constraint:

- provider selection should remain a simple extension of the existing switch-based model
- no new provider registry framework or payment architecture rewrite is needed for PayPal

### 3. Checkout response shape

Current provider return values differ:

- Stripe returns a session ID
- Razorpay returns an order/subscription ID
- Lemon Squeezy returns a checkout URL

PayPal will likely return either:

- approval URL, or
- an order/subscription ID plus approval URL

Recommendation:

- preserve backward compatibility in phase 1
- return `paymentTracker` as the approval URL for PayPal
- use provider-specific frontend handling similar to Lemon Squeezy redirect behavior

Constraint:

- do not redesign the payment initiation route contract to normalize all providers in phase 1
- PayPal should adapt to the current route response pattern the same way existing providers already do

### 4. Frontend checkout integration

Update:

- [apps/web/components/public/payments/checkout.tsx](/home/rajat/dev/proj/courselit/apps/web/components/public/payments/checkout.tsx:174)

Behavior:

- when `paymentMethod === paypal`
- redirect the browser to the returned approval URL

Phase 1 recommendation:

- use redirect-based PayPal approval
- do not add PayPal smart buttons in phase 1

Reason:

- simpler integration
- smaller frontend surface area
- lower maintenance cost
- consistent with current redirect-based Stripe and Lemon Squeezy flows

Constraint:

- do not restructure checkout into a provider plugin system for this feature
- do not move existing Stripe, Razorpay, or Lemon Squeezy logic just to create symmetry for PayPal

### 5. Webhook handling

The existing route:

- [apps/web/app/api/payment/webhook/route.ts](/home/rajat/dev/proj/courselit/apps/web/app/api/payment/webhook/route.ts:1)

should remain the central payment confirmation path.

PayPal support requires:

- parsing PayPal event payloads
- mapping approved/captured payments and subscription billings to CourseLit invoice semantics

Constraint:

- keep the existing webhook route as the shared orchestration point
- keep provider-specific translation logic inside the PayPal provider where practical
- do not introduce a new parallel payment lifecycle just for PayPal

Current-state note:

- CourseLit does not yet have a standardized webhook signature verification baseline across all providers.
- PayPal should not introduce provider-specific webhook signature verification in this work.
- Webhook authenticity verification is intentionally deferred to a separate cross-provider follow-up.
- In the current `payments-new` abstraction, `Payment.verify(event)` is not a cryptographic signature-verification hook.
- `Payment.verify(event)` should continue to mean "does this payload represent a relevant and processable payment event for this provider?"
- When the later cross-provider verification work lands, any authenticity check must happen before the existing `Payment.verify(event)` shape/content check runs.

### 6. Metadata strategy

CourseLit currently depends on metadata flowing back from providers.

Required CourseLit metadata:

- `membershipId`
- `invoiceId`
- `currencyISOCode`

Recommended PayPal metadata mapping:

- store CourseLit invoice ID in `invoice_id` when supported
- store membership/invoice identifiers in `custom_id` when supported
- if webhook payloads do not include all required metadata directly, fetch the underlying order/subscription resource during verification

### 7. EMI completion behavior

Current EMI completion logic in the webhook route counts paid invoices and cancels the underlying provider subscription after the configured installment count is reached.

Relevant code:

- [apps/web/app/api/payment/webhook/route.ts](/home/rajat/dev/proj/courselit/apps/web/app/api/payment/webhook/route.ts:58)

For PayPal, we should still keep this app-side safeguard even if PayPal plan cycles are finite.

Reason:

- defense in depth
- protects against plan misconfiguration
- preserves consistent provider-agnostic EMI semantics

## Scalability Review

This section records explicit design choices for scalability.

### 1. Avoid per-checkout recurring object creation

Do not create a fresh PayPal product or billing plan for every CourseLit checkout.

Why:

- unbounded provider-side object growth
- harder support/debugging
- noisier merchant dashboards
- more API calls and slower checkout initiation

Preferred model:

- one product per tenant
- one monthly plan template per tenant
- one yearly plan template per tenant

### 2. Keep provider object lifecycle tenant-scoped

Each tenant (data model: Domain) must use their own PayPal credentials and template IDs.

Do not share any PayPal product or plan IDs across tenants.

Why:

- avoids cross-tenant data leakage
- simplifies support
- aligns with merchant ownership expectations

### 3. Cache access tokens carefully

PayPal OAuth access tokens should be cached in-memory per app instance with TTL based on provider expiry.

Requirements:

- cache per tenant credential pair
- refresh on expiry
- never persist access tokens to MongoDB

Current-state note:

- CourseLit receives only one set of PayPal credentials from the tenant configuration.
- The application should treat those credentials as the active credentials without introducing app-level awareness of whether they are sandbox or live.
- Any sandbox vs live distinction remains implicit in the credentials provided by the merchant.

### 4. Minimize webhook follow-up calls

Webhook processing should avoid unnecessary PayPal API fetches, but may fetch provider resources when needed for metadata recovery or status verification.

Guideline:

- trust verified webhook payload first
- fetch provider resources only when payload data is incomplete or ambiguous

### 5. Preserve idempotency in invoice handling

Webhook processing must remain safe for retries and duplicate event delivery.

The current invoice flow is already partly idempotent via pending invoice lookup and paid invoice creation logic. PayPal implementation must not weaken this.

## Security Review

This section records required security controls.

### 1. Webhook authenticity

Webhook authenticity verification is out of scope for this PRD.

Current-state note:

- CourseLit does not yet enforce a standardized webhook signature verification baseline across providers.
- PayPal should not add a one-off provider-specific verification mechanism ahead of the planned cross-provider follow-up.
- The existing implementation should continue to treat webhook payloads according to the current application model until that follow-up lands.
- Any later authenticity verification must remain separate from the current `Payment.verify(event)` contract.

### 2. Never trust browser redirects as payment proof

Success redirects from PayPal approval pages are not sufficient proof of payment.

Only webhook events received on the server should:

- mark invoices as paid
- attach provider transaction IDs
- activate memberships

### 3. Secret handling

The following fields are secrets:

- `paypalClientSecret`
- any webhook verification secret material if later introduced

Requirements:

- never expose in GraphQL reads
- never send to client components
- redact from logs

### 4. Tenant isolation

Webhook processing must resolve the correct tenant before provider verification and state mutation.

Requirements:

- maintain domain-based tenant routing
- ensure provider credentials and template IDs come from the resolved tenant only
- never attempt fallback across tenants

### 5. Replay safety

PayPal webhooks may be retried. Duplicate delivery must not create duplicate paid invoices or inconsistent membership state.

Recommended controls:

- store processed event IDs for a bounded retention window, or
- rely on invoice idempotency plus transaction ID uniqueness checks

Preferred direction:

- add event ID dedupe for PayPal webhook events in phase 1 if effort is reasonable
- keep this dedupe logic PayPal-specific in phase 1
- do not expand it into a generic cross-provider payment-webhook dedupe facility as part of this work

### 6. Logging hygiene

Do not log:

- access tokens
- client secrets
- full request bodies containing payer details
- raw provider headers unless explicitly sanitized

Allowed log context:

- domain
- provider event type
- CourseLit invoice ID
- CourseLit membership ID
- PayPal resource ID

## Maintainability Review

This section records choices that reduce long-term cost.

### 1. Keep provider-specific behavior inside provider classes

PayPal-specific initiation, cancellation, verification, and metadata translation should live in `paypal-payment.ts`, not in generic routes.

The generic routes should continue to depend on the `Payment` interface only.

This is a hard requirement for PayPal in phase 1:

- fit PayPal into the current abstraction
- do not reshape the abstraction around PayPal
- do not change the meaning of `Payment.verify(event)` from payload/event validation into cryptographic signature verification

### 2. Do not special-case too much in checkout UI

Frontend behavior should stay minimal:

- initiate on backend
- receive redirect target
- navigate

Avoid embedding heavy provider business logic in React components.

Existing providers should remain behaviorally untouched unless an additive refactor benefits all providers and is independently justified.

### 3. Expand settings model deliberately

Avoid introducing a large number of low-level PayPal knobs in phase 1.

Recommended minimum stable config:

- credentials
- generic product/plan template IDs

Do not add auto-provisioning flows, background synchronization, or provider object management screens in phase 1.

### 4. Preserve provider-agnostic EMI semantics

Even though PayPal supports finite cycles, CourseLit should continue to reason about EMI using its own plan model and invoice counts.

This keeps the business rules understandable and consistent across gateways.

### 5. Add focused tests near existing payment tests

Do not sprawl test coverage into many new files if existing payment tests can be extended.

## Data Model Changes

### Site settings additions

Add to common model, ORM schema, and GraphQL payment settings input:

- `paypalClientId?: string`
- `paypalClientSecret?: string`
- `paypalProductId?: string`
- `paypalMonthlyPlanId?: string`
- `paypalYearlyPlanId?: string`

### Backward compatibility

Keep `paypalSecret` temporarily only if required for migration compatibility.

Recommendation:

- replace legacy `paypalSecret` with explicit `paypalClientSecret`
- no dedicated migration path is required because there are no active users of the legacy PayPal field

## API and Object Lifecycle Strategy

### One-time lifecycle

1. CourseLit creates pending invoice.
2. PayPal Order is created dynamically.
3. Buyer approves payment on PayPal.
4. Webhook event marks invoice paid through the existing server-side payment flow.
5. Membership activates.

### Subscription lifecycle

1. CourseLit chooses monthly or yearly template.
2. CourseLit creates a PayPal subscription approval flow from the template.
3. Buyer approves subscription.
4. Webhook event marks invoice paid through the existing server-side payment flow.
5. Subscription ID is stored on membership.
6. Future billing webhooks create/mark later invoices.

### EMI lifecycle

1. CourseLit chooses monthly template.
2. CourseLit creates subscription approval flow with finite cycles and EMI amount.
3. Buyer approves.
4. Webhook event marks installment invoices paid through the existing server-side payment flow.
5. CourseLit cancels as safeguard after expected count if still active.

## Rollout Plan

### Phase 1: Foundation

- Add settings fields and validation.
- Add PayPal provider implementation.
- Add one-time payment support.
- Add redirect-based frontend flow.
- Reuse the existing webhook-driven payment confirmation flow.

#### Task checklist

- [ ] Add PayPal settings fields to `packages/common-models/src/site-info.ts`.
- [ ] Add PayPal settings fields to `packages/orm-models/src/models/site-info.ts`.
- [ ] Add PayPal settings fields to GraphQL settings types and payment update input.
- [ ] Update payment settings validation to validate PayPal-specific required fields.
- [ ] Ensure PayPal secrets are excluded from settings read responses.
- [ ] Add `apps/web/payments-new/paypal-payment.ts` implementing the existing `Payment` interface.
- [ ] Add OAuth token acquisition and in-memory token caching inside the PayPal provider.
- [ ] Add one-time order creation flow in the PayPal provider.
- [ ] Register PayPal in `apps/web/payments-new/index.ts`.
- [ ] Update payment initiation flow only as needed to support PayPal return data without changing global abstractions.
- [ ] Update checkout UI to redirect buyers to PayPal approval URLs.
- [ ] Extend the shared payment webhook route to accept PayPal events through the current payment-processing model.
- [ ] Add or update tests covering PayPal settings validation.
- [ ] Add or update tests covering one-time PayPal initiation and webhook confirmation.

### Phase 2: Recurring payments

- Add monthly subscription support.
- Add yearly subscription support.
- Add EMI support with finite cycles.
- Add recurring webhook handling and cancellation paths.

#### Task checklist

- [ ] Implement monthly subscription initiation using the stored PayPal monthly plan template.
- [ ] Implement yearly subscription initiation using the stored PayPal yearly plan template.
- [ ] Implement EMI initiation using the monthly plan template plus finite cycle configuration.
- [ ] Ensure subscriptions and EMI attach enough CourseLit metadata for invoice and membership reconciliation.
- [ ] Implement PayPal subscription ID extraction and persistence through the existing membership flow.
- [ ] Implement PayPal subscription cancellation inside the provider.
- [ ] Implement PayPal subscription status validation inside the provider.
- [ ] Extend webhook handling for recurring payment success events.
- [ ] Extend webhook handling for recurring payment failure, cancellation, and expiry events where needed.
- [ ] Ensure EMI completion continues to use CourseLit invoice counting plus cancellation safeguard.
- [ ] Add or update tests covering monthly subscriptions.
- [ ] Add or update tests covering yearly subscriptions.
- [ ] Add or update tests covering EMI flows.
- [ ] Add or update tests covering cancellation and subscription validation behavior.
- [ ] Add duplicate-event or replay-safety coverage for PayPal recurring webhooks.

### Phase 3: Operator ergonomics

- Improve settings UI guidance and validation.
- Add docs and troubleshooting guidance.

#### Task checklist

- [ ] Update admin settings UI labels and help text for PayPal fields.
- [ ] Align the PayPal setup UX with the existing Lemon Squeezy manual-ID pattern.
- [ ] Add inline validation or guidance for generic product ID, monthly plan ID, yearly plan ID, and webhook ID fields.
- [ ] Add troubleshooting guidance for common PayPal misconfiguration cases.
- [ ] Review logs and error messages for operator usefulness without leaking secrets.
- [ ] Review the implementation against this PRD’s security requirements.
- [ ] Review the implementation against this PRD’s scalability requirements.
- [ ] Review the implementation against this PRD’s maintainability requirements.
- [ ] Confirm that no existing payment construct or provider flow was changed solely to accommodate PayPal.
- [ ] Add documentation for PayPal to set-up-payments in both docs and docs-new.

## Testing Plan

### Unit tests

- provider setup validation
- one-time initiation payload formation
- subscription template selection
- EMI template selection and finite cycle payload formation
- metadata extraction
- cancellation behavior
- subscription validation behavior

### Route tests

- payment initiation with PayPal selected
- webhook rejects invalid signature
- webhook accepts valid event and marks invoice paid
- duplicate webhook does not duplicate invoice state transitions

### Settings tests

- invalid PayPal settings fail validation
- valid PayPal settings are accepted
- secrets remain excluded from public settings reads

### Manual staging checks

- one-time purchase completes successfully
- monthly subscription activates successfully
- yearly subscription activates successfully
- EMI completes correct number of installments
- cancellation from CourseLit propagates to PayPal
- failed or duplicate webhook deliveries are harmless

## Acceptance Criteria

1. Tenants can configure PayPal credentials and recurring template IDs from settings.
2. One-time PayPal checkout works with dynamic CourseLit product name and price.
3. Monthly subscriptions work using the monthly recurring template.
4. Yearly subscriptions work using the yearly recurring template.
5. EMI works using monthly recurring billing with finite cycles.
6. Server-side webhook processing, not browser redirects, drives invoice payment and membership activation.
7. PayPal integration does not require one provider-side recurring object per CourseLit product.
8. Secrets are never exposed to public settings queries or client code.
9. Duplicate webhook deliveries do not produce duplicate successful payments.
10. The implementation fits the existing `payments-new` abstraction without broad payment-route rewrites.
11. No existing CourseLit payment construct, provider flow, or global payment abstraction is changed solely to accommodate PayPal.
12. `Payment.verify(event)` remains a provider-specific payload relevance/shape check and is not repurposed into webhook signature verification.

## Risks and Mitigations

- PayPal recurring overrides may be more restrictive than expected:
    - Mitigation: use cadence-specific plan templates and avoid relying on deep plan mutation.
- Merchant setup may be too complex:
    - Mitigation: keep setup aligned with Lemon Squeezy and provide strong admin UI guidance plus step-by-step docs.
- Webhook authenticity is not addressed in this PRD:
    - Mitigation: keep PayPal aligned with the current provider model and handle signature verification in the planned cross-provider follow-up.
- Legacy `paypalSecret` field may cause confusion:
    - Mitigation: deprecate clearly and migrate to explicit credential field names.
- Provider API differences may push branching into UI:
    - Mitigation: keep checkout UI to simple redirect handling only.

## Open Questions

No open questions at this time.
