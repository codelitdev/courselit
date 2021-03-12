/**
 * Business logic for managing widgets information.
 */

// TODO: Write tests for this file.
const strings = require("../../config/strings.js");
const { checkIfAuthenticated } = require("../../lib/graphql.js");
const Widget = require("../../models/Widget.js");

exports.getWidgetSettings = async (name, ctx) => {
  const widget = await Widget.findOne({ name, domain: ctx.domain._id });

  if (!widget) {
    return {};
  }

  return {
    settings: widget.settings,
  };
};

exports.getWidgetData = async (name, ctx) => {
  checkIfAuthenticated(ctx);

  if (!ctx.user.isAdmin) throw new Error(strings.responses.is_not_admin);

  const widget = await Widget.findOne({ name, domain: ctx.domain._id });

  if (!widget) {
    return {};
  }

  return {
    data: widget.data,
  };
};

exports.saveWidgetSettings = async (widgetSettingsData, ctx) => {
  checkIfAuthenticated(ctx);

  if (!ctx.user.isAdmin) throw new Error(strings.responses.is_not_admin);

  if (widgetSettingsData.settings !== undefined) {
    try {
      JSON.parse(widgetSettingsData.settings);
    } catch (err) {
      throw new Error(strings.responses.invalid_format);
    }
  }

  let widgetSettings = await Widget.findOne({
    name: widgetSettingsData.name,
    domain: ctx.domain._id,
  });

  let shouldCreate = false;
  if (!widgetSettings) {
    shouldCreate = true;
    widgetSettings = {
      domain: ctx.domain._id,
    };
  }

  // populate changed data
  for (const key of Object.keys(widgetSettingsData)) {
    widgetSettings[key] = widgetSettingsData[key];
  }

  if (!widgetSettings.data) {
    widgetSettings.data = "[]";
  }

  if (shouldCreate) {
    widgetSettings = await Widget.create(widgetSettings);
  } else {
    widgetSettings = await widgetSettings.save();
  }

  return widgetSettings;
};

exports.saveWidgetData = async (widgetData, ctx) => {
  let data;
  if (widgetData.data !== undefined) {
    try {
      data = JSON.parse(widgetData.data);
    } catch (err) {
      throw new Error(strings.responses.invalid_format);
    }
  }

  const widget = await Widget.findOne({
    name: widgetData.name,
    domain: ctx.domain._id,
  });

  if (!widget) {
    throw new Error(strings.responses.item_not_found);
  }

  const existingData = JSON.parse(widget.data);
  existingData.push(data);
  widget.data = JSON.stringify(existingData);

  await widget.save();

  return true;
};

exports.clearWidgetData = async (name, ctx) => {
  checkIfAuthenticated(ctx);

  if (!ctx.user.isAdmin) throw new Error(strings.responses.is_not_admin);

  const widget = await Widget.findOne({ name, domain: ctx.domain._id });

  if (!widget) {
    throw new Error(strings.responses.item_not_found);
  }

  widget.data = "[]";
  await widget.save();

  return true;
};
