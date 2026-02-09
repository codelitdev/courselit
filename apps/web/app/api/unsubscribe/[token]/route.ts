import { NextRequest } from "next/server";
import { responses } from "@/config/strings";
import User from "@courselit/orm-models/dao/user";
import DomainModel, { Domain } from "@courselit/orm-models/dao/domain";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ token: string }> },
) {
    const domain = await DomainModel.queryOne<Domain>({
        name: req.headers.get("domain"),
    });
    if (!domain) {
        return Response.json({ message: "Domain not found" }, { status: 404 });
    }

    const token = (await params).token;

    const user = await User.queryOne({ unsubscribeToken: token });

    if (!user) {
        return Response.json({ message: responses.unsubscribe_success });
    }

    await User.patchOne(
        { _id: (user as any)._id },
        { $set: { subscribedToUpdates: false } },
    );

    return Response.json({ message: responses.unsubscribe_success });
}
