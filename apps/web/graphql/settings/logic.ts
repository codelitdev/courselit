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
import DomainModel, { Domain } from "../../models/Domain";

const { permissions } = constants;

export const getSiteInfo = async (ctx: GQLContext) => {
    const domain: Domain | null = await DomainModel.findById(
        ctx.subdomain._id,
        {
            email: 0,
            deleted: 0,
            customDomain: 0,
            "settings.stripeSecret": 0,
            "settings.paytmSecret": 0,
            "settings.paypalSecret": 0,
        }
    );

    return domain;
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

    const domain: Domain | null = await DomainModel.findById(ctx.subdomain._id);
    if (!domain) {
        return null;
    }

    if (!domain.settings) {
        domain.settings = {};
    }

    for (const key of Object.keys(siteData)) {
        domain.settings[key] = siteData[key];
    }

    if (!domain.settings.title.trim()) {
        throw new Error(responses.school_title_not_set);
    }

    if (domain.settings.logopath) {
        const logoIsPubliclyAccessible = await checkMediaForPublicAccess(
            domain.settings.logopath
        );
        if (!logoIsPubliclyAccessible) {
            throw new Error(responses.publicly_inaccessible);
        }
    }

    await domain.save();

    return domain;
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

    const domain: Domain | null = await DomainModel.findById(ctx.subdomain._id);
    if (!domain) {
        return null;
    }

    if (!domain.settings || !domain.settings.title) {
        throw new Error(responses.school_title_not_set);
    }

    for (const key of Object.keys(siteData)) {
        domain.settings[key] = siteData[key];
    }

    const invalidPaymentMethod = checkForInvalidPaymentSettings(
        domain.settings
    );
    if (invalidPaymentMethod) {
        throw invalidPaymentMethod;
    }

    const failedPaymentMethod = checkForInvalidPaymentMethodSettings(
        domain.settings
    );
    if (failedPaymentMethod) {
        throw getPaymentInvalidException(failedPaymentMethod);
    }

    if (domain.settings.paymentMethod) {
        domain.settings.currencyISOCode =
            domain.settings.currencyISOCode.toLowerCase();
    }
    await domain.save();

    return domain;
};
