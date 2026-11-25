---
title: Single sign-on (SSO)
description: Prepare a self-hosted deployment for SAML single sign-on, then connect a school to an identity provider such as Okta, Entra ID, Google Workspace or Keycloak so its learners sign in with their work accounts.
nav_order: 50
---

Single sign-on (SSO) lets the learners of a school sign in to the school's website with an account from the school's own identity provider (IdP), such as Okta, Microsoft Entra ID, Google Workspace or Keycloak. Each school sets up its own connection. CourseLit uses SAML 2.0.

SSO is for learners only. Team members always sign in to the admin with an email code or Google, and an account that signs in with SSO never gets team access.

This page covers what the deployment needs, then the setup a school owner does in the admin.

## Prepare the deployment

### Turn on the self-hosted plan mode

Set `BILLING_MODE` to `oss` on the API and the worker. In this mode every school can use SSO. With `cloud`, SSO needs a paid plan that includes it.

### Use a stable, public API address

The addresses that a school gives its identity provider are built from `PUBLIC_API_URL`:

| Address | Value |
| --- | --- |
| ACS URL | `PUBLIC_API_URL` followed by `/learner-login/sso/` and the connection ID, then `/acs` |
| Entity ID and metadata URL | `PUBLIC_API_URL` followed by `/learner-login/sso/` and the connection ID, then `/metadata` |

The learner's browser carries the sign-in from the identity provider to the ACS URL, so the API hostname must be reachable from the learners' browsers over `https`. See [Domains and reverse proxy](/docs/self-hosting/domains-and-proxy).

<Callout type="warning" title="Changing PUBLIC_API_URL breaks existing connections">

Every identity provider stores the old addresses. If you change `PUBLIC_API_URL`, each school has to update the ACS URL and entity ID in its identity provider before its learners can sign in again.

</Callout>

### Let the proxy pass sign-in responses

Route `/learner-login/sso/` on the API hostname to the API like any other API path. The identity provider posts a signed form to the ACS URL. The API accepts form bodies of up to 256 KB there, so make sure your proxy allows a body of at least that size.

### Run the worker

The worker runs the SSO background tasks:

- It cleans up expired sign-in requests.
- It checks each verified domain's DNS record about once a week.
- It applies plan changes to connections.

Without it, domain checks never run.

### Keep the clocks right

Sign-in responses are valid only for a short time. Run NTP or another time sync on the API hosts, and make sure the identity provider's clock is right too. A wrong clock makes every sign-in fail with `expired` or `not_yet_valid`.

### Allow DNS lookups

To verify that a school owns an email domain, the API looks up a DNS TXT record. The API host needs to be able to resolve public DNS names.

## Set up a connection for a school

The school's owner does this in the admin. It can't be done with an API key or an AI assistant. The admin asks the owner to sign in again before saving changes if their last sign-in wasn't recent.

<Steps>

<Step>

### Create the connection

In the admin, open **Settings**, then **Login providers**. Under **Single sign-on (SSO)**, select **Set up**.

Enter a **Button label**, which learners see as "Sign in with" followed by the label. Paste the identity provider's metadata XML, or enter its entity ID, then select **Create**.

The provider's entity ID can't be changed later. To move to a different provider, create a new connection.

</Step>

<Step>

### Register CourseLit in the identity provider

Section **1. Give these to your identity provider** shows the ACS URL, the entity ID and the metadata URL. Create a SAML app in the identity provider and enter them. The fields have different names in each product:

| CourseLit | Okta | Microsoft Entra ID | Google Workspace | Keycloak |
| --- | --- | --- | --- | --- |
| ACS URL | Single sign-on URL | Reply URL | ACS URL | Assertion Consumer Service POST Binding URL, and a valid redirect URI |
| Entity ID | Audience URI (SP Entity ID) | Identifier (Entity ID) | Entity ID | Client ID |

If you didn't paste the metadata in the first step, fill in **2. Your identity provider's settings**: the provider's sign-in URL (it must start with `https://`) and its signing certificate.

