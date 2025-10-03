import React, { FC } from "react";
import { FloatingToolbar, FormattingButtonGroup } from "@remirror/react-ui";
import FloatingLinkCommandGroup from "./FloatingLinkCommandGroup";

/**
 * Bubble menu for the pre-packaged editors
 */
const BubbleMenu: FC = () => {
    return (
        <FloatingToolbar style={{ zIndex: 20 }}>
            <FormattingButtonGroup />
            <FloatingLinkCommandGroup />
        </FloatingToolbar>
    );
};

export default BubbleMenu;
