import * as React from "react";
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
        color: textColor || "inherit",
        textDecoration: "none",
    };

    return (
        <div
            className="flex justify-between p-4"
            style={{
                backgroundColor: backgroundColor || "inherit",
                color: textColor || "inherit",
            }}
        >
            <p>
                © {state.siteinfo.title} {new Date().getFullYear()}
            </p>
            <div className="flex flex-col items-end">
                <Link href="/p/terms" sxProps={linkProps}>
                    Terms of Use
                </Link>
                <Link href="/p/privacy" sxProps={linkProps}>
                    Privacy Policy
                </Link>
            </div>
        </div>
    );
};

export default Widget;
