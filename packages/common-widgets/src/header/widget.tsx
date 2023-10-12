import React from "react";
import Settings, { Link } from "./settings";
import {
    Image,
    Menu2,
    Link as AppLink,
    MenuItem,
} from "@courselit/components-library";
import { Menu as MenuIcon, Person } from "@courselit/icons";
import { State, UIConstants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";

interface WidgetProps {
    settings: Settings;
    state: State;
}

export default function Widget({ state, settings }: WidgetProps) {
    const linkClasses = "flex w-full";

    return (
        <header
            className="flex items-center p-4"
            style={{
                backgroundColor: settings.appBarBackground,
            }}
        >
            <AppLink href="/" className="!no-underline">
                <div className="flex items-center mr-2">
                    {state.siteinfo.logo && (
                        <div className="mr-2">
                            <Image
                                src={state.siteinfo.logo.file}
                                borderRadius={2}
                                width="w-[32px]"
                                height="h-[32px]"
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
            </AppLink>
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
                                <AppLink href={link.href}>{link.label}</AppLink>
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
                    {settings.links &&
                        (settings.links as Link[]).map((link: Link) => (
                            <MenuItem key={link.href}>
                                <AppLink
                                    className={linkClasses}
                                    href={link.href}
                                >
                                    {link.label}
                                </AppLink>
                            </MenuItem>
                        ))}
                    {state.profile.fetched &&
                        checkPermission(state.profile.permissions, [
                            UIConstants.permissions.enrollInCourse,
                        ]) && (
                            <MenuItem>
                                <AppLink
                                    className={linkClasses}
                                    href={"/my-content"}
                                >
                                    My content
                                </AppLink>
                            </MenuItem>
                        )}
                    {!state.auth.guest && (
                        <MenuItem>
                            <AppLink className={linkClasses} href={"/profile"}>
                                Profile
                            </AppLink>
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
                                <AppLink
                                    href={"/dashboard/products"}
                                    className={linkClasses}
                                >
                                    Dashboard
                                </AppLink>
                            </MenuItem>
                        )}
                    <MenuItem>
                        <AppLink
                            className={linkClasses}
                            href={state.auth.guest ? "/login" : "/logout"}
                        >
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
                                <AppLink
                                    href={"/my-content"}
                                    className={linkClasses}
                                >
                                    My content
                                </AppLink>
                            </MenuItem>
                        )}
                    {!state.auth.guest && (
                        <MenuItem>
                            <AppLink href={"/profile"} className={linkClasses}>
                                Profile
                            </AppLink>
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
                                <AppLink
                                    href={"/dashboard/products"}
                                    className={linkClasses}
                                >
                                    Dashboard
                                </AppLink>
                            </MenuItem>
                        )}
                    <MenuItem>
                        <AppLink
                            href={state.auth.guest ? "/login" : "/logout"}
                            className={linkClasses}
                        >
                            {state.auth.guest ? "Login" : "Logout"}
                        </AppLink>
                    </MenuItem>
                </Menu2>
            </div>
        </header>
    );
}
