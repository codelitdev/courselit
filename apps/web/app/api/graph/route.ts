import { NextRequest } from "next/server";
import schema from "@/graphql";
import { graphql } from "graphql";
import { getAddress } from "@/lib/utils";
import User from "@models/User";
import DomainModel, { Domain } from "@models/Domain";
import { auth } from "@/lib/auth";

async function updateLastActive(user: any) {
    const dateNow = new Date();
    dateNow.setUTCHours(0, 0, 0, 0);
    const userLastActiveDate = new Date(user.updatedAt);
    userLastActiveDate.setUTCHours(0, 0, 0, 0);

    if (dateNow.getTime() > userLastActiveDate.getTime()) {
        user.updatedAt = new Date();
        await user.save();
    }
}

export async function POST(req: NextRequest) {
    const domain = await DomainModel.findOne<Domain>({
        name: req.headers.get("domain"),
    });
    if (!domain) {
        return Response.json({ message: "Domain not found" }, { status: 404 });
    }

    const session = await auth();

    let user;
    if (session) {
        user = await User.findOne({
            email: session.user!.email,
            domain: domain._id,
            active: true,
        });

        if (user) {
            updateLastActive(user);
        }
    }

    const body = await req.json();
    if (!body.hasOwnProperty("query")) {
        return Response.json({ error: "Query is missing" }, { status: 400 });
    }

    let query, variables;
    if (typeof body.query === "string") {
        query = body.query;
        variables = body.variables;
    } else {
        query = body.query.query;
        variables = body.query.variables;
    }
    const hostname = req.headers.get("host") || "";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const contextValue = {
        user,
        subdomain: domain,
        address: getAddress(hostname, protocol),
    };
    const response = await graphql({
        schema,
        source: query,
        rootValue: null,
        contextValue,
        variableValues: variables,
    });
    return Response.json(response);
}
