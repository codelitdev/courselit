import React from "react";
import { Link } from "@courselit/components-library";
import Settings from "./settings";
import { State } from "@courselit/common-models";

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
        titleFontSize,
        sectionHeaderFontSize,
    },
    state,
}: WidgetProps) => {
    const linkProps = {
        color: foregroundColor,
        textDecoration: "none",
    };

    return (
        <footer
            className={`py-[${verticalPadding}px]`}
            style={{
                backgroundColor,
                color: foregroundColor,
            }}
        >
            <div
                className={`flex flex-col lg:justify-between lg:!flex-row px-4 w-full mx-auto lg:max-w-[${horizontalPadding}%] gap-4`}
            >
                <div className="flex flex-col">
                    <h2 className={`text-${titleFontSize}xl mb-4 font-bold`}>
                        {state.siteinfo.title}
                    </h2>
                </div>
                <div className="flex flex-col lg:!flex-row gap-8">
                    {sections.map((section, index) => (
                        <div className="flex flex-col">
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
        </footer>
    );
};

export default Widget;
