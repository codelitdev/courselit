import React from "react";
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
    pageData: Record<string, unknown>;
}

export default function AdminWidget({
    name,
    settings,
    onChange,
    pageData,
    address,
}: AdminWidgetProps) {
    const customSettingsChanged = (customSettings: Settings) => {
        onChange(Object.assign({}, settings, customSettings));
    };

    return (
        <CustomSettings
            name={name}
            settings={settings}
            onChange={customSettingsChanged}
            pageData={pageData}
            address={address}
        />
    );
}
