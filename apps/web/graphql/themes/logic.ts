import { checkIfAuthenticated } from "../../lib/graphql";
import DomainModel from "@models/Domain";
import { responses } from "../../config/strings";
import constants from "../../config/constants";
import GQLContext from "../../models/GQLContext";
import { checkPermission } from "@courselit/utils";
import UserThemeModel from "@/models/UserTheme";
import { themes as SystemThemes } from "@courselit/page-primitives";
import { ThemeStyle } from "@courselit/page-models";
import { UITheme } from "@models/UITheme";

const { permissions } = constants;

function getSystemTheme(themeId: string) {
    const theme = SystemThemes.find((theme) => theme.id === themeId);

    if (theme) {
        return {
            themeId: theme.id,
            name: theme.name,
            theme: theme.theme,
            draftTheme: theme.theme,
        };
    }

    return null;
}

export const getTheme = async (
    ctx: GQLContext,
    themeId?: string,
): Promise<UITheme> => {
    if (!themeId) {
        const defaultThemeId = ctx.subdomain.themeId || "classic";
        let theme: any = await UserThemeModel.findOne(
            {
                themeId: defaultThemeId,
                domain: ctx.subdomain._id,
            },
            {
                themeId: 1,
                name: 1,
                theme: 1,
                draftTheme: 1,
            },
        ).lean();

        if (!theme) {
            theme = getSystemTheme(defaultThemeId);
        }

        return formatTheme(theme);
    }

    const systemTheme = getSystemTheme(themeId);
    if (systemTheme) {
        return formatTheme(systemTheme);
    }

    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageSite])) {
        throw new Error(responses.action_not_allowed);
    }

    const theme: any = await UserThemeModel.findOne(
        {
            domain: ctx.subdomain._id,
            themeId,
        },
        {
            themeId: 1,
            name: 1,
            theme: 1,
            draftTheme: 1,
        },
    ).lean();

    if (!theme) {
        throw new Error(responses.item_not_found);
    }

    return formatTheme(theme);
};

export const updateDraftTheme = async (
    themeId: string,
    ctx: GQLContext,
    colors?: ThemeStyle["colors"],
    typography?: ThemeStyle["typography"],
    interactives?: ThemeStyle["interactives"],
    structure?: ThemeStyle["structure"],
): Promise<UITheme> => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageSettings])) {
        throw new Error(responses.action_not_allowed);
    }

    const systemTheme = getSystemTheme(themeId);

    let theme;
    if (systemTheme) {
        const existingChildren = await UserThemeModel.find({
            parentThemeId: systemTheme.themeId,
        });
        theme = await UserThemeModel.create({
            domain: ctx.subdomain._id,
            name: `${systemTheme.name} - Copy ${existingChildren.length + 1}`,
            parentThemeId: systemTheme.themeId,
            userId: ctx.user.userId,
            theme: systemTheme.theme,
            draftTheme: systemTheme.theme,
        });
        // ctx.subdomain.themeId = theme.themeId;
    } else {
        theme = await UserThemeModel.findOne({
            domain: ctx.subdomain._id,
            themeId,
        });
    }

    if (colors) {
        theme.draftTheme.colors.light = JSON.parse(
            JSON.stringify(colors.light),
        );
        theme.draftTheme.colors.dark = JSON.parse(JSON.stringify(colors.dark));
    }

    if (typography) {
        theme.draftTheme.typography = JSON.parse(JSON.stringify(typography));
    }

    if (interactives) {
        theme.draftTheme.interactives = JSON.parse(
            JSON.stringify(interactives),
        );
    }

    if (structure) {
        theme.draftTheme.structure = JSON.parse(JSON.stringify(structure));
    }

    await theme.save();
    await DomainModel.findOneAndUpdate(
        { _id: ctx.subdomain._id },
        { $set: { lastEditedThemeId: theme.themeId } },
    );

    return formatTheme(theme);
};

export const getThemes = async (
    ctx: GQLContext,
): Promise<{
    system: UITheme[];
    custom: UITheme[];
}> => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageSite])) {
        throw new Error(responses.action_not_allowed);
    }

    let userThemes = await UserThemeModel.find(
        {
            domain: ctx.subdomain._id,
        },
        {
            themeId: 1,
            name: 1,
            theme: 1,
            draftTheme: 1,
        },
    );

    userThemes = userThemes.map(formatTheme);

    const systemThemes = SystemThemes.map((theme) => ({
        themeId: theme.id,
        name: theme.name,
        theme: theme.theme,
        draftTheme: theme.theme,
    }));

    return {
        system: systemThemes,
        custom: userThemes,
    };
};

export const publishTheme = async (themeId: string, ctx: GQLContext) => {
    let theme: any = getSystemTheme(themeId);
    if (theme) {
        return formatTheme(theme);
    }

    theme = await UserThemeModel.findOne({
        domain: ctx.subdomain._id,
        themeId,
    });

    if (!theme) {
        throw new Error(responses.theme_not_installed);
    }

    theme.theme = theme.draftTheme;
    await theme.save();

    return formatTheme(theme);
};

export const switchTheme = async (themeId: string, ctx: GQLContext) => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageSite])) {
        throw new Error(responses.action_not_allowed);
    }

    let theme: any = getSystemTheme(themeId);
    if (!theme) {
        theme = await publishTheme(themeId, ctx);
    }

    await DomainModel.findOneAndUpdate(
        { _id: ctx.subdomain._id },
        { $set: { themeId, lastEditedThemeId: themeId } },
    );

    return formatTheme(theme);
};

function formatTheme(theme: any) {
    return {
        themeId: theme.themeId,
        name: theme.name,
        theme: theme.theme,
        draftTheme: theme.draftTheme,
    };
}
