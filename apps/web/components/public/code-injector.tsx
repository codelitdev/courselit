"use client";

import React from "react";
import { connect } from "react-redux";
import { AppState } from "@courselit/state-management";

type InjectionSection = "head" | "body";

interface CodeInjectorProps {
    head?: string;
    body?: string;
}

export class CodeInjector extends React.Component<CodeInjectorProps> {
    componentDidMount() {
        const targetTagsForInjection: InjectionSection[] = ["head", "body"];
        for (const target of targetTagsForInjection) {
            this.injectCodeIn(target);
        }
    }

    injectCodeIn(targetHTMLTag: InjectionSection) {
        const tempContainer = document.createElement("div");
        tempContainer.innerHTML = this.props[targetHTMLTag] || "";
        const children = tempContainer.children;
        for (let i = 0; i < children.length; i++) {
            let elem = children[i];
            if (elem.nodeName === "SCRIPT") {
                const script = document.createElement("script");
                script.innerHTML = elem.innerHTML;
                this.copyAttributes(elem, script);
                elem = script;
            }
            (document as Record<string, any>)[targetHTMLTag]?.appendChild(elem);
        }
    }

    copyAttributes(source: Element, target: HTMLScriptElement) {
        let attr;
        const attributes = Array.prototype.slice.call(source.attributes);
        while ((attr = attributes.pop())) {
            (target.setAttribute as (name: string, value: string) => void)(
                attr.nodeName,
                attr.nodeValue,
            );
        }
    }

    render() {
        return null;
    }
}

const mapStateToProps = (state: AppState) => ({
    head: state.siteinfo.codeInjectionHead,
    body: state.siteinfo.codeInjectionBody,
});

export default connect(mapStateToProps)(CodeInjector);
