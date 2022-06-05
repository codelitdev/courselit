import React from "react";
import { connect } from "react-redux";
import { AppState } from "@courselit/state-management";

interface CodeInjectorProps {
    codeForHead?: string;
}

class CodeInjector extends React.Component<CodeInjectorProps> {
    componentDidMount() {
        const targetTagsForInjection = ["head"];
        for (const target of targetTagsForInjection) {
            this.injectCodeIn(target);
        }
    }

    injectCodeIn(targetHTMLTag: string) {
        const tempContainer = document.createElement("div");
        tempContainer.innerHTML = this.props.codeForHead || "";
        const children = tempContainer.children;
        for (let i = 0; i < children.length; i++) {
            let elem = children[i];
            if (elem.nodeName === "SCRIPT") {
                const script = document.createElement("script");
                script.innerHTML = elem.innerHTML;
                this.copyAttributes(elem, script);
                elem = script;
            }
            (document as Record<string, any>)[targetHTMLTag].appendChild(elem);
        }
    }

    copyAttributes(source: Element, target: HTMLScriptElement) {
        let attr;
        const attributes = Array.prototype.slice.call(source.attributes);
        while ((attr = attributes.pop())) {
            (target.setAttribute as (name: string, value: string) => void)(
                attr.nodeName,
                attr.nodeValue
            );
        }
    }

    render() {
        return <></>;
    }
}

const mapStateToProps = (state: AppState) => ({
    codeForHead: state.siteinfo.codeInjectionHead,
});

export default connect(mapStateToProps)(CodeInjector);
