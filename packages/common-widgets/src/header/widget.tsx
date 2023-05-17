import React from "react";
import { Avatar, Box, Grid, Link as MuiLink, Typography } from "@mui/material";
import Settings, { Link } from "./settings";
import { Image, Menu, Link as NextLink } from "@courselit/components-library";
import { Close, Menu as MenuIcon } from "@mui/icons-material";
import { State, UIConstants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";

interface WidgetProps {
    settings: Settings;
    state: State;
}

export default function Widget({ state, settings }: WidgetProps) {
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
                <Grid container alignItems="center">
                    {state.siteinfo.logo && (
                        <Grid item sx={{ mr: 1 }}>
                            <Image
                                src={state.siteinfo.logo.file}
                                height={{ xs: 32, lg: 36 }}
                                width={{ xs: 32, lg: 36 }}
                                borderRadius={2}
                            />
                        </Grid>
                    )}
                    <Grid item>
                        <NextLink
                            href="/"
                            sxProps={{
                                textDecoration: "none",
                                cursor: "pointer",
                            }}
                        >
                            <Typography
                                color={
                                    (settings.logoColor as string) || "inherit"
                                }
                                variant="h6"
                            >
                                {state.siteinfo.title}
                            </Typography>
                        </NextLink>
                    </Grid>
                </Grid>
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
                            <Grid item sx={{ mr: 1 }} key={index}>
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
                {/*
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
                */}
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
                                    color: settings.loginBtnColor || "inherit",
                                    bgcolor:
                                        settings.loginBtnBgColor || "inherit",
                                }}
                            >
                                {state.profile.fetched
                                    ? state.profile.email
                                          .charAt(0)
                                          .toUpperCase()
                                    : undefined}
                            </Avatar>
                        }
                        options={[
                            state.profile.fetched &&
                            checkPermission(state.profile.permissions, [
                                UIConstants.permissions.enrollInCourse,
                            ])
                                ? {
                                      label: "My content",
                                      type: "link",
                                      href: "/my-content",
                                  }
                                : undefined,
                            state.auth.guest
                                ? undefined
                                : {
                                      label: "Profile",
                                      type: "link",
                                      href: "/profile",
                                  },
                            state.profile.fetched &&
                            checkPermission(state.profile.permissions, [
                                UIConstants.permissions.manageCourse,
                                UIConstants.permissions.manageAnyCourse,
                                UIConstants.permissions.manageMedia,
                                UIConstants.permissions.manageAnyMedia,
                                UIConstants.permissions.manageSite,
                                UIConstants.permissions.manageSettings,
                                UIConstants.permissions.manageUsers,
                                UIConstants.permissions.viewAnyMedia,
                            ])
                                ? {
                                      label: "Dashboard",
                                      type: "link",
                                      href: "/dashboard/products",
                                  }
                                : undefined,
                            {
                                label: state.auth.guest ? "Login" : "Logout",
                                type: "link",
                                href: state.auth.guest ? "/login" : "/logout",
                            },
                        ]}
                    />
                </Box>
                {/* )} */}
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
                            ...(settings.links
                                ? settings.links.map((link) => ({
                                      label: link.label,
                                      type: "link" as "link",
                                      href: link.href,
                                  }))
                                : []),
                            state.profile.fetched &&
                            checkPermission(state.profile.permissions, [
                                UIConstants.permissions.enrollInCourse,
                            ])
                                ? {
                                      label: "My content",
                                      type: "link",
                                      href: "/my-content",
                                  }
                                : undefined,
                            state.auth.guest
                                ? undefined
                                : {
                                      label: "Profile",
                                      type: "link",
                                      href: "/profile",
                                  },
                            state.profile.fetched &&
                            checkPermission(state.profile.permissions, [
                                UIConstants.permissions.manageCourse,
                                UIConstants.permissions.manageAnyCourse,
                                UIConstants.permissions.manageMedia,
                                UIConstants.permissions.manageAnyMedia,
                                UIConstants.permissions.manageSite,
                                UIConstants.permissions.manageSettings,
                                UIConstants.permissions.manageUsers,
                                UIConstants.permissions.viewAnyMedia,
                            ])
                                ? {
                                      label: "Dashboard",
                                      type: "link",
                                      href: "/dashboard/products",
                                  }
                                : undefined,
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
