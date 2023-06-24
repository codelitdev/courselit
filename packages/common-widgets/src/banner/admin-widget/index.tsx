import React, { useState } from "react";
import { Address } from "@courselit/common-models";
import Settings from "../settings";
import { AppDispatch } from "@courselit/state-management";
import CustomSettings from "./custom-settings";

interface AdminWidgetProps {
    name: string;
    settings: Settings;
    onChange: (...args: any[]) => void;
    address: Address;
    networkAction: boolean;
    dispatch: AppDispatch;
}

export default function AdminWidget({
    name,
    settings,
    onChange,
}: AdminWidgetProps) {
    const customSettingsChanged = (customSettings: Settings) => {
        onChange(Object.assign({}, settings, customSettings));
    };

    return (
        <CustomSettings
            name={name}
            settings={settings}
            onChange={customSettingsChanged}
        />
    );
}
