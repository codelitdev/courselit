import React, { useState } from "react";
import { styled } from "@mui/material/styles";
import { Grid, Button } from "@mui/material";
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

const PREFIX = "ThemeItem";

const classes = {
    container: `${PREFIX}-container`,
};

const StyledGrid = styled(Grid)(({ theme }: { theme: any }) => ({
    [`&.${classes.container}`]: {
        border: "1px solid transparent",
        "&:hover": {
            border: "1px solid #ccc",
        },
    },
}));

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
        <StyledGrid
            item
            container
            justifyContent="space-between"
            alignItems="center"
            className={classes.container}
        >
            <Grid item>{props.theme.name}</Grid>
            <Grid item>
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
            </Grid>
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
        </StyledGrid>
    );
};

export default ThemeItem;
