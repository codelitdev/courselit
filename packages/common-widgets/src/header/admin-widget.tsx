import React, { useState } from "react";
import { TextField } from "@mui/material";
import Settings from "./settings";

interface AdminWidgetProps {
    settings: Settings;
    onChange: (...args: any[]) => void;
}

export default function AdminWidget({
    settings = { text: "" },
    onChange,
}: AdminWidgetProps) {
    const [internalSettings, setInternalSettings] = useState(settings);
    console.log("Header admin widget", settings);
    const onChangeText = (e: any) => {
        setInternalSettings({
            text: e.target.value,
        });
        onChange({
            text: e.target.value,
        });
    };

    return (
        <TextField
            value={internalSettings.text}
            onChange={onChangeText}
            name="text"
        />
    );
}
