// import nc from "next-connect";
import { NextApiRequest, NextApiResponse } from "next";
// import { error } from "../../../../services/logger";
// import connectDb from "../../../../middlewares/connect-db";
// import verifyDomain from "../../../../middlewares/verify-domain";
import { responses } from "../../../../config/strings";
import { generateUniquePasscode, hashCode } from "../../../../ui-lib/utils";
import VerificationToken from "../../../../models/VerificationToken";
import pug from "pug";
// import ApiRequest from "../../../../models/ApiRequest";
import MagicCodeEmailTemplate from "../../../../templates/magic-code-email";
import { send } from "../../../../services/mail";
import DomainModel, { Domain } from "@models/Domain";

// export default nc<NextApiRequest, NextApiResponse>({
//     onError: (err, req, res, next) => {
//         error(err.message, {
//             fileName: `/api/auth/code/generate.ts`,
//             stack: err.stack,
//         });
//         res.status(500).json({ error: err.message });
//     },
//     onNoMatch: (req, res) => {
//         res.status(404).end("Page is not found");
//     },
// })
//     .use(connectDb)
//     .use(verifyDomain)
//     .get(async (req: ApiRequest, res: NextApiResponse) => {
//         const { email } = req.query;
//         if (!email) {
//             return;
//         }
//         const code = generateUniquePasscode();

//         await VerificationToken.create({
//             domain: domain.name,
//             email,
//             code: hashCode(code),
//             timestamp: Date.now() + 1000 * 60 * 5,
//         });

//         try {
//             const emailBody = pug.render(MagicCodeEmailTemplate, { code });
//             await send({
//                 to: [<string>email],
//                 subject: `${responses.sign_in_mail_prefix} ${req.headers["host"]}`,
//                 body: emailBody,
//             });
//         } catch (err: any) {
//             res.status(500).json({
//                 error: err.message,
//             });
//         }

//         res.status(200).json({});
//     });

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Not allowed" });
    }

    const domain = await DomainModel.findOne<Domain>({
        name: req.headers.domain,
    });
    if (!domain) {
        return res.status(404).json({ message: "Domain not found" });
    }

    const { email } = req.query;
    if (!email) {
        return;
    }
    const code = generateUniquePasscode();

    await VerificationToken.create({
        domain: domain.name,
        email,
        code: hashCode(code),
        timestamp: Date.now() + 1000 * 60 * 5,
    });

    try {
        const emailBody = pug.render(MagicCodeEmailTemplate, { code });
        await send({
            to: [<string>email],
            subject: `${responses.sign_in_mail_prefix} ${req.headers["host"]}`,
            body: emailBody,
        });
    } catch (err: any) {
        res.status(500).json({
            error: err.message,
        });
    }

    res.status(200).json({});
}
