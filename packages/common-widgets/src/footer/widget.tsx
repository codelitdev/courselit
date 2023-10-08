import React from "react";
import { Link } from "@courselit/components-library";
import Settings from "./settings";
import { State } from "@courselit/common-models";

export interface WidgetProps {
    settings: Settings;
    state: State;
}

const Widget = ({
    settings: { backgroundColor, textColor },
    state,
}: WidgetProps) => {
    const linkProps = {
        color: textColor,
        textDecoration: "none",
    };

    return (
        <div
            className="flex justify-between p-4"
            style={{
                backgroundColor: backgroundColor,
                color: textColor,
            }}
        >
            <p>
                © {state.siteinfo.title} {new Date().getFullYear()}
            </p>
            <div className="flex flex-col items-end">
                <Link href="/p/terms" style={linkProps}>
                    Terms of Use
                </Link>
                <Link href="/p/privacy" style={linkProps}>
                    Privacy Policy
                </Link>
            </div>
        </div>
    );
};

export default Widget;
