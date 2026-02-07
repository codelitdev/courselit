---
title: Set up Single Sign On (SSO)
description: Learn how to set up Single Sign On (SSO)
layout: ../../../layouts/MainLayout.astro
---

Using SSO, you can authenticate users with their existing accounts on platforms like [Okta](https://www.okta.com/), [OneLogin](https://www.onelogin.com/), [Azure AD](https://azure.microsoft.com/en-us/services/active-directory/), etc.

> The feature is currently in alpha, which means you may encounter bugs. Please report them in our <a href="https://discord.com/invite/GR4bQsN" target="_blank">Discord</a> group if you run into any.

To use this feature on [courseLit.app](https://courselit.app), you need to be on the Enterprise plan. For self-hosted instances, this feature is available by default.

## Steps to set up SSO

1. Subscribe to the [Enterprise](https://app.courselit.app/account/billing) plan, if you haven't, to unlock the feature. Ignore this step for self-hosted instances.

2. In the CourseLit dashboard, go to `Settings` -> `Miscellaneous` -> `Login providers`.

    ![Login providers area](/assets/schools/login-providers-area.png)

3. Click on the Cog icon next to the SSO provider to open SSO configuration.

    ![SSO configuration button](/assets/schools/sso-configure-icon.png)

4. In the `SSO Provider` screen, use the `School Settings` to configure your IdP provider. Refer to the sections below to see how to configure your IdP provider.

    The following is a description of the fields under this panel:

    - **SAML ACS URL**: This is the URL that your IdP will send the SAML response to. This is usually `https://<school>.courselit.app/api/auth/sso/saml2/callback/sso`
    - **Audience URI (SP Entity ID)**: This is the URL that your IdP will use to validate the SAML response. This is usually `https://<school>.courselit.app/api/auth/sso/saml2/sp/metadata?providerId=sso`

5. After configuring the IdP provider, obtain the required settings from it and populate the values in the `IDP Configuration` panel.

    The following is a description of the fields under this panel:

    - **Entry point**: This is the URL CourseLit will use to send the SAML request to your IdP.
    - **Certificate**: This is the certificate that your IdP will use to validate the SAML response.
    - **IDP Metadata**: This is the metadata that your IdP will use to validate the SAML response.

    Here is an example configuration for Okta:

    ![Okta SSO Configuration](/assets/schools/sso-idp-configuration-example.png)

6. Click on the `Save` button to save the configuration.

    ![SSO Configuration save button](/assets/schools/sso-save-config-button.png)

7. Go back to the `Login providers` screen and enable the SSO provider.

    ![Enable SSO provider](/assets/schools/sso-enable-checkbox.png)

## Setup IdP

### Okta

1. Go to Okta dashboard and click on `Applications` -> `Applications`.
2. Click on `Create App Integration`.
3. Select `SAML 2.0` on the `Sign-in method` popup and click on `Next`.
4. On the `Create SAML Integration` screen, in the `General Settings` tab, enter `App name` and click on `Next`.
5. In the `Configure SAML` tab, enter the `SAML ACS URL` (obtained from CourseLit) in the `Single sign-on URL` field and `Audience URI (SP Entity ID)` (obtained from CourseLit) in the `Audience URI (SP Entity ID)` field and click on `Next`.
6. In the `Feedback` tab, select the `internal app` option and click on `Finish`.
7. You will be taken to the newly created app's settings. Your Okta IdP is now configured.
8. Next, let's obtain the `Entry point`, `IdP metadata` and `Certificate` from Okta. From the `Sign On` tab, obtain the following:
   <br />
   <br />

    - **Entry point**: We can infer this from the Metadata URL. It is usually `https://<okta-account>.okta.com/app/<okta-app-id>/sso/saml2`

    ![Okta entry point](/assets/schools/idp/okta/entry-point.png)
    <br />
    <br />

    - **IdP metadata** and **Certificate**:
      To obtain these, scroll down on the same page and locate the `SAML Signing Certificates` section. Click on the `Actions` button next to the `SHA-2` and copy the IdP metadata and download the certificate.

    ![Okta IdP metadata](/assets/schools/idp/okta/saml-signing-certificates.png)

9. Enter the values obtained in the `IDP Configuration` panel.
10. The Okta IdP is now configured.

## Customer's experience

When the SSO login provider is configured and enabled, the customer will see a `Login with SSO` button on the login page and checkout page.

### 1. Login page

![SSO login view](/assets/schools/sso-login-view.png)

### 2. Checkout page

![SSO checkout view](/assets/schools/sso-checkout-view.png)

## Troubleshooting

### 1. Email login is disabled and now I am locked out

#### a. Cloud-hosted (courselit.app)

You can re-enable the email provider from the [CourseLit](https://app.courselit.app) dashboard.

![Re-enable email login provider](/assets/schools/reenable-email-login-provider.png)

#### b. Self-hosted

You need to log in to your school's MongoDB instance and run the following query to re-enable the email provider:

```javascript
db.domains.updateMany({}, { $addToSet: { "settings.logins": "email" } });
```

### 2. Can I add multiple SSO providers?

Since this feature is currently in alpha, you can only add one SSO provider at a time. We want to make sure that the feature is stable before adding more providers.

## Stuck somewhere?

We are always here for you. Come chat with us in our <a href="https://discord.com/invite/GR4bQsN" target="_blank">Discord</a> channel or send a tweet at <a href="https://twitter.com/courselit" target="_blank">@CourseLit</a>.
