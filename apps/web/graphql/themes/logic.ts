import { checkIfAuthenticated } from "../../lib/graphql";
import { responses } from "../../config/strings";
import constants from "../../config/constants";
import GQLContext from "../../models/GQLContext";
import { checkPermission } from "@courselit/utils";
import UserThemeModel from "../../models/UserTheme";
import { themes as SystemThemes } from "@courselit/page-primitives";
import { Theme as CommonTheme, UITheme } from "@courselit/common-models";

const { permissions } = constants;

function getSystemTheme(themeId: string) {
    return SystemThemes.find((theme) => theme.id === themeId);
}

export const getTheme = async (
    ctx: GQLContext,
    themeId?: string,
): Promise<UITheme> => {
    if (!themeId) {
        let theme: any = await UserThemeModel.findOne(
            {
                themeId: ctx.subdomain.themeId,
                domain: ctx.subdomain._id,
            },
            {
                themeId: 1,
                name: 1,
                theme: 1,
            },
        ).lean();

        if (!theme) {
            const systemTheme = getSystemTheme("classic");
            theme = {
                themeId: systemTheme!.id,
                name: systemTheme!.name,
                theme: systemTheme!.styles,
            };
        }

        return theme;
    }

    const systemTheme = getSystemTheme(themeId);
    if (systemTheme) {
        return {
            themeId: systemTheme.id,
            name: systemTheme.name,
            theme: systemTheme.styles,
        };
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

    return {
        themeId: theme.themeId,
        name: theme.name,
        theme: theme.theme,
        draftTheme: theme.draftTheme,
    };
};

export const updateDraftTheme = async (
    themeId: string,
    ctx: GQLContext,
    colors?: CommonTheme["colors"],
    typography?: CommonTheme["typography"],
    interactives?: CommonTheme["interactives"],
    structure?: CommonTheme["structure"],
): Promise<UITheme> => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageSettings])) {
        throw new Error(responses.action_not_allowed);
    }

    const systemTheme = getSystemTheme(themeId);

    let theme;
    if (systemTheme) {
        theme = await UserThemeModel.create({
            domain: ctx.subdomain._id,
            name: `${systemTheme.name} copy`,
            parentThemeId: systemTheme.id,
            userId: ctx.user.userId,
            theme: systemTheme,
            draftTheme: systemTheme,
        });
    } else {
        theme = await UserThemeModel.findOne({
            domain: ctx.subdomain._id,
            themeId,
        });
    }

    if (colors) {
        theme.draftTheme.colors = JSON.parse(JSON.stringify(colors));
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

    return {
        themeId: theme.themeId,
        name: theme.name,
        theme: theme.theme,
        draftTheme: theme.draftTheme,
    };
};

// export const switchTheme = async (themeId: string, ctx: GQLContext) => {
//     checkIfAuthenticated(ctx);
//     if (!checkPermission(ctx.user.permissions, [permissions.manageSite])) {
//         throw new Error(responses.action_not_allowed);
//     }

//     const theme = await ThemeModel.findOne({ themeId: themeId, domain: ctx.subdomain._id });
//     if (!theme) {
//         throw new Error(responses.theme_not_installed);
//     }

//     ctx.subdomain.themeId = themeId;
//     await (ctx.subdomain as any).save();

//     return theme;
// };

// export const removeTheme = async (name: string, ctx: GQLContext) => {
//     checkIfAuthenticated(ctx);
//     if (!checkPermission(ctx.user.permissions, [permissions.manageSite])) {
//         throw new Error(responses.action_not_allowed);
//     }

//     await ThemeModel.deleteOne({ name, domain: ctx.subdomain._id });
//     if (name === ctx.subdomain.theme.name) {
//         ctx.subdomain.theme.remove();
//         await ctx.subdomain.save();
//     }

//     return true;
// };

// export const addTheme = async (themeData: any, ctx: GQLContext) => {
//     checkIfAuthenticated(ctx);
//     if (!checkPermission(ctx.user.permissions, [permissions.manageSite])) {
//         throw new Error(responses.action_not_allowed);
//     }

//     if (!themeData.styles) {
//         throw new Error(responses.invalid_theme);
//     }

//     let styles;
//     try {
//         if (themeData.styles) {
//             styles = JSON.parse(themeData.styles);
//         }
//     } catch (err) {
//         throw new Error(responses.invalid_theme);
//     }

//     const theme = await ThemeModel.create({
//         domain: ctx.subdomain._id,
//         name: themeData.name,
//         styles,
//         screenshot: themeData.screenshot,
//         url: themeData.url,
//     });

//     return theme;
// };

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
        },
    );

    userThemes = userThemes.map((theme) => ({
        themeId: theme.themeId,
        name: theme.name,
        theme: theme.theme,
        draftTheme: theme.draftTheme,
    }));

    const systemThemes = SystemThemes.map((theme) => ({
        themeId: theme.id,
        name: theme.name,
        theme: theme.styles,
        draftTheme: theme.styles,
    }));

    return {
        system: systemThemes,
        custom: userThemes,
    };
};
