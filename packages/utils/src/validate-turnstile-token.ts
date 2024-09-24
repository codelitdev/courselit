const SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

export default async function validateTurnstileToken(token: string) {
    if (!SECRET_KEY) {
        throw new Error("Turnstile: No secret key found");
    }

    const formData = new FormData();
    formData.append("secret", SECRET_KEY || "");
    formData.append("response", token || "");

    const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    const result = await fetch(url, {
        body: formData,
        method: "POST",
    });

    const outcome = await result.json();
    if (outcome.success) {
        return true;
    }
    if (
        outcome["error-codes"] &&
        outcome["error-codes"][0] === "timeout-or-duplicate"
    ) {
        return true;
    }
    // eslint-disable-next-line no-console
    console.log(`Turnstile validation failed`, outcome);
    return false;
}
