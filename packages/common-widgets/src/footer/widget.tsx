import { Link } from "@courselit/components-library";
import Settings from "./settings";
import { State } from "@courselit/common-models";
import {
    verticalPadding as defaultVerticalPadding,
    horizontalPadding as defaultHorizontalPadding,
    titleFontSize as defaultTitleFontSize,
    sectionHeaderFontSize as defaultSectionHeaderFontSize,
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

export interface WidgetProps {
    settings: Settings;
    state: State;
}

const Widget = ({
    settings: {
        backgroundColor,
        foregroundColor,
        verticalPadding,
        horizontalPadding,
        sections,
        titleFontSize = defaultTitleFontSize,
        sectionHeaderFontSize = defaultSectionHeaderFontSize,
        socials = defaultSocials,
        socialIconsSize = defaultSocialIconsSize,
    },
    state,
}: WidgetProps) => {
    const linkProps = {
        color: foregroundColor,
        textDecoration: "none",
    };

    return (
        <footer
            className={`py-[${verticalPadding || defaultVerticalPadding}px]`}
            style={{
                backgroundColor,
                color: foregroundColor,
            }}
        >
            <div className="mx-auto lg:max-w-[1200px]">
                <div
                    className={`flex flex-col lg:justify-between lg:!flex-row px-4 w-full mx-auto lg:max-w-[${
                        horizontalPadding || defaultHorizontalPadding
                    }%] gap-4`}
                >
                    <div className="flex flex-col gap-4">
                        <h2
                            className={`text-${titleFontSize}xl mb-4 font-bold`}
                        >
                            {state.siteinfo.title}
                        </h2>
                        <div className="flex flex-wrap gap-4 items-center mb-8">
                            {Object.keys(socials).map((key) => (
                                <>
                                    {socials[key] && (
                                        <Link
                                            key={key}
                                            href={socials[key]}
                                            {...linkProps}
                                        >
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
                                </>
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
                                    <span className="font-semibold">
                                        CourseLit
                                    </span>
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
                                    className="flex flex-col lg:max-w-[100px]"
                                >
                                    <h2
                                        className={`text-lg mb-4 ${sectionHeaderFontSize}`}
                                    >
                                        {section.name}
                                    </h2>
                                    <div className="flex flex-col gap-2">
                                        {section.links.map((link, index) => (
                                            <Link
                                                key={index}
                                                href={link.href}
                                                {...linkProps}
                                            >
                                                {link.label}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Widget;
