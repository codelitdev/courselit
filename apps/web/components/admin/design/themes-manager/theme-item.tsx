import React from "react";
import { TableRow, TableCell } from "@mui/material";
import {
    BUTTON_THEME_APPLY,
    BUTTON_THEME_REMIX,
    BUTTON_THEME_UNINSTALL,
    DELETE_THEME_POPUP_HEADER,
    APPLY_THEME_POPUP_HEADER,
} from "../../../../ui-config/strings";
import Theme from "../../../../ui-models/theme";
import { MoreVert } from "@courselit/icons";
import { MenuItem, Menu2 } from "@courselit/components-library";

interface ThemeItemProps {
    theme: Theme;
    onApply: (...args: any[]) => void;
    onRemix: (...args: any[]) => void;
    onUninstall: (...args: any[]) => void;
}

const ThemeItem = (props: ThemeItemProps) => {
    const uninstallTheme = () => {
        props.onUninstall(props.theme.name);
    };

    const applyTheme = () => {
        props.onApply(props.theme.name);
    };

    const generateOptions = () => {
        const options = [];
        if (!props.theme.active) {
            <MenuItem
                component="dialog"
                title={`${APPLY_THEME_POPUP_HEADER} ${props.theme.name}?`}
                triggerChildren={BUTTON_THEME_APPLY}
                onClick={applyTheme}
            ></MenuItem>;
        }
        options.push(
            <MenuItem onSelect={() => props.onRemix(props.theme.name)}>
                {BUTTON_THEME_REMIX}
            </MenuItem>,
        );
        options.push(
            <MenuItem
                component="dialog"
                title={`${DELETE_THEME_POPUP_HEADER} ${props.theme.name}?`}
                triggerChildren={BUTTON_THEME_UNINSTALL}
                onClick={uninstallTheme}
            ></MenuItem>,
        );
        return options;
    };

    return (
        <TableRow>
            <TableCell>{props.theme.name}</TableCell>
            <TableCell align="right">
                <Menu2 icon={<MoreVert />} variant="soft">
                    {generateOptions()}
                </Menu2>
            </TableCell>
        </TableRow>
    );
};

export default ThemeItem;
