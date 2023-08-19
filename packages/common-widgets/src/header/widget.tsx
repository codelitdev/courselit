import React from "react";
import { Avatar } from "@mui/material";
import Settings, { Link } from "./settings";
import { Image, Menu } from "@courselit/components-library";
import { Cross as Close, Menu as MenuIcon } from "@courselit/icons";
import { State, UIConstants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import NextLink from "next/link";

interface WidgetProps {
    settings: Settings;
    state: State;
}

export default function Widget({ state, settings }: WidgetProps) {
    return (
        <div
            className="flex items-center p-4"
            style={{
                backgroundColor: settings.appBarBackground,
            }}
        >
            <NextLink href="/">
                <div className="flex items-center mr-2">
                    {state.siteinfo.logo && (
                        <div className="mr-2">
                            <Image
                                src={state.siteinfo.logo.file}
                                height={{ xs: 32, lg: 36 }}
                                width={{ xs: 32, lg: 36 }}
                                borderRadius={2}
                            />
                        </div>
                    )}
                    <p
                        style={{
                            color: settings.logoColor || "inherit",
                        }}
                        className="font-semibold text-2xl"
                    >
                        {state.siteinfo.title}
                    </p>
                </div>
            </NextLink>
            <div
                className={`flex grow ${
                    settings.linkAlignment === "right"
                        ? "justify-end"
                        : "justify-start"
                }`}
            >
                <div className="lg:block hidden">
                    {settings.links &&
                        (settings.links as Link[]).map((link: Link, index) => (
                            <span
                                className="mr-2"
                                style={{
                                    color: settings.linkColor || "inherit",
                                }}
                            >
                                <NextLink href={link.href}>
                                    {link.label}
                                </NextLink>
                            </span>
                        ))}
                </div>
            </div>
            <div className="lg:hidden">
                <Menu
                    icon={
                        <div
                            style={{
                                color: settings.loginBtnBgColor || "inherit",
                            }}
                        >
                            <MenuIcon />
                        </div>
                    }
                    openIcon={
                        <div
                            style={{
                                color: settings.loginBtnBgColor || "inherit",
                            }}
                        >
                            <Close />
                        </div>
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
            </div>
            <div className="lg:block hidden">
                <Menu
                    icon={
                        <Avatar
                            sx={{
                                width: 32,
                                height: 32,
                                color: settings.loginBtnColor || "inherit",
                                bgcolor: settings.loginBtnBgColor || "inherit",
                            }}
                        >
                            {state.profile.fetched
                                ? state.profile.email.charAt(0).toUpperCase()
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
            </div>
        </div>
    );
}
