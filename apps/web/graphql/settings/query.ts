import types from "./types";
import { getSiteInfo } from "./logic";

export default {
    getSiteInfo: {
        type: types.domain,
        resolve: (_: any, __: any, ctx: any) => getSiteInfo(ctx),
    },
};
