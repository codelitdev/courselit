import React from "react";
import { Button, Grid, Link as MuiLink, Typography } from "@mui/material";
import { WidgetProps } from "@courselit/common-models";
import Settings, { Link } from "./settings";

export default function Widget({ state, settings }: WidgetProps<Settings>) {
    return (
        <Grid
            container
            alignItems="center"
            justifyContent="space-between"
            sx={{
                backgroundColor: settings.appBarBackground || "#eee",
                p: 2,
            }}
        >
            <Grid item>
                <Typography
                    color={(settings.logoColor as string) || "inherit"}
                    variant="h6"
                >
                    {state.siteinfo.title}
                </Typography>
            </Grid>
            <Grid item flexGrow={1} sx={{ mr: 2, ml: 2 }}>
                <Grid
                    container
                    alignItems="center"
                    justifyContent={
                        settings.linkAlignment === "right"
                            ? "flex-end"
                            : "flex-start"
                    }
                >
                    {settings.links &&
                        (settings.links as Link[]).map((link: Link, index) => (
                            <Grid item sx={{ mr: 1 }}>
                                <MuiLink
                                    href={link.href}
                                    sx={{
                                        textDecoration: "none",
                                    }}
                                    color={settings.linkColor || "inherit"}
                                    key={index}
                                >
                                    {link.label}
                                </MuiLink>
                            </Grid>
                        ))}
                </Grid>
            </Grid>
            <Grid item>
                <Button
                    component="a"
                    href="/login"
                    sx={{
                        color: settings.loginBtnColor || "white",
                        backgroundColor: settings.loginBtnBgColor || "inherit",
                    }}
                    disableElevation
                >
                    Login
                </Button>
            </Grid>
        </Grid>
    );
}
