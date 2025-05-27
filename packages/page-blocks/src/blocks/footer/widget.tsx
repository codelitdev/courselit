import React from "react";
import { Link } from "@courselit/components-library";
import Settings from "./settings";
import { State } from "@courselit/common-models";
import {
    titleFontSize as defaultTitleFontSize,
    socials as defaultSocials,
    socialIconsSize as defaultSocialIconsSize,
} from "./defaults";
import {
    Facebook,
    Twitter,
    LinkedIn,
    Instagram,
    Github,
    Discord,
    Youtube,
} from "@courselit/icons";
import {
    Header1,
    Header4,
    Link as PageLink,
    Section,
} from "@courselit/page-primitives";
import clsx from "clsx";
import { ThemeStyle } from "@courselit/page-models";

export interface WidgetProps {
    settings: Settings;
    state: State;
}

const Widget = ({
    settings: {
        verticalPadding,
        sections,
        titleFontSize = defaultTitleFontSize,
        socials = defaultSocials,
        socialIconsSize = defaultSocialIconsSize,
        maxWidth,
    },
    state,
}: WidgetProps) => {
    const { theme } = state;
    const overiddenTheme: ThemeStyle = JSON.parse(JSON.stringify(theme.theme));
    overiddenTheme.structure.page.width =
        maxWidth || theme.theme.structure.page.width;
    overiddenTheme.structure.section.padding.y =
        verticalPadding || theme.theme.structure.section.padding.y;

    return (
        <Section theme={overiddenTheme} component="footer" className="border-t">
            <div
                className={`flex flex-col lg:justify-between lg:!flex-row w-full gap-4`}
            >
                <div className="flex flex-col gap-4">
                    <Header1
                        className={`text-${titleFontSize}xl mb-4 font-bold`}
                        theme={overiddenTheme}
                    >
                        {state.siteinfo.title}
                    </Header1>
                    <div className="flex flex-wrap gap-4 items-center mb-8">
                        {Object.keys(socials).map((key) => (
                            <React.Fragment key={key}>
                                {socials[key] && (
                                    <Link key={key} href={socials[key]}>
                                        {key === "facebook" && (
                                            <Facebook
                                                width={socialIconsSize}
                                                height={socialIconsSize}
                                            />
                                        )}
                                        {key === "twitter" && (
                                            <Twitter
                                                width={socialIconsSize}
                                                height={socialIconsSize}
                                            />
                                        )}
                                        {key === "instagram" && (
                                            <Instagram
                                                width={socialIconsSize}
                                                height={socialIconsSize}
                                            />
                                        )}
                                        {key === "linkedin" && (
                                            <LinkedIn
                                                width={socialIconsSize}
                                                height={socialIconsSize}
                                            />
                                        )}
                                        {key === "youtube" && (
                                            <Youtube
                                                width={socialIconsSize}
                                                height={socialIconsSize}
                                            />
                                        )}
                                        {key === "github" && (
                                            <Github
                                                width={socialIconsSize}
                                                height={socialIconsSize}
                                            />
                                        )}
                                        {key === "discord" && (
                                            <Discord
                                                width={socialIconsSize}
                                                height={socialIconsSize}
                                            />
                                        )}
                                    </Link>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                    {!state.siteinfo.hideCourseLitBranding && (
                        <span className="flex justify-start align-center">
                            <Link
                                href={`https://courselit.app`}
                                openInSameTab={false}
                                className="px-2 py-1 border rounded-md bg-[#FFFFFF] text-[#000000] text-sm text-center"
                            >
                                Powered by{" "}
                                <span className="font-semibold">CourseLit</span>
                            </Link>
                        </span>
                    )}
                </div>
                <div className="flex flex-col flex-wrap lg:!flex-row gap-8">
                    {sections &&
                        sections.length > 0 &&
                        sections.map((section) => (
                            <div
                                key={section.name}
                                className="flex flex-col lg:max-w-[160px]"
                            >
                                <Header4
                                    className={clsx("mb-4", "text-sm")}
                                    theme={overiddenTheme}
                                >
                                    {section.name}
                                </Header4>
                                <div className="flex flex-col gap-2">
                                    {section.links.map((link, index) => (
                                        <Link key={index} href={link.href}>
                                            <PageLink
                                                theme={overiddenTheme}
                                                className="text-xs"
                                            >
                                                {link.label}
                                            </PageLink>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </Section>
    );
};

export default Widget;
