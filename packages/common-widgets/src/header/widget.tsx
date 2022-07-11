import React from "react";
import { Box, Link as MuiLink, Typography } from "@mui/material";
import { WidgetProps } from "@courselit/common-models";
import { Link } from "./settings";

export default function Widget({ state, settings }: WidgetProps) {
    return (
        <Box>
            <Typography>{state.siteinfo.title}</Typography>
            {settings.links &&
                (settings.links as Link[]).map((link: Link) => (
                    <MuiLink href={link.href}>{link.label}</MuiLink>
                ))}
        </Box>
    );
}
