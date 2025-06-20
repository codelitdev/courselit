import { useCallback, useContext } from "react";
import { ServerConfigContext } from "@components/contexts";

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
        /**
         * Executes the reCAPTCHA challenge.
         *
         * @param {string} action - The action to perform.
         * @returns {Promise<string | null>} A promise that resolves with the reCAPTCHA token, or null if reCAPTCHA is not available or the site key is not set.
         */
        async (action: string): Promise<string | null> => {
            if (!recaptchaSiteKey) {
                console.error(
                    "reCAPTCHA site key not found in ServerConfigContext."
                );
                return null;
            }

            if (
                typeof window !== "undefined" &&
                window.grecaptcha &&
                window.grecaptcha.ready
            ) {
                return new Promise((resolve) => {
                    window.grecaptcha.ready(async () => {
                        if (!recaptchaSiteKey) {
                            // Double check, though already checked above
                            console.error(
                                "reCAPTCHA site key became unavailable before execution."
                            );
                            resolve(null);
                            return;
                        }
                        const token = await window.grecaptcha.execute(
                            recaptchaSiteKey,
                            { action }
                        );
                        resolve(token);
                    });
                });
            } else {
                console.error(
                    "reCAPTCHA (window.grecaptcha) not available. Ensure the script is loaded."
                );
                return null;
            }
        },
        [recaptchaSiteKey] // Dependency array includes recaptchaSiteKey
    );

    return { executeRecaptcha };
};
