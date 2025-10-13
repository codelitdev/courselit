import React, { useEffect, useState } from "react";
import Settings, { Link } from "../settings";
import {
    Image,
    Link as AppLink,
    Menu,
    MenuItem2,
    Button2,
} from "@courselit/components-library";
import { Github, Person } from "@courselit/icons";
import { WidgetProps } from "@courselit/common-models";
import MobileNav from "./mobile-nav";
import {
    linkAlignment as defaultLinkAlignment,
    spacingBetweenLinks as defaultSpacingBetweenLinks,
    linkFontWeight as defaultLinkFontWeight,
} from "../defaults";
import {
    Header4,
    Section,
    Link as PrimitiveLink,
    Button,
} from "@courselit/page-primitives";
import PageLink from "./link";
import clsx from "clsx";
import { ThemeStyle } from "@courselit/page-models";
import { Moon, Sun } from "lucide-react";
import { useGithubStars } from "./use-github-stars";

export default function Widget({
    state,
    settings,
    toggleTheme,
    nextTheme,
}: WidgetProps<Settings>) {
    const { theme } = state;
    const overiddenTheme: ThemeStyle = JSON.parse(JSON.stringify(theme.theme));
    overiddenTheme.structure.page.width =
        settings.maxWidth || theme.theme.structure.page.width;
    overiddenTheme.structure.section.padding.y = "py-4";
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const linkClasses = "flex w-full";
    const linkAlignment = settings.linkAlignment || defaultLinkAlignment;
    const spacingBetweenLinks =
        settings.spacingBetweenLinks || defaultSpacingBetweenLinks;
    const linkFontWeight = settings.linkFontWeight || defaultLinkFontWeight;

    let stargazers = 0;
    if (settings.githubRepo && settings.showGithubStars) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { stargazersCount, isLoading, error } = useGithubStars(
            settings.githubRepo,
        );
        stargazers = stargazersCount;
    }
    const cardBorderWidth =
        overiddenTheme?.interactives?.card?.border?.width?.split("-")[1];

    const mainContent = (
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
                    <Header4 theme={overiddenTheme}>
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
                            />
                        ))}
            </div>
            <div className="flex gap-4 items-center">
                {settings.githubRepo && (
                    <div className="lg:!block hidden">
                        <AppLink
                            href={`https://github.com/${settings.githubRepo}`}
                            openInSameTab={false}
                        >
                            <PrimitiveLink
                                theme={overiddenTheme}
                                className="flex items-center gap-2"
                            >
                                <Github width={24} height={24} />
                                {settings.showGithubStars && stargazers > 0 && (
                                    <span className="text-xs">
                                        {formatCompactNumber(stargazers)}
                                    </span>
                                )}
                            </PrimitiveLink>
                        </AppLink>
                    </div>
                )}
                <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                    size="icon"
                    theme={overiddenTheme}
                    onClick={() => toggleTheme()}
                >
                    {isClient &&
                        (nextTheme === "dark" ? (
                            <Sun className="w-4 h-4" />
                        ) : (
                            <Moon className="w-4 h-4" />
                        ))}
                </Button>
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
                                />
                            ))}
                    </div>
                )}
                {settings.showLoginControl && (
                    <div className="lg:!block hidden">
                        <Menu
                            trigger={
                                <Button2
                                    variant="ghost"
                                    className="relative h-8 w-8 rounded-full"
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
                                        <PrimitiveLink
                                            theme={overiddenTheme}
                                            className="!no-underline"
                                        >
                                            Dashboard
                                        </PrimitiveLink>
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
                                    <PrimitiveLink
                                        theme={overiddenTheme}
                                        className="!no-underline"
                                    >
                                        {state.auth.guest ? "Login" : "Logout"}
                                    </PrimitiveLink>
                                </AppLink>
                            </MenuItem2>
                        </Menu>
                    </div>
                )}
                <MobileNav
                    title={state.siteinfo.title}
                    logo={state.siteinfo.logo}
                    links={settings.links}
                    linkFontWeight={linkFontWeight}
                    spacingBetweenLinks={spacingBetweenLinks}
                    theme={overiddenTheme}
                    showLoginControl={settings.showLoginControl}
                    isGuest={state.auth.guest}
                />
            </div>
        </div>
    );

    return (
        <Section
            theme={overiddenTheme}
            className={clsx(
                "sticky top-0 z-20",
                settings.layout === "fixed"
                    ? cardBorderWidth
                        ? `border-b-${cardBorderWidth}`
                        : "border-b"
                    : "",
                settings.layout === "fixed" &&
                    settings.backdropBlur &&
                    "backdrop-blur-2xl",
                settings.layout === "fixed"
                    ? settings.backdropBlur
                        ? "bg-transparent"
                        : "bg-background"
                    : "bg-transparent",
            )}
            component="header"
        >
            {settings.layout === "floating" ? (
                <div
                    className={clsx(
                        "p-2",
                        overiddenTheme?.interactives?.card?.border?.style,
                        overiddenTheme?.interactives?.card?.border?.width,
                        overiddenTheme?.interactives?.card?.border?.radius,
                        settings.backdropBlur
                            ? "backdrop-blur-2xl bg-transparent"
                            : "bg-background",
                    )}
                >
                    {mainContent}
                </div>
            ) : (
                mainContent
            )}
        </Section>
    );
}

function formatCompactNumber(number: number) {
    if (number >= 1000000) {
        return (number / 1000000).toFixed(1) + "M";
    } else if (number >= 1000) {
        return (number / 1000).toFixed(1) + "K";
    }
    return number.toString();
}
