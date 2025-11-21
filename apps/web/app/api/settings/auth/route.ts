import { NextRequest } from "next/server";
import { responses } from "@/config/strings";
import { UIConstants as constants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import User from "@models/User";
import DomainModel, { Domain } from "@models/Domain";
import { getAuth } from "@/lib/auth";
import { error } from "@/services/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const domainName = req.headers.get("domain");
    const domain = await DomainModel.findOne<Domain>({
        name: domainName,
    });
    if (!domain) {
        return Response.json({ message: "Domain not found" }, { status: 404 });
    }

    const auth = await getAuth(domainName || undefined);
    const session = await auth.api.getSession({
        headers: req.headers,
    });

    let user;
    if (session) {
        user = await User.findOne({
            email: session.user!.email,
            domain: domain._id,
            active: true,
        });
    }

    if (!user) {
        return Response.json({}, { status: 401 });
    }

    if (
        !checkPermission(user!.permissions, [constants.permissions.manageSite])
    ) {
        return Response.json(
            { message: responses.action_not_allowed },
            { status: 403 },
        );
    }

    return Response.json({
        auth: domain.auth || {
            emailOtp: { enabled: true },
            google: { enabled: false },
            github: { enabled: false },
            saml: { enabled: false },
        },
    });
}

export async function POST(req: NextRequest) {
    const domainName = req.headers.get("domain");
    const domain = await DomainModel.findOne<Domain>({
        name: domainName,
    });
    if (!domain) {
        return Response.json({ message: "Domain not found" }, { status: 404 });
    }

    const auth = await getAuth(domainName || undefined);
    const session = await auth.api.getSession({
        headers: req.headers,
    });

    let user;
    if (session) {
        user = await User.findOne({
            email: session.user!.email,
            domain: domain._id,
            active: true,
        });
    }

    if (!user) {
        return Response.json({}, { status: 401 });
    }

    if (
        !checkPermission(user!.permissions, [constants.permissions.manageSite])
    ) {
        return Response.json(
            { message: responses.action_not_allowed },
            { status: 403 },
        );
    }

    try {
        const body = await req.json();
        await DomainModel.findOneAndUpdate(
            { _id: domain._id },
            { $set: { auth: body } },
        );

        // Sync SAML settings to Better Auth SSO Provider
        if (body.saml?.enabled && body.saml.emailDomain) {
            const ssoProvider = {
                providerId: "saml",
                type: "saml",
                domain: body.saml.emailDomain,
                name: domain.name,
                metadata: {
                    entryPoint: body.saml.entryPoint,
                    issuer: body.saml.issuer,
                    cert: body.saml.cert,
                },
            };

            // We need to check if it exists first or use upsert if available.
            // Since we don't have easy access to check, we'll try to create and catch error, or list and update.
            // Better Auth API might not have upsert.
            // Let's try to list providers for this domain (implicit via context)
            const api = auth.api as any;
            const providers = await api.listSSOProviders({
                headers: req.headers,
            });

            const existing = providers.find(
                (p: any) => p.providerId === "saml",
            );

            if (existing) {
                await api.updateSSOProvider({
                    headers: req.headers,
                    body: {
                        ...ssoProvider,
                    },
                });
            } else {
                await api.createSSOProvider({
                    headers: req.headers,
                    body: ssoProvider,
                });
            }
        }

        return Response.json({ success: true });
    } catch (err: any) {
        error(err.message, {
            stack: err.stack,
        });
        return Response.json({ error: err.message }, { status: 500 });
    }
}
