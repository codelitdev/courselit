/**
 * Business logic for managing themes.
 */
const Theme = require("../../models/Theme.js");
const { checkIfAuthenticated } = require("../../lib/graphql.js");
const strings = require("../../config/strings.js");
const Layout = require("../../models/Layout.js");

// TODO: write tests for all functions

exports.getTheme = async (ctx) => {
  const theme = await Theme.findOne({ active: true, domain: ctx.domain._id });
  return transformThemeForOutput(theme);
};

exports.setTheme = async (id, ctx) => {
  checkIfAuthenticated(ctx);
  if (!ctx.user.isAdmin) throw new Error(strings.responses.is_not_admin);

  await Theme.updateMany(
    { domain: ctx.domain._id },
    { $set: { active: "false" } }
  );

  const theme = await Theme.findOne({ id, domain: ctx.domain._id });
  if (!theme) {
    throw new Error(strings.responses.theme_not_installed);
  }

  theme.active = true;
  await theme.save();

  return transformThemeForOutput(theme);
};

exports.removeTheme = async (id, ctx) => {
  checkIfAuthenticated(ctx);
  if (!ctx.user.isAdmin) throw new Error(strings.responses.is_not_admin);

  await Theme.deleteOne({ id, domain: ctx.domain._id });

  return true;
};

exports.getAllThemes = async (ctx) => {
  checkIfAuthenticated(ctx);
  if (!ctx.user.isAdmin) throw new Error(strings.responses.is_not_admin);

  const themes = await Theme.find({ domain: ctx.domain._id });
  return themes.map(transformThemeForOutput);
};

exports.addTheme = async (themeData, ctx) => {
  checkIfAuthenticated(ctx);
  if (!ctx.user.isAdmin) throw new Error(strings.responses.is_not_admin);

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
    domain: ctx.domain._id,
    id: themeData.id,
    name: themeData.name,
    styles,
    screenshot: themeData.screenshot,
    url: themeData.url,
  });

  return transformThemeForOutput(theme);
};

exports.getLayout = async (ctx) => {
  const layout = await Layout.findOne({ domain: ctx.domain._id });
  return layout
    ? {
        layout: JSON.stringify(layout.layout),
      }
    : null;
};

exports.setLayout = async (layoutData, ctx) => {
  checkIfAuthenticated(ctx);
  if (!ctx.user.isAdmin) throw new Error(strings.responses.is_not_admin);

  let layoutObject;
  try {
    layoutObject = JSON.parse(layoutData.layout);
  } catch (err) {
    throw new Error(strings.responses.invalid_layout);
  }

  let layout = await Layout.findOne({ domain: ctx.domain._id });
  if (layout) {
    layout.layout = layoutObject;
    layout = await layout.save();
  } else {
    layout = await Layout.create({
      domain: ctx.domain._id,
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