To rotate a certificate, add the new one next to the old one. Saving puts the connection back to draft, like any change to these settings (see [Change or turn off a connection](#change-or-turn-off-a-connection)). Run a test sign-in and turn it on again. Remove the old certificate after the provider has switched to the new one.

</Step>

<Step>

### Configure what the identity provider sends

CourseLit accepts a sign-in only when the identity provider:

- **Signs the assertion.** A signature on the outer response alone is refused. In Keycloak, turn on **Sign assertions**.
- **Signs with RSA-SHA256 or stronger.** SHA-1 signatures are refused.
- **Sends a persistent NameID.** It identifies the person and must never change or be reused. If the provider can't send one, put the name of an attribute with such a value in **Subject attribute (optional)**. Don't use the email address for this.
- **Sends the email address** in an attribute named `email`, `mail` or `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress`.

The name is optional. CourseLit reads `displayName` or `name`, or combines `givenName` (or `firstName`) with `surname` (or `sn`, `lastName`).

Sign-in always starts from the school's website. Sign-ins started from the identity provider's own app dashboard are refused.

</Step>

<Step>

### Verify the email domains

Only learners whose email address is on a verified domain can sign in with SSO. Under **3. Domains**, add each domain, such as `example.com`. Add the TXT record that the admin shows, then select **Verify**.

| Type | Name | Value |
| --- | --- | --- |
| TXT | `_courselit-verification.` followed by the domain | The token shown in the admin |

This record name is fixed. `CUSTOM_DOMAIN_TXT_RECORD_NAME` applies only to custom website domains.

DNS changes can take a while to show up. Keep the record in place: the worker checks it about once a week. After three failed checks in a row the domain is no longer verified, and the owner gets an email. Until the domain is verified again, new learners from it can't sign in with SSO, and SSO isn't required for it.

</Step>

<Step>

### Run a test sign-in

Under **4. Test the connection**, select **Test connection**, and sign in at the identity provider with an account on a verified domain. A test signs nobody in to the school. The admin then shows what the provider sent: the provider, the subject, the email, the name and whether the email is on a verified domain.

If the test fails, the admin shows a reason code and what to change. See [Fix sign-in failures](#fix-sign-in-failures).

</Step>

<Step>

### Choose who has to use SSO

Under **5. Who has to use SSO**:

- **Require SSO for these domains**: learners with an email address on a verified domain can then only sign in with SSO. Learners from those domains who are signed in another way are signed out. Learners with other email addresses keep using email codes or Google.
- **Longest session (minutes)**: how long an SSO sign-in lasts before the learner has to sign in again. Leave it empty to use the school default. A shorter session limit from the identity provider also applies.

</Step>

<Step>

### Turn it on

Under **6. Turn it on**, select **Turn on**. The admin lists anything still missing, such as a verified domain or a test with the current settings. Learners then see the SSO button on the school's sign-in page, next to the other sign-in methods that are turned on under **Login providers**.

</Step>

</Steps>

## How learners sign in with SSO

On the school's sign-in page, a learner selects **Sign in with** followed by the button label. After they sign in at the identity provider, they return to the page they came from.

The first time a learner signs in, CourseLit links their identity provider account to the school's learner record for that email address, or creates one. Later sign-ins use that link, even if the email address changes at the identity provider.

When SSO is required for a learner's domain and the learner asks for an email code, the sign-in page tells them to use the SSO button instead.

## Change or turn off a connection

- **Changing the sign-in URL, the certificates or the subject attribute** puts the connection back to draft and signs out every learner who signed in with SSO. Test it again, then turn it on.
- **Turning a connection off** signs out every learner who signed in with SSO, at once. It can be turned on again without a new test as long as its settings haven't changed.
- **Deleting a connection** removes its domains and the links between learners and their identity provider accounts. The learners themselves stay in the school, and can sign in with the other methods.

## Fix sign-in failures

Learners see one general message when SSO fails. The reason code appears in the result of a test sign-in in the admin.

| Reason | What to check |
| --- | --- |
| `status_not_success` | The identity provider refused the sign-in. Usually the person isn't assigned to the app in the identity provider. |
| `signature_invalid` | The identity provider must sign the assertion, not only the response, with one of the certificates saved in the connection. After a certificate rotation, add the new certificate. |
| `weak_algorithm` | Set the identity provider's signature algorithm to RSA-SHA256. |
| `wrong_audience` | The identity provider's entity ID or audience must be the connection's entity ID. |
| `wrong_recipient`, `wrong_destination` | The identity provider's ACS URL must be the connection's ACS URL. Check `PUBLIC_API_URL`. |
| `wrong_issuer` | The response came from a different identity provider than the one the connection was created for. |
| `missing_subject` | The identity provider sent no NameID, or the subject attribute is missing. |
| `unstable_subject` | The NameID isn't in the persistent format. Set the NameID format to persistent, or set a subject attribute. |
| `expired`, `not_yet_valid` | The clock of the API host or the identity provider is wrong. |
| `request_not_found`, `request_already_used`, `replayed_assertion` | The sign-in was started too long ago, or was already completed. Start again from the school's website. |
