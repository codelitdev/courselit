"use client";

import { FormEvent, useState } from "react";
import { useRecaptcha } from "../hooks/use-recaptcha";

/**
 * An example form component to demonstrate reCAPTCHA integration.
 */
export const RecaptchaExampleForm = () => {
    const { executeRecaptcha } = useRecaptcha();
    const [statusMessage, setStatusMessage] = useState<string>(""); // For displaying messages to the user
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // To disable button during submission

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault(); // Prevent default browser form submission
        setIsSubmitting(true);
        setStatusMessage("Verifying...");

        // Ensure the executeRecaptcha function is available from the hook
        if (!executeRecaptcha) {
            setStatusMessage("reCAPTCHA hook not available. Cannot proceed.");
            setIsSubmitting(false);
            return;
        }

        // Execute reCAPTCHA challenge for the specified action
        const token = await executeRecaptcha("example_form_submit");

        if (token) {
            // Token received, now verify it with the backend API
            try {
                const response = await fetch("/api/recaptcha", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ token }),
                });

                const data = await response.json();
                console.log("Verification response from /api/recaptcha:", data);

                if (response.ok && data.success) {
                    // Verification was successful according to Google
                    // Adjust score threshold as needed (Google recommends 0.5 as a general starting point)
                    if (data.score && data.score > 0.5) {
                        setStatusMessage(
                            `Verification successful! Score: ${data.score}. Form submitted (simulated).`
                        );
                        // Here you would typically proceed with the actual form submission logic
                        // For example, sending form data to your main backend.
                        console.log(
                            "Simulating successful form submission with reCAPTCHA data:",
                            data
                        );
                    } else {
                        // Score is too low, treat as suspicious
                        setStatusMessage(
                            `Verification successful but score too low: ${data.score}. Action blocked.`
                        );
                        console.warn("Low reCAPTCHA score, potential bot:", data);
                    }
                } else {
                    // Verification API call was ok, but Google indicated failure or an issue
                    setStatusMessage(
                        `Verification failed: ${
                            data.error || "Unknown server error"
                        } ${
                            data["error-codes"]
                                ? `(Error codes: ${data["error-codes"].join(", ")})`
                                : ""
                        }`
                    );
                }
            } catch (error) {
                // Network error or other issue calling the /api/recaptcha endpoint
                console.error("Error submitting token to /api/recaptcha:", error);
                setStatusMessage(
                    "An error occurred during verification. Please try again."
                );
            }
        } else {
            // executeRecaptcha did not return a token
            setStatusMessage("Failed to obtain reCAPTCHA token. Please ensure reCAPTCHA is loaded and try again.");
        }
        setIsSubmitting(false); // Re-enable submission button
    };

    return (
        <div>
            <h2>reCAPTCHA Example Form</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="name">Name:</label>
                    <input type="text" id="name" name="name" required />
                </div>
                <div>
                    <label htmlFor="email">Email:</label>
                    <input type="email" id="email" name="email" required />
                </div>
                <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit"}
                </button>
            </form>
            {statusMessage && <p>{statusMessage}</p>}
        </div>
    );
};
