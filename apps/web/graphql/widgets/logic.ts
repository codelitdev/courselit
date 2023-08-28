import Widget from "../../models/Widget";
import type GQLContext from "../../models/GQLContext";
import { checkIfAuthenticated } from "../../lib/graphql";
import { responses } from "../../config/strings";
import constants from "../../config/constants";
const { permissions } = constants;

export const getWidgetSettings = async (name: string, ctx: GQLContext) => {
    const widget = await Widget.findOne({ name, domain: ctx.subdomain._id });

    if (!widget) {
        return {};
    }

    return {
        settings: widget.settings,
    };
};

export const getWidgetData = async (name: string, ctx: GQLContext) => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageSite])) {
        throw new Error(responses.action_not_allowed);
    }

    const widget = await Widget.findOne({ name, domain: ctx.subdomain._id });

    if (!widget) {
        return {};
    }

    return {
        data: widget.data,
    };
};

export const saveWidgetSettings = async (
    widgetSettingsData: Record<string, unknown>,
    ctx: GQLContext,
) => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageSite])) {
        throw new Error(responses.action_not_allowed);
    }

    if (widgetSettingsData.settings !== undefined) {
        try {
            JSON.parse(<string>widgetSettingsData.settings);
        } catch (err) {
            throw new Error(responses.invalid_format);
        }
    }

    let widgetSettings = await Widget.findOne({
        name: widgetSettingsData.name,
        domain: ctx.subdomain._id,
    });

    let shouldCreate = false;
    if (!widgetSettings) {
        shouldCreate = true;
        widgetSettings = {
            domain: ctx.subdomain._id,
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

export const saveWidgetData = async (
    widgetData: Record<string, unknown>,
    ctx: GQLContext,
) => {
    let data;
    if (widgetData.data !== undefined) {
        try {
            data = JSON.parse(<string>widgetData.data);
        } catch (err) {
            throw new Error(responses.invalid_format);
        }
    }

    const widget = await Widget.findOne({
        name: widgetData.name,
        domain: ctx.subdomain._id,
    });

    if (!widget) {
        throw new Error(responses.item_not_found);
    }

    const existingData = JSON.parse(widget.data);
    existingData.push(data);
    widget.data = JSON.stringify(existingData);

    await widget.save();

    return true;
};

export const clearWidgetData = async (name: string, ctx: GQLContext) => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageSite])) {
        throw new Error(responses.action_not_allowed);
    }

    const widget = await Widget.findOne({ name, domain: ctx.subdomain._id });

    if (!widget) {
        throw new Error(responses.item_not_found);
    }

    widget.data = "[]";
    await widget.save();

    return true;
};

export const getSiteWidgets = async (ctx: GQLContext) => {
    const widgets = await Widget.find({ domain: ctx.subdomain._id });

    return widgets;
};
