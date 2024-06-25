// import type { NextApiRequest, NextApiResponse } from "next";

// export default async function Handler(
//     request,
//     response
// ) {
//     const SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

//     if (!SECRET_KEY) {
//         throw new Error("Turnstile: No secret key found");
//     }

//     console.log("secret key from handler", SECRET_KEY)

//     const body = await request.formData();

//     console.log("body", body)
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
