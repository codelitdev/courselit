import React, { FC, PropsWithChildren, useCallback } from "react";
import {
    PlaceholderExtension,
    wysiwygPreset,
    ImageExtension,
} from "remirror/extensions";
import { TableExtension } from "@remirror/extension-react-tables";
import {
    EditorComponent,
    Remirror,
    TableComponents,
    ThemeProvider,
    useRemirror,
} from "@remirror/react";
import { AllStyledComponent } from "@remirror/styles/emotion";

import BubbleMenu from "./BubbleMenu";
import Toolbar from "./Toolbar";
import { ReactEditorProps } from "./types";

export interface WysiwygEditorProps extends Partial<ReactEditorProps> {
    onChange: (...args: any[]) => void;
    showToolbar?: boolean;
    editable?: boolean;
}

export const WysiwygEditor: FC<PropsWithChildren<WysiwygEditorProps>> = ({
    initialContent,
    onChange,
    placeholder,
    stringHandler,
    children,
    showToolbar = true,
    editable = true,
    ...rest
}) => {
    if (typeof window === "undefined") {
        return <></>;
    }

    const wysiwygPresetArrayWithoutImageExtension = wysiwygPreset().filter(
        (extension) => extension instanceof ImageExtension !== true
    );

    const extensions = useCallback(
        () => [
            new PlaceholderExtension({ placeholder }),
            new TableExtension(),
            new ImageExtension({ enableResizing: true }),
            ...wysiwygPresetArrayWithoutImageExtension,
        ],
        [placeholder]
    );

    const {
        manager,
        state,
        onChange: onChangeRemirror,
    } = useRemirror({ extensions, stringHandler });

    const onChangeFunc = (data: any) => {
        onChange(data.helpers.getJSON());
    };

    return (
        <AllStyledComponent>
            <ThemeProvider>
                <Remirror
                    manager={manager}
                    initialContent={initialContent}
                    onChange={(data) => {
                        onChangeFunc(data);
                        onChangeRemirror(data);
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
