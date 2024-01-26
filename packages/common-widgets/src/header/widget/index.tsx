import React from "react";
import Settings, { Link } from "../settings";
import {
    Image,
    Link as AppLink,
    Menu,
    Button2,
} from "@courselit/components-library";
import { Person } from "@courselit/icons";
import { State, UIConstants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import { MenuItem2 } from "@courselit/components-library";
import { MobileNav } from "./mobile-nav";

interface WidgetProps {
    settings: Settings;
    state: State;
}

export default function Widget({ state, settings }: WidgetProps) {
    const { verticalPadding, horizontalPadding } = settings;
    const linkClasses = "flex w-full";

    return (
        <header
            className={`sticky border-b top-0 z-10 bg-white/75 backdrop-blur py-[${verticalPadding}px]`}
            style={{
                backgroundColor: settings.appBarBackground,
            }}
        >
            <div
                className={`flex m-auto px-4 justify-between items-center px-4 w-full mx-auto lg:max-w-[${horizontalPadding}%]`}
            >
                <AppLink href="/" className="!no-underline">
                    <div className="flex items-center">
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
                            className="font-bold text-xl md:text-2xl"
                        >
                            {state.siteinfo.title}
                        </p>
                    </div>
                </AppLink>
                <div
                    className={`hidden px-4 lg:!flex lg:!grow lg:!items-center ${
                        settings.linkAlignment === "right"
                            ? "justify-end"
                            : settings.linkAlignment === "center"
                            ? "justify-center"
                            : "justify-start"
                    }`}
                    style={{
                        gap: `${settings.spacingBetweenLinks}px`,
                    }}
                >
                    {settings.links &&
                        (settings.links as Link[])
                            .filter((x) => !x.isPrimary)
                            .map((link: Link, index) => (
                                <span
                                    style={{
                                        color: settings.linkColor || "inherit",
                                    }}
                                    key={index}
                                >
                                    <AppLink
                                        href={link.href}
                                        className={`${settings.linkFontWeight}`}
                                    >
                                        {link.isButton && (
                                            <Button2
                                                size="sm"
                                                style={{
                                                    background:
                                                        settings.loginBtnBgColor,
                                                    color: settings.loginBtnColor,
                                                    font: "unset",
                                                    fontSize: "unset",
                                                }}
                                            >
                                                {link.label}
                                            </Button2>
                                        )}
                                        {!link.isButton && link.label}
                                    </AppLink>
                                </span>
                            ))}
                </div>
                <div className="flex gap-2 items-center">
                    {settings.links && (
                        <div className="lg:!block hidden">
                            {settings.links
                                .filter((x) => x.isPrimary)
                                .map((link: Link, index) => (
                                    <span
                                        className="mr-2"
                                        style={{
                                            color:
                                                settings.linkColor || "inherit",
                                        }}
                                        key={index}
                                    >
                                        <AppLink href={link.href}>
                                            {link.isButton && (
                                                <Button2
                                                    size="sm"
                                                    style={{
                                                        background:
                                                            settings.loginBtnBgColor,
                                                        color: settings.loginBtnColor,
                                                        font: "unset",
                                                        fontSize: "unset",
                                                    }}
                                                >
                                                    {link.label}
                                                </Button2>
                                            )}
                                            {!link.isButton && link.label}
                                        </AppLink>
                                    </span>
                                ))}
                        </div>
                    )}
                    {settings.showLoginControl && (
                        <Menu
                            trigger={
                                <Button2
                                    variant="ghost"
                                    className="relative h-8 w-8 rounded-full"
                                    style={{
                                        color: settings.loginBtnColor,
                                        backgroundColor:
                                            settings.loginBtnBgColor,
                                    }}
                                >
                                    <div>
                                        <Person />
                                    </div>
                                </Button2>
                            }
                        >
                            {state.profile.fetched &&
                                checkPermission(state.profile.permissions, [
                                    UIConstants.permissions.enrollInCourse,
                                ]) && (
                                    <MenuItem2>
                                        <AppLink
                                            href={"/my-content"}
                                            className={linkClasses}
                                        >
                                            My content
                                        </AppLink>
                                    </MenuItem2>
                                )}
                            {!state.auth.guest && (
                                <MenuItem2>
                                    <AppLink
                                        href={"/profile"}
                                        className={linkClasses}
                                    >
                                        Profile
                                    </AppLink>
                                </MenuItem2>
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
                                    <MenuItem2>
                                        <AppLink
                                            href={"/dashboard/products"}
                                            className={linkClasses}
                                        >
                                            Dashboard
                                        </AppLink>
                                    </MenuItem2>
                                )}
                            <MenuItem2>
                                <AppLink
                                    href={
                                        state.auth.guest ? "/login" : "/logout"
                                    }
                                    className={linkClasses}
                                >
                                    {state.auth.guest ? "Login" : "Logout"}
                                </AppLink>
                            </MenuItem2>
                        </Menu>
                    )}
                    {/* <Menu2
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
                                <AppLink
                                    href={"/profile"}
                                    className={linkClasses}
                                >
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
                    </Menu2> */}
                    <MobileNav
                        title={state.siteinfo.title}
                        logo={state.siteinfo.logo}
                        color={settings.loginBtnColor}
                        links={settings.links}
                        linkColor={settings.linkColor}
                        btnBgColor={settings.loginBtnBgColor}
                        btnColor={settings.loginBtnColor}
                        linkFontWeight={settings.linkFontWeight}
                        spacingBetweenLinks={settings.spacingBetweenLinks}
                    />
                </div>
            </div>
        </header>
    );
}
