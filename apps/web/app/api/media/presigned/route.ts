import { NextRequest } from "next/server";
import { responses } from "@/config/strings";
import { UIConstants as constants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import User from "@models/User";
import DomainModel, { Domain } from "@models/Domain";
import { auth } from "@/auth";
import { error } from "@/services/logger";
import { MediaLit } from "medialit";

export async function POST(req: NextRequest) {
    const domain = await DomainModel.findOne<Domain>({
        name: req.headers.get("domain"),
    });
    if (!domain) {
        return Response.json({ message: "Domain not found" }, { status: 404 });
    }

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
        !checkPermission(user!.permissions, [constants.permissions.manageMedia])
    ) {
        return Response.json(
            { message: responses.action_not_allowed },
            { status: 403 },
        );
    }

    const medialit = new MediaLit({
        apiKey: process.env.MEDIALIT_APIKEY,
        endpoint: process.env.MEDIALIT_SERVER,
    });

    try {
        let signature = await medialit.getSignature({
            group: domain.name,
        });
        return Response.json({
            signature,
            endpoint: medialit.endpoint,
        });
    } catch (err: any) {
        error(err.message, {
            stack: err.stack,
        });
        return Response.json({ error: err.message }, { status: 500 });
    }
}
