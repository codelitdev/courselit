import types from "./types";
import { getSiteInfo, getSiteInfoAsAdmin } from "./logic";

export default {
  getSiteInfo: {
    type: types.siteType,
    resolve: (_: any, __: any, ctx: any) => getSiteInfo(ctx),
  },
  getSiteInfoAsAdmin: {
    type: types.siteAdminType,
    resolve: (_: any, __: any, ctx: any) => getSiteInfoAsAdmin(ctx),
  },
};
