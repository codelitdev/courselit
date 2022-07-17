import React, { useState } from "react";
import { Address } from "@courselit/common-models";
import Settings from "../featured/settings";
import { Grid } from "@mui/material";
import { AppDispatch } from "@courselit/state-management";
import CustomSettings from "../featured/admin-widget/custom-settings";

interface AdminWidgetProps {
    settings: Settings;
    onChange: (...args: any[]) => void;
    address: Address;
    networkAction: boolean;
    dispatch: AppDispatch;
}

export default function AdminWidget({ settings, onChange }: AdminWidgetProps) {
    const [productId, setProductId] = useState(settings.entityId || "");
    const customSettingsChanged = (customSettings: Settings) => {
        onChange(Object.assign({}, settings, customSettings));
    };

    return (
        <Grid container>
            {productId && (
                <CustomSettings
                    settings={settings}
                    onChange={customSettingsChanged}
                />
            )}
        </Grid>
    );
}
