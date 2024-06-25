const SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || "0x4AAAAAAAdHFII6KkgUYFI3U_OYvthTkUw";

export default async function validateTurnstileToken(token: string) {
    console.log("SECRET_KEY", SECRET_KEY)

    if (!SECRET_KEY) {
        throw new Error("Turnstile: No secret key found");
    }

    // console.log("validateTurnstileToken token", token);
    // console.log("validateTurnstileToken SECRET_KEY", SECRET_KEY);

    let formData = new FormData();
    formData.append("secret", SECRET_KEY || "");
    formData.append("response", token || "");

    const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    const result = await fetch(url, {
        body: formData,
        method: "POST",
    });

    const outcome = await result.json();
    console.log("outcome", outcome)
    if (outcome.success) {
        return true;
    }
    if (
        outcome["error-codes"] &&
        outcome["error-codes"][0] === "timeout-or-duplicate"
    ) {
        return true;
    }

    // console.log(`Turnstile validation failed`, outcome);
    return false;
}

// export default async function validateTurnstileToken(request) {
//     if (!SECRET_KEY) {
//         throw new Error("Turnstile: No secret key found");
//     }

//     const body = await request.formData();
//     // Turnstile injects a token in "cf-turnstile-response".
//     const token = body.get("cf-turnstile-response");
//     const ip = request.headers.get("CF-Connecting-IP");

//     let formData = new FormData();
//     formData.append("secret", SECRET_KEY || "");
//     formData.append("response", token || "");
//     formData.append("remoteip", ip || "");

//     const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
//     const result = await fetch(url, {
//         body: formData,
//         method: "POST",
//     });

//     const outcome = await result.json();
//     if (outcome.success) {
//         return true;
//     }
//     if (
//         outcome["error-codes"] &&
//         outcome["error-codes"][0] === "timeout-or-duplicate"
//     ) {
//         return true;
//     }

//     console.log(`Turnstile validation failed`, outcome);
//     return false;
// }

// async function handlePost(request) {
//     const body = await request.formData();
//     // Turnstile injects a token in "cf-turnstile-response".
//     const token = body.get('cf-turnstile-response');
//     const ip = request.headers.get('CF-Connecting-IP');

//     // Validate the token by calling the "/siteverify" API.
//     let formData = new FormData();
//     formData.append('secret', SECRET_KEY);
//     formData.append('response', token);
//     formData.append('remoteip', ip);

//     const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
//         body: formData,
//         method: 'POST',
//     });

//     const outcome = await result.json();
//     if (!outcome.success) {
//         return new Response('The provided Turnstile token was not valid! \n' + JSON.stringify(outcome));
//     }
//     // The Turnstile token was successfuly validated. Proceed with your application logic.
//     // Validate login, redirect user, etc.
//     // For this demo, we just echo the "/siteverify" response:
//     return new Response('Turnstile token successfuly validated. \n' + JSON.stringify(outcome));
// }
