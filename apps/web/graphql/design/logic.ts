import ThemeModel from "../../models/Theme";
import { checkIfAuthenticated } from "../../lib/graphql";
import { responses } from "../../config/strings";
import constants from "../../config/constants";
import GQLContext from "../../models/GQLContext";
import { checkPermission } from "@courselit/utils";
const { permissions } = constants;

export const setTheme = async (name: string, ctx: GQLContext) => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageSite])) {
        throw new Error(responses.action_not_allowed);
    }

    await ThemeModel.updateMany(
        { domain: ctx.subdomain._id },
        { $set: { active: "false" } },
    );

    const theme = await ThemeModel.findOne({ name, domain: ctx.subdomain._id });
    if (!theme) {
        throw new Error(responses.theme_not_installed);
    }

    theme.active = true;
    await theme.save();
    ctx.subdomain.theme = theme;
    await (ctx.subdomain as any).save();

    return theme;
};

export const removeTheme = async (name: string, ctx: GQLContext) => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageSite])) {
        throw new Error(responses.action_not_allowed);
    }

    await ThemeModel.deleteOne({ name, domain: ctx.subdomain._id });
    if (name === ctx.subdomain.theme.name) {
        ctx.subdomain.theme.remove();
        await ctx.subdomain.save();
    }

    return true;
};

export const addTheme = async (themeData: any, ctx: GQLContext) => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageSite])) {
        throw new Error(responses.action_not_allowed);
    }

    if (!themeData.styles) {
        throw new Error(responses.invalid_theme);
    }

    let styles;
    try {
        if (themeData.styles) {
            styles = JSON.parse(themeData.styles);
        }
    } catch (err) {
        throw new Error(responses.invalid_theme);
    }

    const theme = await ThemeModel.create({
        domain: ctx.subdomain._id,
        name: themeData.name,
        styles,
        screenshot: themeData.screenshot,
        url: themeData.url,
    });

    return theme;
};

export const getThemes = async (ctx: GQLContext) => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageSite])) {
        throw new Error(responses.action_not_allowed);
    }

    const themes = await ThemeModel.find({ domain: ctx.subdomain._id });
    return themes;
};
