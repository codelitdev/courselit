import { NextRequest } from "next/server";
import DomainModel, { Domain } from "@courselit/orm-models/dao/domain";
import ApiKey from "@courselit/orm-models/dao/apikey";

export async function validateDomainAndApiKey(req: NextRequest) {
    const domain = await DomainModel.findOne<Domain>({
        name: req.headers.get("domain"),
    });
    if (!domain) {
        return { error: { message: "Domain not found", status: 404 } };
    }

    const body = await req.json();
    const apikey = body.apikey;
    if (!apikey) {
        return { error: { message: "Bad request", status: 400 } };
    }
    const apikeyObj = await ApiKey.findOne({
        domain: domain._id,
        key: apikey,
    });

    if (!apikeyObj) {
        return { error: { message: "Unauthorized", status: 401 } };
    }

    return { domain, body };
}
