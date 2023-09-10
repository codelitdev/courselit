import React from "react";
import Settings, { Link } from "./settings";
import { Image, Menu2, Link as AppLink } from "@courselit/components-library";
import { Menu as MenuIcon, Person } from "@courselit/icons";
import { State, UIConstants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import NextLink from "next/link";
import { MenuItem } from "@courselit/components-library";

interface WidgetProps {
    settings: Settings;
    state: State;
}

export default function Widget({ state, settings }: WidgetProps) {
    return (
        <header
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
                        className="font-bold text-2xl"
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
                <div className="lg:!block hidden">
                    {settings.links &&
                        (settings.links as Link[]).map((link: Link, index) => (
                            <span
                                className="mr-2"
                                style={{
                                    color: settings.linkColor || "inherit",
                                }}
                                key={index}
                            >
                                <NextLink href={link.href}>
                                    {link.label}
                                </NextLink>
                            </span>
                        ))}
                </div>
            </div>
            <div className="lg:hidden">
                <Menu2
                    icon={<MenuIcon />}
                    style={{
                        color: settings.loginBtnColor,
                        backgroundColor: settings.loginBtnBgColor,
                    }}
                >
                    {settings.links.map((link) => (
                        <MenuItem key={link.href}>
                            <AppLink href={link.href}>{link.label}</AppLink>
                        </MenuItem>
                    ))}
                    {state.profile.fetched &&
                        checkPermission(state.profile.permissions, [
                            UIConstants.permissions.enrollInCourse,
                        ]) && (
                            <MenuItem>
                                <AppLink href={"/my-content"}>
                                    My content
                                </AppLink>
                            </MenuItem>
                        )}
                    {!state.auth.guest && (
                        <MenuItem>
                            <AppLink href={"/profile"}>Profile</AppLink>
                        </MenuItem>
                    )}
                    {state.profile.fetched &&
                        checkPermission(state.profile.permissions, [
                            UIConstants.permissions.manageCourse,
                            UIConstants.permissions.manageAnyCourse,
                            UIConstants.permissions.manageMedia,
                            UIConstants.permissions.manageAnyMedia,
                            UIConstants.permissions.manageSite,
                            UIConstants.permissions.manageSettings,
                            UIConstants.permissions.manageUsers,
                            UIConstants.permissions.viewAnyMedia,
                        ]) && (
                            <MenuItem>
                                <AppLink href={"/dashboard/products"}>
                                    Dashboard
                                </AppLink>
                            </MenuItem>
                        )}
                    <MenuItem>
                        <AppLink href={state.auth.guest ? "/login" : "/logout"}>
                            {state.auth.guest ? "Login" : "Logout"}
                        </AppLink>
                    </MenuItem>
                </Menu2>
            </div>
            <div className="hidden lg:!block">
                <Menu2
                    icon={<Person />}
                    style={{
                        color: settings.loginBtnColor,
                        backgroundColor: settings.loginBtnBgColor,
                    }}
                >
                    {state.profile.fetched &&
                        checkPermission(state.profile.permissions, [
                            UIConstants.permissions.enrollInCourse,
                        ]) && (
                            <MenuItem>
                                <AppLink href={"/my-content"}>
                                    My content
                                </AppLink>
                            </MenuItem>
                        )}
                    {!state.auth.guest && (
                        <MenuItem>
                            <AppLink href={"/profile"}>Profile</AppLink>
                        </MenuItem>
                    )}
                    {state.profile.fetched &&
                        checkPermission(state.profile.permissions, [
                            UIConstants.permissions.manageCourse,
                            UIConstants.permissions.manageAnyCourse,
                            UIConstants.permissions.manageMedia,
                            UIConstants.permissions.manageAnyMedia,
                            UIConstants.permissions.manageSite,
                            UIConstants.permissions.manageSettings,
                            UIConstants.permissions.manageUsers,
                            UIConstants.permissions.viewAnyMedia,
                        ]) && (
                            <MenuItem>
                                <AppLink href={"/dashboard/products"}>
                                    Dashboard
                                </AppLink>
                            </MenuItem>
                        )}
                    <MenuItem>
                        <AppLink href={state.auth.guest ? "/login" : "/logout"}>
                            {state.auth.guest ? "Login" : "Logout"}
                        </AppLink>
                    </MenuItem>
                </Menu2>
            </div>
        </header>
    );
}
