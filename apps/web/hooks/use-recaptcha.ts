import { useCallback } from "react";

/**
 * Custom hook for Google reCAPTCHA v3.
 *
 * @returns {object} An object containing the `executeRecaptcha` function.
 */
export const useRecaptcha = () => {
    const executeRecaptcha = useCallback(
        /**
         * Executes the reCAPTCHA challenge.
         *
         * @param {string} action - The action to perform.
         * @returns {Promise<string | null>} A promise that resolves with the reCAPTCHA token, or null if reCAPTCHA is not available or the site key is not set.
         */
        async (action: string): Promise<string | null> => {
            if (!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
                console.error("reCAPTCHA site key not found.");
                return null;
            }

            if (
                typeof window !== "undefined" &&
                window.grecaptcha &&
                window.grecaptcha.ready
            ) {
                return new Promise((resolve) => {
                    window.grecaptcha.ready(async () => {
                        const token = await window.grecaptcha.execute(
                            process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!,
                            { action }
                        );
                        resolve(token);
                    });
                });
            } else {
                console.error("reCAPTCHA not available.");
                return null;
            }
        },
        []
    );

    return { executeRecaptcha };
};
