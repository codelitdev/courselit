import React from "react";
import Settings, { Link } from "../settings";
import {
    Image,
    Link as AppLink,
    Menu,
    Button2,
    MenuItem2,
} from "@courselit/components-library";
import { Person } from "@courselit/icons";
import { State, UIConstants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import { MobileNav } from "./mobile-nav";
import {
    verticalPadding as defaultVerticalPadding,
    horizontalPadding as defaultHorizontalPadding,
    linkAlignment as defaultLinkAlignment,
    spacingBetweenLinks as defaultSpacingBetweenLinks,
    linkFontWeight as defaultLinkFontWeight,
} from "../defaults";

interface WidgetProps {
    settings: Settings;
    state: State;
}

export default function Widget({ state, settings }: WidgetProps) {
    const { verticalPadding, horizontalPadding } = settings;
    const linkClasses = "flex w-full";
    const linkAlignment = settings.linkAlignment || defaultLinkAlignment;
    const spacingBetweenLinks =
        settings.spacingBetweenLinks || defaultSpacingBetweenLinks;
    const linkFontWeight = settings.linkFontWeight || defaultLinkFontWeight;

    return (
        <header
            className={`sticky ${
                !settings.appBarBackground ? "border-b" : ""
            } top-0 z-10 bg-white/75 backdrop-blur py-[${
                verticalPadding || defaultVerticalPadding
            }px]`}
            style={{
                backgroundColor: settings.appBarBackground,
            }}
        >
            <div className="mx-auto lg:max-w-[1200px]">
                <div
                    className={`flex m-auto px-4 justify-between items-center px-4 w-full mx-auto lg:max-w-[${
                        horizontalPadding || defaultHorizontalPadding
                    }%]`}
                >
                    <AppLink href="/" className="!no-underline">
                        <div className="flex items-center">
                            {state.siteinfo.logo && (
                                <div className="mr-2">
                                    <Image
                                        alt={state.siteinfo.logo.caption}
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
                            linkAlignment === "right"
                                ? "justify-end"
                                : linkAlignment === "center"
                                  ? "justify-center"
                                  : "justify-start"
                        }`}
                        style={{
                            gap: `${spacingBetweenLinks}px`,
                        }}
                    >
                        {settings.links &&
                            (settings.links as Link[])
                                .filter((x) => !x.isPrimary)
                                .map((link: Link, index) => (
                                    <span
                                        style={{
                                            color:
                                                settings.linkColor || "inherit",
                                        }}
                                        key={index}
                                    >
                                        <AppLink
                                            href={link.href}
                                            className={`${linkFontWeight}`}
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
                                                    settings.linkColor ||
                                                    "inherit",
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
                                        UIConstants.permissions.manageSite,
                                        UIConstants.permissions.manageSettings,
                                        UIConstants.permissions.manageUsers,
                                    ]) && (
                                        <MenuItem2>
                                            <AppLink
                                                href={"/dashboard"}
                                                className={linkClasses}
                                            >
                                                Dashboard
                                            </AppLink>
                                        </MenuItem2>
                                    )}
                                <MenuItem2>
                                    <AppLink
                                        href={
                                            state.auth.guest
                                                ? "/login"
                                                : "/logout"
                                        }
                                        className={linkClasses}
                                    >
                                        {state.auth.guest ? "Login" : "Logout"}
                                    </AppLink>
                                </MenuItem2>
                            </Menu>
                        )}
                        <MobileNav
                            title={state.siteinfo.title}
                            logo={state.siteinfo.logo}
                            color={settings.loginBtnColor}
                            links={settings.links}
                            linkColor={settings.linkColor}
                            btnBgColor={settings.loginBtnBgColor}
                            btnColor={settings.loginBtnColor}
                            linkFontWeight={linkFontWeight}
                            spacingBetweenLinks={spacingBetweenLinks}
                            appBarBackground={settings.appBarBackground}
                            logoColor={settings.logoColor}
                        />
                    </div>
                </div>
            </div>
        </header>
    );
}
