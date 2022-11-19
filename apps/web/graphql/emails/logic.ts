import constants from "../../config/constants";
import GQLContext from "../../models/GQLContext";
import UserModel, { User } from "../../models/User";
import { createUser } from "../users/logic";

export async function createSubscription(
    email: string,
    ctx: GQLContext
): Promise<boolean> {
    try {
        let dbUser: User | null = await UserModel.findOne({
            email,
            domain: ctx.subdomain._id,
        });

        if (!dbUser) {
            dbUser = await createUser({
                domain: ctx.subdomain!,
                email: email,
                lead: constants.leadNewsletter,
            });
        }
    } catch (e: any) {
        console.error(e.message, e.stack);
        return false;
    }

    return true;
}
