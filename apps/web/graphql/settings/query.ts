import types from "./types";
import { getSiteInfo } from "./logic";

const queries = {
    getSiteInfo: {
        type: types.domain,
        resolve: (_: any, __: any, ctx: any) => getSiteInfo(ctx),
    },
};

export default queries;
