import React from "react";
import { connect } from "react-redux";
import { AppState } from "@courselit/state-management";
import { Typeface } from "@courselit/common-models";
import { generateFontString } from "../../ui-lib/utils";

interface CodeInjectorProps {
    router: Record<string, unknown>;
    typefaces: Typeface[];
}

class FontsInjector extends React.Component<CodeInjectorProps> {
    isAnAdminPage() {
        return /^\/dashboard/.test(this.props.router.asPath as string);
    }

    componentDidMount() {
        if (!this.isAnAdminPage()) {
            this.loadFonts();
        }
    }

    loadFonts() {
        const fontString = generateFontString(this.props.typefaces);
        const existingFontsLinks = (document as Record<string, any>)[
            "head"
        ].querySelectorAll(`link[href='${fontString}']`);

        if (!existingFontsLinks.length && fontString) {
            const link = document.createElement("link");
            (link.setAttribute as (name: string, value: string) => void)(
                "href",
                fontString,
            );
            (link.setAttribute as (name: string, value: string) => void)(
                "rel",
                "stylesheet",
            );

            (document as Record<string, any>)["head"].appendChild(link);
        }
    }

    render() {
        return <></>;
    }
}

const mapStateToProps = (state: AppState) => ({
    typefaces: state.typefaces,
});

export default connect(mapStateToProps)(FontsInjector);
