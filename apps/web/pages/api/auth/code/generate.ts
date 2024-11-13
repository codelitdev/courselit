import { NextApiRequest, NextApiResponse } from "next";
import { responses } from "../../../../config/strings";
import { generateUniquePasscode, hashCode } from "../../../../ui-lib/utils";
import VerificationToken from "../../../../models/VerificationToken";
import pug from "pug";
import MagicCodeEmailTemplate from "../../../../templates/magic-code-email";
import { send } from "../../../../services/mail";
import DomainModel, { Domain } from "@models/Domain";
import { generateEmailFrom } from "@/lib/utils";

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

    const sanitizedEmail = (email as string).toLowerCase();

    await VerificationToken.create({
        domain: domain.name,
        email: sanitizedEmail,
        code: hashCode(code),
        timestamp: Date.now() + 1000 * 60 * 5,
    });

    try {
        const emailBody = pug.render(MagicCodeEmailTemplate, {
            code,
            hideCourseLitBranding: domain.settings?.hideCourseLitBranding,
        });

        await send({
            to: [sanitizedEmail],
            subject: `${responses.sign_in_mail_prefix} ${req.headers["host"]}`,
            body: emailBody,
            from: generateEmailFrom({
                name: domain?.settings?.title || domain.name,
                email: process.env.EMAIL_FROM || domain.email,
            }),
        });
    } catch (err: any) {
        res.status(500).json({
            error: err.message,
        });
    }

    res.status(200).json({});
}
