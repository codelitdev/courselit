import React from "react";
import Settings, { Link } from "../settings";
import {
    Image,
    Link as AppLink,
    Menu,
    MenuItem2,
    Button2,
} from "@courselit/components-library";
import { Person } from "@courselit/icons";
import { WidgetProps } from "@courselit/common-models";
import MobileNav from "./mobile-nav";
import {
    linkAlignment as defaultLinkAlignment,
    spacingBetweenLinks as defaultSpacingBetweenLinks,
    linkFontWeight as defaultLinkFontWeight,
} from "../defaults";
import { Header4, Section } from "@courselit/page-primitives";
import PageLink from "./link";
import clsx from "clsx";
import { ThemeStyle } from "@courselit/page-models";

export default function Widget({ state, settings }: WidgetProps<Settings>) {
    const { theme } = state;
    const overiddenTheme: ThemeStyle = JSON.parse(JSON.stringify(theme.theme));
    overiddenTheme.structure.page.width =
        settings.maxWidth || theme.theme.structure.page.width;
    overiddenTheme.structure.section.verticalPadding = "py-0";

    const linkClasses = "flex w-full";
    const linkAlignment = settings.linkAlignment || defaultLinkAlignment;
    const spacingBetweenLinks =
        settings.spacingBetweenLinks || defaultSpacingBetweenLinks;
    const linkFontWeight = settings.linkFontWeight || defaultLinkFontWeight;

    return (
        <Section
            theme={overiddenTheme}
            className={clsx(
                "sticky top-0 z-10 bg-white/75 backdrop-blur",
                // !settings.appBarBackground && !theme?.colors?.background && "border-b",
            )}
            style={{
                backgroundColor: settings.appBarBackground,
                color: settings.linkColor,
                borderBottom: `1px solid ${settings.appBarBackground || theme.theme.colors.border}`,
            }}
            component="header"
        >
            <div className={`flex justify-between items-center w-full`}>
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
                        <Header4
                            theme={overiddenTheme}
                            style={{
                                color:
                                    settings.logoColor ||
                                    overiddenTheme?.colors?.text,
                            }}
                        >
                            {state.siteinfo.title}
                        </Header4>
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
                                <PageLink
                                    key={index}
                                    href={link.href}
                                    theme={overiddenTheme}
                                    linkFontWeight={linkFontWeight}
                                    isButton={link.isButton}
                                    label={link.label}
                                    linkColor={settings.linkColor}
                                    btnBgColor={settings.loginBtnBgColor}
                                    btnColor={settings.loginBtnColor}
                                />
                            ))}
                </div>
                <div className="flex gap-2 items-center">
                    {settings.links && (
                        <div className="lg:!block hidden">
                            {settings.links
                                .filter((x) => x.isPrimary)
                                .map((link: Link, index) => (
                                    <PageLink
                                        key={index}
                                        href={link.href}
                                        theme={overiddenTheme}
                                        linkFontWeight={linkFontWeight}
                                        isButton={link.isButton}
                                        label={link.label}
                                        linkColor={settings.linkColor}
                                        btnBgColor={settings.loginBtnBgColor}
                                        btnColor={settings.loginBtnColor}
                                    />
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
                            {!state.auth.guest && (
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
                                        state.auth.guest ? "/login" : "/logout"
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
                        theme={overiddenTheme}
                    />
                </div>
            </div>
        </Section>
    );
}
