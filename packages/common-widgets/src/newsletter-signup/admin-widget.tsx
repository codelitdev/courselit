import React from "react";
import type { Address } from "@courselit/common-models";
import { AppDispatch } from "@courselit/state-management";
import { Grid } from "@mui/material";
import Settings from "./settings";

interface AdminWidgetProps {
    name: string;
    settings: Settings;
    onChange: (...args: any[]) => void;
    address: Address;
    networkAction: boolean;
    dispatch: AppDispatch;
}

export default function AdminWidget({ settings: Settings }: AdminWidgetProps) {
    return <Grid container></Grid>;
}
