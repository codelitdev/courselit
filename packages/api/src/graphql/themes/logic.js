/**
 * Business logic for managing themes.
 */
const Theme = require("../../models/Theme.js");
const { checkIfAuthenticated } = require("../../lib/graphql.js");
const strings = require("../../config/strings.js");

// TODO: write tests for all functions

exports.getTheme = async () => {
  const theme = await Theme.findOne({ active: true });
  console.log(theme, transformThemeForOutput(theme));
  return transformThemeForOutput(theme);
};

exports.setTheme = async (id, ctx) => {
  checkIfAuthenticated(ctx);
  if (!ctx.user.isAdmin) throw new Error(strings.responses.is_not_admin);

  await Theme.updateMany({}, { $set: { active: "false" } });

  const theme = await Theme.findOne({ id });
  if (!theme) {
    throw new Error(strings.responses.theme_not_installed);
  }

  theme.active = true;
  await theme.save();

  return transformThemeForOutput(theme);
};

exports.getAllThemes = async (ctx) => {
  checkIfAuthenticated(ctx);
  if (!ctx.user.isAdmin) throw new Error(strings.responses.is_not_admin);

  const themes = await Theme.find();
  return themes.map(transformThemeForOutput);
};

exports.addTheme = async (themeData, ctx) => {
  checkIfAuthenticated(ctx);
  if (!ctx.user.isAdmin) throw new Error(strings.responses.is_not_admin);

  if (!themeData.layout && !themeData.styles)
    throw new Error(strings.responses.invalid_theme);

  let layout, styles;
  try {
    if (themeData.layout) {
      layout = JSON.parse(themeData.layout);
    }
    if (themeData.styles) {
      styles = JSON.parse(themeData.styles);
    }
  } catch (err) {
    console.log(err, themeData);
    throw new Error(strings.responses.invalid_theme);
  }

  const theme = await Theme.create({
    id: themeData.id,
    name: themeData.name,
    layout: layout,
    styles: styles,
    screenshot: themeData.screenshot,
    url: themeData.url,
  });

  return transformThemeForOutput(theme);
};

const transformThemeForOutput = (theme) =>
  theme
    ? {
        id: theme.id,
        name: theme.name,
        layout: theme.layout ? JSON.stringify(theme.layout) : "",
        styles: theme.styles ? JSON.stringify(theme.styles) : "",
        screenshot: theme.screenshot,
        url: theme.url,
        active: theme.active,
      }
    : null;
