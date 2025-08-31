"use client";

import { useContext } from "react";
import Script from "next/script";
import { ServerConfigContext } from "@components/contexts";

const RecaptchaScriptLoader = () => {
    const { recaptchaSiteKey } = useContext(ServerConfigContext);

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
