import React from "react";
import {
    Avatar,
    Box,
    Button,
    Grid,
    Link as MuiLink,
    Typography,
} from "@mui/material";
import { WidgetProps } from "@courselit/common-models";
import Settings, { Link } from "./settings";
import { Menu } from "@courselit/components-library";
import { Close, Menu as MenuIcon } from "@mui/icons-material";

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
            <Grid
                item
                flexGrow={1}
                sx={{
                    mr: 2,
                    ml: 2,
                    display: { xs: "none", lg: "flex" },
                }}
            >
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
                {state.auth.guest ? (
                    <Box
                        sx={{
                            display: { xs: "none", lg: "flex" },
                        }}
                    >
                        <Menu
                            icon={
                                <Avatar
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        color:
                                            settings.loginBtnColor || "inherit",
                                        bgcolor:
                                            settings.loginBtnBgColor ||
                                            "inherit",
                                    }}
                                />
                            }
                            options={[
                                {
                                    label: "Login",
                                    type: "link",
                                    href: "/login",
                                },
                            ]}
                        />
                    </Box>
                ) : (
                    // <Button
                    //     component="a"
                    //     href="/login"
                    //     sx={{
                    //         color: settings.loginBtnColor || "white",
                    //         backgroundColor:
                    //             settings.loginBtnBgColor || "inherit",
                    //         display: { xs: "none", lg: "flex" },
                    //     }}
                    //     disableElevation
                    // >
                    //     Login
                    // </Button>
                    <Box
                        sx={{
                            display: { xs: "none", lg: "flex" },
                        }}
                    >
                        <Menu
                            icon={
                                <Avatar
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        color:
                                            settings.loginBtnColor || "inherit",
                                        bgcolor:
                                            settings.loginBtnBgColor ||
                                            "inherit",
                                    }}
                                >
                                    {state.profile.fetched
                                        ? state.profile.email
                                              .charAt(0)
                                              .toUpperCase()
                                        : ""}
                                </Avatar>
                            }
                            options={[
                                {
                                    label: "Account",
                                    type: "link",
                                    href: "/account",
                                },
                                {
                                    label: "Logout",
                                    type: "link",
                                    href: "/logout",
                                },
                            ]}
                        />
                    </Box>
                )}
                <Box
                    sx={{
                        display: { xs: "flex", lg: "none" },
                    }}
                >
                    <Menu
                        icon={
                            <MenuIcon
                                sx={{
                                    color:
                                        settings.loginBtnBgColor || "inherit",
                                }}
                            />
                        }
                        openIcon={
                            <Close
                                sx={{
                                    color:
                                        settings.loginBtnBgColor || "inherit",
                                }}
                            />
                        }
                        options={[
                            ...settings.links.map((link) => ({
                                label: link.label,
                                type: "link" as "link",
                                href: link.href,
                            })),
                            state.auth.guest
                                ? undefined
                                : {
                                      label: "Account",
                                      type: "link",
                                      href: "/account",
                                  },
                            {
                                label: state.auth.guest ? "Login" : "Logout",
                                type: "link",
                                href: state.auth.guest ? "/login" : "/logout",
                            },
                        ]}
                    />
                </Box>
            </Grid>
        </Grid>
    );
}
