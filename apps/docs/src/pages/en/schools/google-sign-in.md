---
title: Set up Sign in with Google
description: Learn how to let your customers sign in with their Google accounts
layout: ../../../layouts/MainLayout.astro
---

Using Google sign-in, you can let customers authenticate with their Google accounts on your login page and checkout page.

## Steps to set up Google sign-in

1. In the CourseLit dashboard, go to `Settings` -> `Miscellaneous` -> `Login providers`.

    ![Login providers area](/assets/schools/login-providers-area.png)

2. Click on the Cog icon next to the Google provider to open its configuration screen.

3. Keep the `School Settings` card open. You will use these values while creating the Google OAuth app:

    - **Authorized redirect URI**: Usually `https://<school-url>/api/auth/sso/callback/google`
    - **Authorized JavaScript origin**: Usually `https://<school-url>`

4. Open the <a href="https://console.cloud.google.com/auth" target="_blank">Google Cloud Console</a> and create or select the project you want to use.

5. If prompted, configure the OAuth consent screen first:

    - Choose the appropriate user type for your use case.
    - Add the app name, support email, and authorized domain details requested by Google.
    - If your app is in testing mode, add the Google accounts you want to use as test users.

6. In Google Auth Platform, go to `Clients`. Click on `Create client`.

    ![Google Auth app](/assets/schools/google-project-create-client.png)

7. Select `Web application` as the application type.

8. In the OAuth client configuration screen, use the values from CourseLit:

    - Add the `Authorized JavaScript origin` shown in CourseLit.
    - Add the `Authorized redirect URI` shown in CourseLit.

9. Click `Create`, then copy the generated `Client ID` and `Client secret`.

10. Return to CourseLit and paste those values into the `Google App Configuration` card.

11. Click `Save`.

12. Go back to the `Login providers` screen and enable the Google provider.

![CourseLit google login provider](/assets/schools/google-login-checkbox.png)

## Customer's experience

When Google login is configured and enabled, customers will see a `Continue with Google` button anywhere external login providers are shown, such as the login page and checkout page.

![Google login button](/assets/schools/google-login-button.png)

## Before you disable Google sign-in

Disabling the Google provider does not delete the users who previously signed up with Google. Their CourseLit account, purchases, and progress remain intact.

However, they will no longer be able to use `Continue with Google` to access that account. To keep signing in, they need another enabled login method that maps to the same email address, such as email login.

## Troubleshooting

### 1. I get a redirect URI mismatch error

Make sure the `Authorized redirect URI` in Google Cloud Console exactly matches the value shown in CourseLit, including the protocol (`https://`) and the full path.

### 2. I get an origin mismatch error

Make sure the `Authorized JavaScript origin` in Google Cloud Console exactly matches the value shown in CourseLit.

### 3. Only some Google accounts can sign in

If your OAuth app is still in testing mode, Google only allows the accounts listed as test users to sign in. Add the required accounts as test users or publish the app when you are ready.

## Stuck somewhere?

We are always here for you. Come chat with us in our <a href="https://discord.com/invite/GR4bQsN" target="_blank">Discord</a> channel or send a tweet at <a href="https://twitter.com/courselit" target="_blank">@CourseLit</a>.
