"use client";

/* eslint-disable react-hooks/rules-of-hooks */
import React, { useEffect, FC, PropsWithChildren, useCallback } from "react";
import {
    EditorComponent,
    Remirror,
    ThemeProvider,
    useRemirror,
} from "@remirror/react";
import { TableComponents } from "@remirror/extension-react-tables";
import { AllStyledComponent } from "@remirror/styles/emotion";
import { RemirrorContentType } from "@remirror/core-types";
import { getTextContentFromSlice } from "@remirror/core";
import { InvalidContentHandler } from "remirror";
import BubbleMenu from "./BubbleMenu";
import Toolbar from "./Toolbar";
import { ReactEditorProps } from "./types";
import emptyDoc from "./empty-doc";
import { getExtensions } from "./extensions";

export interface WysiwygEditorProps extends Partial<ReactEditorProps> {
    onChange: (...args: unknown[]) => void;
    showToolbar?: boolean;
    editable?: boolean;
    refresh?: number;
    fontFamily?: string;
    url: string;
}

const WysiwygEditor: FC<PropsWithChildren<WysiwygEditorProps>> = ({
    initialContent,
    onChange,
    placeholder,
    stringHandler,
    children,
    showToolbar = true,
    editable = true,
    refresh,
    fontFamily,
    url,
    ...rest
}) => {
    const theme = {
        fontFamily: {
            default: fontFamily,
        },
    };

    if (typeof window === "undefined") {
        return <></>;
    }

    useEffect(() => {
        manager.view.updateState(
            manager.createState({
                content: initialContent as RemirrorContentType,
            }),
        );
    }, [refresh]);

    const extensions = useCallback(getExtensions(placeholder, url), [
        placeholder,
        url,
    ]);

    const onError: InvalidContentHandler = useCallback(
        ({ json, invalidContent, transformers }) => {
            // Automatically remove all invalid nodes and marks.
            return transformers.remove(json, invalidContent);
        },
        [],
    );

    const {
        manager,
        state,
        onChange: onChangeRemirror,
    } = useRemirror({
        extensions,
        stringHandler,
        content: (initialContent as RemirrorContentType) || emptyDoc,
        onError,
    });

    const onChangeFunc = (data) => {
        setTimeout(() => onChange(data.helpers.getJSON()), 0);
    };

    return (
        <AllStyledComponent>
            <ThemeProvider theme={theme}>
                <Remirror
                    manager={manager}
                    state={state}
                    onChange={(data) => {
                        onChangeRemirror(data);
                        onChangeFunc(data);
                    }}
                    editable={editable}
                    {...rest}
                >
                    {editable && showToolbar && <Toolbar />}
                    <EditorComponent />
                    <BubbleMenu />
                    <TableComponents />
                    {children}
                </Remirror>
            </ThemeProvider>
        </AllStyledComponent>
    );
};

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
(WysiwygEditor as any).getPlainText = (doc: any) =>
    getTextContentFromSlice(doc);
// eslint-disable-next-line  @typescript-eslint/no-explicit-any
(WysiwygEditor as any).emptyDoc = emptyDoc;

export default WysiwygEditor;
