/**
 * Business logic for managing themes.
 */
const Theme = require("../../models/Theme.js");
const {
  checkIfAuthenticated,
  checkPermission,
} = require("../../lib/graphql.js");
const strings = require("../../config/strings.js");
const Layout = require("../../models/Layout.js");
const { permissions } = require("../../config/constants.js");

exports.getTheme = async (ctx) => {
  const theme = await Theme.findOne({
    active: true,
    domain: ctx.subdomain._id,
  });
  return transformThemeForOutput(theme);
};

exports.setTheme = async (id, ctx) => {
  checkIfAuthenticated(ctx);
  if (!checkPermission(ctx.user.permissions, [permissions.manageThemes])) {
    throw new Error(strings.responses.action_not_allowed);
  }

  await Theme.updateMany(
    { domain: ctx.subdomain._id },
    { $set: { active: "false" } }
  );

  const theme = await Theme.findOne({ id, domain: ctx.subdomain._id });
  if (!theme) {
    throw new Error(strings.responses.theme_not_installed);
  }

  theme.active = true;
  await theme.save();

  return transformThemeForOutput(theme);
};

exports.removeTheme = async (id, ctx) => {
  checkIfAuthenticated(ctx);
  if (!checkPermission(ctx.user.permissions, [permissions.manageThemes])) {
    throw new Error(strings.responses.action_not_allowed);
  }

  await Theme.deleteOne({ id, domain: ctx.subdomain._id });

  return true;
};

exports.getAllThemes = async (ctx) => {
  checkIfAuthenticated(ctx);
  if (!checkPermission(ctx.user.permissions, [permissions.manageThemes])) {
    throw new Error(strings.responses.action_not_allowed);
  }

  const themes = await Theme.find({ domain: ctx.subdomain._id });
  return themes.map(transformThemeForOutput);
};

exports.addTheme = async (themeData, ctx) => {
  checkIfAuthenticated(ctx);
  if (!checkPermission(ctx.user.permissions, [permissions.manageThemes])) {
    throw new Error(strings.responses.action_not_allowed);
  }

  if (!themeData.styles) {
    throw new Error(strings.responses.invalid_theme);
  }

  let styles;
  try {
    if (themeData.styles) {
      styles = JSON.parse(themeData.styles);
    }
  } catch (err) {
    throw new Error(strings.responses.invalid_theme);
  }

  const theme = await Theme.create({
    domain: ctx.subdomain._id,
    id: themeData.id,
    name: themeData.name,
    styles,
    screenshot: themeData.screenshot,
    url: themeData.url,
  });

  return transformThemeForOutput(theme);
};

exports.getLayout = async (ctx) => {
  const layout = await Layout.findOne({ domain: ctx.subdomain._id });
  return layout
    ? {
        layout: JSON.stringify(layout.layout),
      }
    : null;
};

exports.setLayout = async (layoutData, ctx) => {
  checkIfAuthenticated(ctx);
  if (!checkPermission(ctx.user.permissions, [permissions.manageLayout])) {
    throw new Error(strings.responses.action_not_allowed);
  }

  let layoutObject;
  try {
    layoutObject = JSON.parse(layoutData.layout);
  } catch (err) {
    throw new Error(strings.responses.invalid_layout);
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

const transformThemeForOutput = (theme) =>
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
