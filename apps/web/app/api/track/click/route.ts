import { NextRequest, NextResponse } from "next/server";
import DomainModel, { Domain } from "@courselit/orm-models/dao/domain";
import EmailEventModel from "@courselit/orm-models/dao/email-event";
import UserModel from "@courselit/orm-models/dao/user";
import SequenceModel from "@courselit/orm-models/dao/sequence";
import { Constants, Sequence, User } from "@courselit/common-models";
import { error } from "@/services/logger";
import { jwtUtils } from "@courselit/utils";

export const dynamic = "force-dynamic";

function getJwtSecret(): string {
    const jwtSecret = process.env.PIXEL_SIGNING_SECRET;
    if (!jwtSecret) {
        throw new Error("PIXEL_SIGNING_SECRET is not defined");
    }
    return jwtSecret;
}

export async function GET(req: NextRequest) {
    if (!process.env.PIXEL_SIGNING_SECRET) {
        error(
            "PIXEL_SIGNING_SECRET environment variable is not defined. No click tracking is done.",
        );
        return NextResponse.redirect(new URL("/", req.url));
    }

    try {
        const domainName = req.headers.get("domain");
        const domain = await DomainModel.queryOne<Domain>({
            name: domainName,
        });
        if (!domain) {
            error(`Domain not found: ${domainName}`);
            return NextResponse.redirect(new URL("/", req.url));
        }

        const { searchParams } = new URL(req.url);
        const d = searchParams.get("d");
        if (!d) {
            error("Missing data query parameter");
            return NextResponse.redirect(new URL("/", req.url));
        }

        const jwtSecret = getJwtSecret();
        const payload = jwtUtils.verifyToken(d, jwtSecret);
        const { userId, sequenceId, emailId, link, index } = payload as any;

        if (!userId || !sequenceId || !emailId || !link) {
            error(`Invalid payload: Not all required fields are present`, {
                payload,
            });
            return NextResponse.redirect(new URL("/", req.url));
        }

        const sequence = await SequenceModel.queryOne<Sequence>({
            domain: domain._id,
            sequenceId,
        });
        const user = await UserModel.queryOne<User>({
            domain: domain._id,
            userId,
        });
        const email = sequence?.emails.find((e) => e.emailId === emailId);

        if (sequence && user && email) {
            await EmailEventModel.createOne({
                domain: domain._id,
                sequenceId,
                userId,
                emailId,
                action: Constants.EmailEventAction.CLICK,
                link,
                linkIndex: index,
            });
        }

        // Redirect to the original URL
        const decodedUrl = decodeURIComponent(link);
        return NextResponse.redirect(decodedUrl);
    } catch (err) {
        error(`Invalid click data`, {
            fileName: "click.route.ts",
            stack: err.stack,
        });
        // Always redirect to home page on error
        return NextResponse.redirect(new URL("/", req.url));
    }
}
