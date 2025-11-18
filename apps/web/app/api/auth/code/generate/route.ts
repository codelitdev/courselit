import { NextRequest } from "next/server";
import { responses } from "@/config/strings";
import { generateUniquePasscode, hashCode } from "@/lib/utils";
import VerificationToken from "@/models/VerificationToken";
import pug from "pug";
import MagicCodeEmailTemplate from "@/templates/magic-code-email";
import DomainModel, { Domain } from "@models/Domain";
import { generateEmailFrom } from "@/lib/utils";
import { addMailJob } from "@/services/queue";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const domain = await DomainModel.findOne<Domain>({
        name: req.headers.get("domain"),
    });
    if (!domain) {
        return Response.json({ message: "Domain not found" }, { status: 404 });
    }

    const searchParams = req.nextUrl.searchParams;
    const email = searchParams.get("email");
    if (!email) {
        return Response.json({ message: "Email is required" }, { status: 400 });
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

        await addMailJob({
            to: [sanitizedEmail],
            subject: `${responses.sign_in_mail_prefix} ${req.headers.get("host")}`,
            body: emailBody,
            from: generateEmailFrom({
                name: domain?.settings?.title || domain.name,
                email: process.env.EMAIL_FROM || domain.email,
            }),
        });
    } catch (err: any) {
        return Response.json(
            {
                error: err.message,
            },
            { status: 500 },
        );
    }

    return Response.json({});
}
