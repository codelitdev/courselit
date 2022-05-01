import SiteInfoModel from "../../models/SiteInfo";
import { checkIfAuthenticated, checkPermission } from "../../lib/graphql";
import { responses } from "../../config/strings";
import constants from "../../config/constants";
import {
  checkForInvalidPaymentSettings,
  checkForInvalidPaymentMethodSettings,
  getPaymentInvalidException,
} from "./helpers";
import type GQLContext from "../../models/GQLContext";
import type SiteInfo from "../../ui-models/site-info";
import { checkMediaForPublicAccess } from "../media/logic";

const { permissions } = constants;

export const getSiteInfo = async (ctx: GQLContext) => {
  const siteinfo: SiteInfo | null = await SiteInfoModel.findOne(
    { domain: ctx.subdomain._id },
    "title subtitle logopath currencyUnit currencyISOCode paymentMethod stripePublishableKey codeInjectionHead"
  );

  return siteinfo;
};

export const getSiteInfoAsAdmin = async (ctx: GQLContext) => {
  checkIfAuthenticated(ctx);

  if (!checkPermission(ctx.user.permissions, [permissions.manageSettings])) {
    throw new Error(responses.action_not_allowed);
  }

  const siteinfo: SiteInfo | null = await SiteInfoModel.findOne({
    domain: ctx.subdomain._id,
  });
  return siteinfo;
};

export const updateSiteInfo = async (
  siteData: Record<string, unknown>,
  ctx: GQLContext
) => {
  checkIfAuthenticated(ctx);

  if (!checkPermission(ctx.user.permissions, [permissions.manageSettings])) {
    throw new Error(responses.action_not_allowed);
  }

  let siteInfo = await SiteInfoModel.findOne({ domain: ctx.subdomain._id });

  let shouldCreate = false;
  if (siteInfo === null) {
    shouldCreate = true;
    siteInfo = {
      domain: ctx.subdomain._id,
    };
  }

  for (const key of Object.keys(siteData)) {
    siteInfo[key] = siteData[key];
  }

  if (!siteInfo.title.trim()) {
    throw new Error(responses.school_title_not_set);
  }

  if (siteInfo.logopath) {
    const logoIsPubliclyAccessible = await checkMediaForPublicAccess(
      siteInfo.logopath
    );
    if (!logoIsPubliclyAccessible) {
      throw new Error(responses.publicly_inaccessible);
    }
  }

  if (shouldCreate) {
    siteInfo = await SiteInfoModel.create(siteInfo);
  } else {
    siteInfo = await siteInfo.save();
  }

  return siteInfo;
};

async function throwErrorIfLogoMediaIsNotPublic(src?: string) {
  if (!src) {
    return;
  }

  let media = null;
  try {
    media = await medialitService.getMedia(src);
  } catch (e: any) {}

  const isLogoPubliclyAvailable = media && media.access === "public";
  if (!isLogoPubliclyAvailable) {
    throw new Error(responses.publicly_inaccessible);
  }
}

export const updatePaymentInfo = async (
  siteData: Record<string, unknown>,
  ctx: GQLContext
) => {
  checkIfAuthenticated(ctx);

  if (!checkPermission(ctx.user.permissions, [permissions.manageSettings])) {
    throw new Error(responses.action_not_allowed);
  }

  let siteInfo = await SiteInfoModel.findOne({ domain: ctx.subdomain._id });

  if (!siteInfo) {
    throw new Error(responses.school_title_not_set);
  }

  for (const key of Object.keys(siteData)) {
    siteInfo[key] = siteData[key];
  }

  const invalidPaymentMethod = checkForInvalidPaymentSettings(siteInfo);
  if (invalidPaymentMethod) {
    throw invalidPaymentMethod;
  }

  const failedPaymentMethod = checkForInvalidPaymentMethodSettings(siteInfo);
  if (failedPaymentMethod) {
    throw getPaymentInvalidException(failedPaymentMethod);
  }

  if (siteInfo.paymentMethod) {
    siteInfo.currencyISOCode = siteInfo.currencyISOCode.toLowerCase();
  }
  siteInfo = await siteInfo.save();

  return siteInfo;
};
