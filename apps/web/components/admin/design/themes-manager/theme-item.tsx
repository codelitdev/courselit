import React, { useState } from "react";
import { Grid, Button, TableRow, TableCell } from "@mui/material";
import {
    BUTTON_THEME_APPLY,
    BUTTON_THEME_REMIX,
    BUTTON_THEME_UNINSTALL,
    POPUP_CANCEL_ACTION,
    POPUP_OK_ACTION,
    DELETE_THEME_POPUP_HEADER,
    APPLY_THEME_POPUP_HEADER,
} from "../../../../ui-config/strings";
import AppDialog from "../../../public/app-dialog";
import Theme from "../../../../ui-models/theme";
import { Menu } from "@courselit/components-library";
import { MoreVert } from "@mui/icons-material";

interface ThemeItemProps {
    theme: Theme;
    onApply: (...args: any[]) => void;
    onRemix: (...args: any[]) => void;
    onUninstall: (...args: any[]) => void;
}

const ThemeItem = (props: ThemeItemProps) => {
    const [
        uninstallConfirmationPopupOpened,
        setUninstallConfirmationPopupOpened,
    ] = useState(false);
    const [applyConfirmationPopupOpened, setApplyConfirmationPopupOpened] =
        useState(false);

    const closeUninstallConfirmationPopup = () =>
        setUninstallConfirmationPopupOpened(false);

    const closeApplyConfirmationPopup = () =>
        setApplyConfirmationPopupOpened(false);

    const uninstallTheme = () => {
        setUninstallConfirmationPopupOpened(false);
        props.onUninstall(props.theme.name);
    };

    const applyTheme = () => {
        setApplyConfirmationPopupOpened(false);
        props.onApply(props.theme.name);
    };

    return (
        <TableRow>
            <TableCell>{props.theme.name}</TableCell>
            <TableCell align="right">
                <Menu
                    options={[
                        {
                            label: BUTTON_THEME_APPLY,
                            type: "button",
                            onClick: () =>
                                setApplyConfirmationPopupOpened(true),
                        },
                        {
                            label: BUTTON_THEME_REMIX,
                            type: "button",
                            onClick: () => props.onRemix(props.theme.name),
                        },
                        {
                            label: BUTTON_THEME_UNINSTALL,
                            type: "button",
                            onClick: () =>
                                setUninstallConfirmationPopupOpened(true),
                        },
                    ]}
                    icon={<MoreVert />}
                />
            </TableCell>
            {/* <Grid item>
                <Grid container>
                    {!props.theme.active && (
                        <Grid item>
                            <Button
                                onClick={() =>
                                    setApplyConfirmationPopupOpened(true)
                                }
                            >
                                {BUTTON_THEME_APPLY}
                            </Button>
                        </Grid>
                    )}
                    <Grid item>
                        <Button onClick={() => props.onRemix(props.theme.name)}>
                            {BUTTON_THEME_REMIX}
                        </Button>
                    </Grid>
                    <Grid item>
                        <Button
                            onClick={() =>
                                setUninstallConfirmationPopupOpened(true)
                            }
                        >
                            {BUTTON_THEME_UNINSTALL}
                        </Button>
                    </Grid>
                </Grid>
            </Grid> */}
            <AppDialog
                onOpen={uninstallConfirmationPopupOpened}
                onClose={closeUninstallConfirmationPopup}
                title={`${DELETE_THEME_POPUP_HEADER} ${props.theme.name}?`}
                actions={[
                    {
                        name: POPUP_CANCEL_ACTION,
                        callback: closeUninstallConfirmationPopup,
                    },
                    { name: BUTTON_THEME_UNINSTALL, callback: uninstallTheme },
                ]}
            />
            <AppDialog
                onOpen={applyConfirmationPopupOpened}
                onClose={closeApplyConfirmationPopup}
                title={`${APPLY_THEME_POPUP_HEADER} ${props.theme.name}?`}
                actions={[
                    {
                        name: POPUP_CANCEL_ACTION,
                        callback: closeApplyConfirmationPopup,
                    },
                    { name: BUTTON_THEME_APPLY, callback: applyTheme },
                ]}
            />
        </TableRow>
    );
};

export default ThemeItem;
