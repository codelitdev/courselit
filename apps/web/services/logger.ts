import Log from "../models/Log";
import constants from "../config/constants";

const { severityError, severityInfo, severityWarn } = constants;

export const info = async (
    message: string,
    metadata?: Record<string, unknown>
) => {
    await Log.create({
        severity: severityInfo,
        message,
        metadata,
    });
};

export const warn = async (
    message: string,
    metadata?: Record<string, unknown>
) => {
    await Log.create({
        severity: severityWarn,
        message,
        metadata,
    });
};

export const error = async (
    message: string,
    metadata?: Record<string, unknown>
) => {
    await Log.create({
        severity: severityError,
        message,
        metadata,
    });
};
