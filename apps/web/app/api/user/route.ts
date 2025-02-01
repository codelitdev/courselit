import { NextRequest, NextResponse } from "next/server";
import { responses } from "@/config/strings";
import { createUser } from "@/graphql/users/logic";
import constants from "@config/constants";
import { createHash } from "crypto";
import { validateDomainAndApiKey } from "./validate-apikey";
import UserModel from "@models/User";
import { checkForInvalidPermissions } from "@/lib/check-invalid-permissions";

function validateRequestBody(body: any) {
    const { email, subscribedToUpdates, permissions } = body;

    if (!email) {
        return { error: { message: "Bad request", status: 400 } };
    }

    if (subscribedToUpdates && typeof subscribedToUpdates !== "boolean") {
        return { error: { message: "Bad request", status: 400 } };
    }

    if (permissions && !Array.isArray(permissions)) {
        return { error: { message: "Bad request", status: 400 } };
    }

    if (permissions && permissions.length) {
        try {
            checkForInvalidPermissions(permissions);
        } catch (err) {
            return { error: { message: err.message, status: 400 } };
        }
    }

    return {};
}

export async function POST(req: NextRequest) {
    const validation = await validateDomainAndApiKey(req);
    if (validation.error) {
        return NextResponse.json(
            { message: validation.error.message },
            { status: validation.error.status },
        );
    }

    const { domain, body } = validation;
    const validationResult = validateRequestBody(body);
    if (validationResult.error) {
        return NextResponse.json(
            { message: validationResult.error.message },
            { status: validationResult.error.status },
        );
    }

    const { email, subscribedToUpdates, name, permissions } = body;

    try {
        await createUser({
            domain,
            email: email,
            name,
            permissions,
            lead: constants.leadApi,
            subscribedToUpdates,
        });

        return NextResponse.json(
            {
                email: createMd5Sum(email),
            },
            { status: 200 },
        );
    } catch (err: any) {
        if (err.message.indexOf("E11000") !== -1) {
            return NextResponse.json(
                { error: responses.user_already_exists },
                { status: 400 },
            );
        }
        return NextResponse.json(
            { error: responses.internal_error },
            { status: 500 },
        );
    }
}

export async function PATCH(req: NextRequest) {
    const validation = await validateDomainAndApiKey(req);
    if (validation.error) {
        return NextResponse.json(
            { message: validation.error.message },
            { status: validation.error.status },
        );
    }

    const { domain, body } = validation;
    const validationResult = validateRequestBody(body);
    if (validationResult.error) {
        return NextResponse.json(
            { message: validationResult.error.message },
            { status: validationResult.error.status },
        );
    }

    const { email, name, permissions, subscribedToUpdates } = body;

    try {
        const user = await UserModel.findOneAndUpdate(
            { email, domain: domain._id },
            { name, permissions, subscribedToUpdates },
            { new: true },
        );

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 },
            );
        }

        return NextResponse.json(
            {
                email: createMd5Sum(email),
            },
            { status: 200 },
        );
    } catch (err: any) {
        return NextResponse.json(
            { error: responses.internal_error },
            { status: 500 },
        );
    }
}

function createMd5Sum(input: string) {
    const hash = createHash("md5");
    hash.update(input);
    return hash.digest("hex");
}
