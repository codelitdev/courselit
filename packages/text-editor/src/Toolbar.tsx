import React, { FC } from "react";
import {
    FormattingButtonGroup,
    HeadingLevelButtonGroup,
    ListButtonGroup,
    RedoButton,
    Toolbar as RemirrorToolbar,
    ToggleBlockquoteButton,
    UndoButton,
} from "@remirror/react-ui";

const Toolbar: FC = () => {
    return (
        <RemirrorToolbar>
            <UndoButton />
            <RedoButton />
            <HeadingLevelButtonGroup showAll />
            <FormattingButtonGroup>
                <ToggleBlockquoteButton />
            </FormattingButtonGroup>
            <ListButtonGroup />
        </RemirrorToolbar>
    );
};

export default Toolbar;
