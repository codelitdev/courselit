import { NextRequest, NextResponse } from "next/server";
import DomainModel, { Domain } from "@models/Domain";
import EmailEventModel from "@models/EmailEvent";
import UserModel from "@models/User";
import SequenceModel from "@models/Sequence";
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

// 1x1 transparent PNG buffer
const pixelBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBApUe1ZkAAAAASUVORK5CYII=",
    "base64",
);

const pixelArrayBuffer = pixelBuffer.buffer.slice(
    pixelBuffer.byteOffset,
    pixelBuffer.byteOffset + pixelBuffer.byteLength,
) as ArrayBuffer;

const pixelResponse = new NextResponse(pixelArrayBuffer, {
    status: 200,
    headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
    },
});

export async function GET(req: NextRequest) {
    if (!process.env.PIXEL_SIGNING_SECRET) {
        error(
            "PIXEL_SIGNING_SECRET environment variable is not defined. No pixel tracking is done.",
        );
        return pixelResponse;
    }

    try {
        const domainName = req.headers.get("domain");
        const domain = await DomainModel.findOne<Domain>({
            name: domainName,
        });
        if (!domain) {
            throw new Error(`Domain not found: ${domainName}`);
        }

        const { searchParams } = new URL(req.url);
        const d = searchParams.get("d");
        if (!d) {
            throw new Error("Missing data query parameter");
        }

        const jwtSecret = getJwtSecret();
        const payload = jwtUtils.verifyToken(d, jwtSecret);
        const { userId, sequenceId, emailId } = payload as any;
        if (!userId || !sequenceId || !emailId) {
            throw new Error(
                `Invalid payload: Not all required fields are present: ${JSON.stringify(payload)}`,
            );
        }

        const sequence = await SequenceModel.findOne<Sequence>({
            domain: domain._id,
            sequenceId,
        });
        const user = await UserModel.findOne<User>({
            domain: domain._id,
            userId,
        });
        const email = sequence?.emails.find((e) => e.emailId === emailId);
        if (sequence && user && email) {
            await EmailEventModel.create({
                domain: domain._id,
                sequenceId,
                userId,
                emailId,
                action: Constants.EmailEventAction.OPEN,
            });
        }
    } catch (err) {
        error(`Invalid pixel data`, {
            fileName: "pixel.route.ts",
            stack: err.stack,
        });
    }

    return pixelResponse;
}
