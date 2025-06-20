"use client";

import { useContext } from "react";
import Script from "next/script";
import { ServerConfigContext } from "@components/contexts";

/**
 * RecaptchaScriptLoader component.
 * This client component loads the Google reCAPTCHA v3 script if the site key is available in ServerConfigContext.
 */
const RecaptchaScriptLoader = () => {
    const { config } = useContext(ServerConfigContext);
    const recaptchaSiteKey = config?.recaptchaSiteKey;

    if (recaptchaSiteKey) {
        return (
            <Script
                src={`https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`}
                strategy="afterInteractive"
                async
                defer
            />
        );
    }

    return null;
};

export default RecaptchaScriptLoader;
