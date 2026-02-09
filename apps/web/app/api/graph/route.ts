import { NextRequest } from "next/server";
import schema from "@/graphql";
import { graphql } from "graphql";
import { getAddress } from "@/lib/utils";
import User from "@courselit/orm-models/dao/user";
import DomainModel, { Domain } from "@courselit/orm-models/dao/domain";
import { auth } from "@/auth";
import { als } from "@/async-local-storage";

async function updateLastActive(user: any) {
    const dateNow = new Date();
    dateNow.setUTCHours(0, 0, 0, 0);
    const userLastActiveDate = new Date(user.updatedAt);
    userLastActiveDate.setUTCHours(0, 0, 0, 0);

    if (dateNow.getTime() > userLastActiveDate.getTime()) {
        user.updatedAt = new Date();
        await User.saveOne(user as any);
    }
}

export async function POST(req: NextRequest) {
    const domain = await DomainModel.queryOne<Domain>({
        name: req.headers.get("domain"),
    });
    if (!domain) {
        return Response.json({ message: "Domain not found" }, { status: 404 });
    }

    const map = new Map();
    map.set("domain", req.headers.get("domain"));
    map.set("domainId", req.headers.get("domainId"));
    als.enterWith(map);

    const session = await auth.api.getSession({
        headers: req.headers,
    });
    const body = await req.json();
    if (!body.hasOwnProperty("query")) {
        return Response.json({ error: "Query is missing" }, { status: 400 });
    }

    let user;
    if (session) {
        user = await User.queryOne({
            email: session.user!.email,
            domain: domain._id,
            active: true,
        });

        if (user) {
            updateLastActive(user);
        }
    }

    // const body = await req.json();
    // if (!body.hasOwnProperty("query")) {
    //     return Response.json({ error: "Query is missing" }, { status: 400 });
    // }

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
