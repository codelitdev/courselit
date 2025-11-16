import { useCallback, useContext } from "react";
import { ServerConfigContext } from "@components/contexts";

declare global {
    interface Window {
        grecaptcha?: {
            ready(callback: () => void): void;
            execute(
                siteKey: string,
                options: { action: string },
            ): Promise<string>;
        };
    }
}

/**
 * Custom hook for Google reCAPTCHA v3.
 * It uses ServerConfigContext to get the reCAPTCHA site key.
 *
 * @returns {object} An object containing the `executeRecaptcha` function.
 */
export const useRecaptcha = () => {
    const serverConfig = useContext(ServerConfigContext);
    const recaptchaSiteKey = serverConfig?.recaptchaSiteKey;

    const executeRecaptcha = useCallback(
        async (action: string): Promise<string | null> => {
            if (!recaptchaSiteKey) {
                console.error(
                    "reCAPTCHA site key not found in ServerConfigContext.",
                );
                return null;
            }

            if (typeof window !== "undefined") {
                const grecaptcha = window.grecaptcha;
                if (grecaptcha && grecaptcha.ready) {
                    return new Promise((resolve) => {
                        grecaptcha.ready(async () => {
                            if (!recaptchaSiteKey) {
                                // Double check, though already checked above
                                console.error(
                                    "reCAPTCHA site key became unavailable before execution.",
                                );
                                resolve(null);
                                return;
                            }
                            const token = await grecaptcha.execute(
                                recaptchaSiteKey,
                                { action },
                            );
                            resolve(token);
                        });
                    });
                }
            }

            console.error(
                "reCAPTCHA (window.grecaptcha) not available. Ensure the script is loaded.",
            );
            return null;
        },
        [recaptchaSiteKey], // Dependency array includes recaptchaSiteKey
    );

    return { executeRecaptcha };
};
