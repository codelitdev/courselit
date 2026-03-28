import { NextRequest } from "next/server";
import { responses } from "@/config/strings";
import User from "@models/User";
import DomainModel, { Domain } from "@models/Domain";
import { recordActivity } from "@/lib/record-activity";
import { Constants } from "@courselit/common-models";

async function unsubscribe(
    req: NextRequest,
    { params }: { params: Promise<{ token: string }> },
) {
    const domain = await DomainModel.findOne<Domain>({
        name: req.headers.get("domain"),
    });
    if (!domain) {
        return Response.json({ message: "Domain not found" }, { status: 404 });
    }

    const token = (await params).token;

    const user = await User.findOne({
        domain: domain._id,
        unsubscribeToken: token,
        subscribedToUpdates: true,
    });

    if (!user) {
        return Response.json({ message: responses.unsubscribe_success });
    }

    await user.updateOne({ subscribedToUpdates: false });

    await recordActivity({
        domain: domain._id,
        userId: user.userId,
        type: Constants.ActivityType.NEWSLETTER_UNSUBSCRIBED,
        entityId: user.userId,
    });

    return Response.json({ message: responses.unsubscribe_success });
}

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ token: string }> },
) {
    return unsubscribe(req, context);
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ token: string }> },
) {
    return unsubscribe(req, context);
}
