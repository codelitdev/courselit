import ThemeModel, { Theme } from "../../models/Theme";
import { checkIfAuthenticated, checkPermission } from "../../lib/graphql";
import { responses } from "../../config/strings";
import Layout from "../../models/Layout";
import constants from "../../config/constants";
import GQLContext from "../../models/GQLContext";
const { permissions } = constants;

export const getTheme = async (ctx: GQLContext) => {
  const theme = await ThemeModel.findOne({
    active: true,
    domain: ctx.subdomain._id,
  });
  return transformThemeForOutput(theme);
};

export const setTheme = async (id: string, ctx: GQLContext) => {
  checkIfAuthenticated(ctx);
  if (!checkPermission(ctx.user.permissions, [permissions.manageThemes])) {
    throw new Error(responses.action_not_allowed);
  }

  await ThemeModel.updateMany(
    { domain: ctx.subdomain._id },
    { $set: { active: "false" } }
  );

  const theme = await ThemeModel.findOne({ id, domain: ctx.subdomain._id });
  if (!theme) {
    throw new Error(responses.theme_not_installed);
  }

  theme.active = true;
  await theme.save();

  return transformThemeForOutput(theme);
};

export const removeTheme = async (id: string, ctx: GQLContext) => {
  checkIfAuthenticated(ctx);
  if (!checkPermission(ctx.user.permissions, [permissions.manageThemes])) {
    throw new Error(responses.action_not_allowed);
  }

  await ThemeModel.deleteOne({ id, domain: ctx.subdomain._id });

  return true;
};

export const getAllThemes = async (ctx: GQLContext) => {
  checkIfAuthenticated(ctx);
  if (!checkPermission(ctx.user.permissions, [permissions.manageThemes])) {
    throw new Error(responses.action_not_allowed);
  }

  const themes = await ThemeModel.find({ domain: ctx.subdomain._id });
  return themes.map(transformThemeForOutput);
};

export const addTheme = async (themeData: any, ctx: GQLContext) => {
  checkIfAuthenticated(ctx);
  if (!checkPermission(ctx.user.permissions, [permissions.manageThemes])) {
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
    id: themeData.id,
    name: themeData.name,
    styles,
    screenshot: themeData.screenshot,
    url: themeData.url,
  });

  return transformThemeForOutput(theme);
};

export const getLayout = async (ctx: GQLContext) => {
  const layout = await Layout.findOne({ domain: ctx.subdomain._id });
  return layout
    ? {
        layout: JSON.stringify(layout.layout),
      }
    : null;
};

export const setLayout = async (layoutData: any, ctx: GQLContext) => {
  checkIfAuthenticated(ctx);
  if (!checkPermission(ctx.user.permissions, [permissions.manageLayout])) {
    throw new Error(responses.action_not_allowed);
  }

  let layoutObject;
  try {
    layoutObject = JSON.parse(layoutData.layout);
  } catch (err) {
    throw new Error(responses.invalid_layout);
  }

  let layout = await Layout.findOne({ domain: ctx.subdomain._id });
  if (layout) {
    layout.layout = layoutObject;
    layout = await layout.save();
  } else {
    layout = await Layout.create({
      domain: ctx.subdomain._id,
      layout: layoutObject,
    });
  }

  return {
    layout: JSON.stringify(layout.layout),
  };
};

const transformThemeForOutput = (theme: Theme) =>
  theme
    ? {
        id: theme.id,
        name: theme.name,
        styles: theme.styles ? JSON.stringify(theme.styles) : "",
        screenshot: theme.screenshot,
        url: theme.url,
        active: theme.active,
      }
    : null;
