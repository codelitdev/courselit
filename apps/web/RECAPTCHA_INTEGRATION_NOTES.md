# Google reCAPTCHA v3 Integration Notes

## 1. Overview

This document outlines the integration of Google reCAPTCHA v3 into the web application. reCAPTCHA v3 works by returning a score for each request without user friction. This score can be used to take appropriate action, such as requiring additional verification steps or blocking suspected bot traffic. It helps protect user actions like form submissions from abuse.

## 2. Environment Variables

The following environment variables are required for the reCAPTCHA integration to function correctly:

-   `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`: This is the client-side site key obtained from the Google reCAPTCHA Admin Console. It's prefixed with `NEXT_PUBLIC_` because it needs to be accessible in the browser.
-   `RECAPTCHA_SECRET_KEY`: This is the server-side secret key obtained from the Google reCAPTCHA Admin Console. **This key must be kept confidential and should only be used on the server.**

Ensure these variables are set in your local development environment (e.g., in an `.env.local` file at the root of the `apps/web` project) and in your deployment environments.

## 3. How it Works

The integration consists of three main parts:

### a. Client-side Script Loading (`app/layout.tsx`)

-   The root layout file (`apps/web/app/layout.tsx`) includes a Next.js `Script` component to load the Google reCAPTCHA API script.
-   The script source URL includes the `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`.
-   The script is loaded only if `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is present, preventing errors if the key is not configured.
-   The `strategy="afterInteractive"` attribute is used to load the script after the page becomes interactive, minimizing impact on initial page load performance.

### b. `useRecaptcha` Hook (`hooks/use-recaptcha.ts`)

-   The custom React hook `useRecaptcha` (located in `apps/web/hooks/use-recaptcha.ts`) provides a convenient way to trigger reCAPTCHA verification.
-   It exports an `executeRecaptcha` function that takes an `action` string as an argument. This `action` helps you identify which part of your site is being protected when viewing results in the Google reCAPTCHA Admin Console.
-   When called, `executeRecaptcha`:
    1.  Checks if `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is available. If not, it logs an error and returns `null`.
    2.  Checks if `window.grecaptcha` and `window.grecaptcha.ready` are available (i.e., if the Google script has loaded).
    3.  Calls `window.grecaptcha.ready()` to ensure the API is ready.
    4.  Calls `window.grecaptcha.execute()` with the site key and the provided `action` to get a reCAPTCHA token.
    5.  Returns a Promise that resolves with the token, or `null` if an error occurs.
-   The `executeRecaptcha` function is wrapped in `useCallback` for performance optimization.

### c. `/api/recaptcha` Server-side Endpoint (`app/api/recaptcha/route.ts`)

-   This API route (located at `apps/web/app/api/recaptcha/route.ts`) handles the server-side verification of the reCAPTCHA token.
-   It expects a `POST` request with a JSON body containing the `token` received from the client-side.
-   **Verification Steps**:
    1.  Retrieves the `RECAPTCHA_SECRET_KEY` from server environment variables. Returns a 500 error if not set.
    2.  Checks if the `token` is present in the request body. Returns a 400 error if not.
    3.  Makes a `POST` request to Google's `https://www.google.com/recaptcha/api/siteverify` endpoint.
    4.  The request to Google includes the `secret` (your `RECAPTCHA_SECRET_KEY`) and `response` (the client's `token`).
    5.  Parses the JSON response from Google.
    6.  Returns relevant information from Google's response to the client, including `success`, `score`, `action`, `challenge_ts`, `hostname`, and `error-codes`.
-   Includes error handling for the fetch request to Google and other potential issues.

## 4. Using the `recaptcha-example-form.tsx`

-   An example component `RecaptchaExampleForm` (located in `apps/web/components/recaptcha-example-form.tsx`) demonstrates the end-to-end reCAPTCHA flow.
-   It renders a simple form. On submission:
    1.  It calls `executeRecaptcha` from the `useRecaptcha` hook.
    2.  If a token is received, it sends this token to the `/api/recaptcha` endpoint.
    3.  It then logs the verification response from the API and displays a status message to the user, indicating whether the action would be allowed based on the `success` status and `score` (e.g., score > 0.5).
-   **To test the integration**: Temporarily import and render this component on any page within the `apps/web` application.

## 5. Testing Steps

1.  **Set Environment Variables**:
    *   Ensure `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` and `RECAPTCHA_SECRET_KEY` are correctly set in your local environment (e.g., in an `.env.local` file at the root of `apps/web`). Use valid keys from your Google reCAPTCHA admin console for a specific domain (localhost can be registered for testing).

2.  **Render the Example Form**:
    *   Modify an existing page (e.g., the homepage) in `apps/web` to import and render the `RecaptchaExampleForm` component.
    ```tsx
    // Example: in apps/web/app/page.tsx
    import { RecaptchaExampleForm } from "@/components/recaptcha-example-form";

    export default function HomePage() {
        return (
            <div>
                {/* ... other page content ... */}
                <RecaptchaExampleForm />
            </div>
        );
    }
    ```

3.  **Open Browser Developer Tools**:
    *   Access the page where `RecaptchaExampleForm` is rendered.
    *   Open your browser's developer tools (usually by pressing F12).

4.  **Monitor Console**:
    *   Check the **Console** tab for logs:
        *   From `useRecaptcha` if the site key is missing or reCAPTCHA isn't ready.
        *   From `RecaptchaExampleForm` showing the token received (if any), the call to `/api/recaptcha`, the verification response, and status messages.

5.  **Check Network Tab**:
    *   Switch to the **Network** tab in developer tools.
    *   Submit the example form.
    *   Look for the `POST` request to `/api/recaptcha`. Inspect its payload (the token) and response (Google's verification result).
    *   Note: The call to Google's `siteverify` endpoint happens server-to-server, so you won't see it directly in the browser's network tab, but its outcome is returned by your `/api/recaptcha` endpoint.

6.  **Google reCAPTCHA Admin Console (Post-Deployment)**:
    *   After deploying the application to a staging or test environment with valid production/test reCAPTCHA keys:
        *   Visit your Google reCAPTCHA Admin Console.
        *   Select the site key you configured.
        *   You should see traffic data, including the number of requests, scores, and the distribution of actions (e.g., 'example_form_submit'). This helps verify that reCAPTCHA is actively processing requests for your site.

7.  **Test Missing Keys**:
    *   Temporarily unset or comment out `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` in your `.env.local` and restart the development server. The reCAPTCHA script should not load, and `executeRecaptcha` should return `null` or handle it gracefully.
    *   Temporarily unset `RECAPTCHA_SECRET_KEY`. The `/api/recaptcha` endpoint should return a 500 error, which the example form should handle.

By following these steps, you can thoroughly test the reCAPTCHA v3 integration. Remember to remove the `RecaptchaExampleForm` from any public pages after testing.
