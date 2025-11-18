import { NextRequest } from "next/server";
import { responses } from "@/config/strings";
import User from "@models/User";
import DomainModel, { Domain } from "@models/Domain";

export async function GET(
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

    const user = await User.findOne({ unsubscribeToken: token });

    if (!user) {
        return Response.json({ message: responses.unsubscribe_success });
    }

    await user.updateOne({ subscribedToUpdates: false });

    return Response.json({ message: responses.unsubscribe_success });
}
