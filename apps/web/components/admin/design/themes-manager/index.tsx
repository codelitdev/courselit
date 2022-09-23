import React, { useRef, useState, useEffect } from "react";
import { connect } from "react-redux";
import {
    Grid,
    Typography,
    Link,
    TextField,
    Button,
    TableContainer,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
} from "@mui/material";
import { FetchBuilder } from "@courselit/utils";
import { actionCreators } from "@courselit/state-management";
import { AppMessage, Theme } from "@courselit/common-models";
import {
    APP_MESSAGE_THEME_APPLIED,
    APP_MESSAGE_THEME_COPIED,
    APP_MESSAGE_THEME_INSTALLED,
    APP_MESSAGE_THEME_UNINSTALLED,
    BUTTON_CANCEL_TEXT,
    BUTTON_GET_THEMES,
    BUTTON_THEME_INSTALL,
    CARD_HEADER_THEME,
    ERROR_SNACKBAR_PREFIX,
    NO_THEMES_INSTALLED,
    REMIXED_THEME_PREFIX,
    SUBHEADER_THEME_ADD_THEME,
    SUBHEADER_THEME_ADD_THEME_INPUT_LABEL,
    SUBHEADER_THEME_ADD_THEME_INPUT_PLACEHOLDER,
    THEMES_TABLE_HEADER_NAME,
} from "../../../../ui-config/strings";
import { THEMES_REPO } from "../../../../ui-config/constants";
import ThemeItem from "./theme-item";
import type { Address } from "@courselit/common-models";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { Add } from "@mui/icons-material";
import { Section } from "@courselit/components-library";

const { setAppMessage, networkAction, updateSiteInfo } = actionCreators;

interface ThemesManagerProps {
    address: Address;
    dispatch: AppDispatch;
}

const ThemesManager = ({ address, dispatch }: ThemesManagerProps) => {
    const [installedThemes, setInstalledThemes] = useState([]);
    const [newThemeText, setNewThemeText] = useState("");
    const [isNewThemeTextValid, setIsNewThemeTextValid] = useState(false);
    const [themeEditorVisible, setThemeEditorVisible] = useState(false);
    const themeInputRef = useRef();

    const fetch = new FetchBuilder()
        .setUrl(`${address.backend}/api/graph`)
        .setIsGraphQLEndpoint(true);

    useEffect(() => {
        loadInstalledThemes();
    }, []);

    useEffect(() => {
        if (themeEditorVisible) {
            themeInputRef.current.focus();
        }
    }, [themeEditorVisible]);

    const loadInstalledThemes = async () => {
        const query = `
            query {
                themes: getThemes {
                    name,
                    active,
                    styles,
                    url
                }
            }`;

        const fetcher = fetch.setPayload(query).build();

        try {
            dispatch(networkAction(true));
            const response = await fetcher.exec();
            if (response.themes) {
                setInstalledThemes(response.themes);
            }
        } finally {
            dispatch(networkAction(false));
        }
    };

    const addTheme = async () => {
        try {
            const parsedTheme = JSON.parse(newThemeText);

            const mutation = `
            mutation {
                theme: addTheme(theme: {
                    name: "${parsedTheme.name}",
                    styles: ${JSON.stringify(
                        JSON.stringify(parsedTheme.styles)
                    )},
                    url: "${parsedTheme.url}"
                }) {
                    name 
                }
            }
            `;
            const fetcher = fetch.setPayload(mutation).build();

            const response = await fetcher.exec();
            if (response.errors) {
                throw new Error(
                    `${ERROR_SNACKBAR_PREFIX}: ${response.errors[0].message}`
                );
            }

            if (response.theme) {
                setNewThemeText("");
                setIsNewThemeTextValid(false);
                loadInstalledThemes();
                dispatch(
                    setAppMessage(new AppMessage(APP_MESSAGE_THEME_INSTALLED))
                );
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const validateNewThemeText = (text: string) => {
        if (!text) {
            return false;
        }

        try {
            const parsedTheme = JSON.parse(text);

            if (!parsedTheme.name || !parsedTheme.styles) {
                return false;
            }
        } catch {
            return false;
        }

        return true;
    };

    const onNewThemeTextChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewThemeText(e.target.value);

        if (validateNewThemeText(e.target.value)) {
            setIsNewThemeTextValid(true);
        } else {
            setIsNewThemeTextValid(false);
        }
    };

    const onThemeApply = async (themeName: string) => {
        const mutation = `
          mutation {
            theme: setTheme(name: "${themeName}") {
                name 
            }
          }
        `;

        const fetcher = fetch.setPayload(mutation).build();

        try {
            dispatch(networkAction(true));
            const response = await fetcher.exec();

            if (response.theme) {
                dispatch(
                    setAppMessage(new AppMessage(APP_MESSAGE_THEME_APPLIED))
                );
                loadInstalledThemes();
                await dispatch(updateSiteInfo());
                cancelThemeInstallation();
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const onThemeUninstall = async (themeName: string) => {
        const mutation = `
          mutation c {
            removeTheme(name: "${themeName}")
          }
        `;

        const fetcher = fetch.setPayload(mutation).build();

        try {
            dispatch(networkAction(true));
            const response = await fetcher.exec();

            if (response.removeTheme) {
                dispatch(
                    setAppMessage(new AppMessage(APP_MESSAGE_THEME_UNINSTALLED))
                );
                loadInstalledThemes();
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const onThemeRemix = (themeName: string) => {
        const theme = installedThemes.find(
            (theme: Theme) => theme.name === themeName
        );
        if (theme) {
            const themeCopy: Theme = Object.assign({}, theme);
            themeCopy.name = themeCopy.name + ` ${REMIXED_THEME_PREFIX}`;
            setNewThemeText(JSON.stringify(themeCopy, null, 3));

            dispatch(setAppMessage(new AppMessage(APP_MESSAGE_THEME_COPIED)));
            setThemeEditorVisible(true);
        }
    };

    const cancelThemeInstallation = () => {
        setNewThemeText("");
        setThemeEditorVisible(false);
    };

    return (
        <Grid container direction="column">
            <Grid item sx={{ mb: 2 }}>
                <Grid
                    container
                    justifyContent="space-between"
                    alignItems="center"
                >
                    <Grid item>
                        <Typography variant="h4">
                            {CARD_HEADER_THEME}
                        </Typography>
                    </Grid>
                    {!themeEditorVisible && (
                        <Grid item>
                            <Button
                                onClick={() => setThemeEditorVisible(true)}
                                startIcon={<Add />}
                            >
                                {SUBHEADER_THEME_ADD_THEME}
                            </Button>
                        </Grid>
                    )}
                </Grid>
            </Grid>
            {themeEditorVisible && (
                <Section>
                    <Grid item container direction="column" spacing={2}>
                        <Grid
                            item
                            container
                            justifyContent="space-between"
                            alignItems="center"
                        >
                            <Typography variant="h6">
                                {SUBHEADER_THEME_ADD_THEME}
                            </Typography>
                        </Grid>
                        <Grid item>
                            <form>
                                <TextField
                                    required
                                    variant="outlined"
                                    label={
                                        SUBHEADER_THEME_ADD_THEME_INPUT_LABEL
                                    }
                                    fullWidth
                                    value={newThemeText}
                                    onChange={onNewThemeTextChanged}
                                    placeholder={
                                        SUBHEADER_THEME_ADD_THEME_INPUT_PLACEHOLDER
                                    }
                                    multiline
                                    rows={10}
                                    inputRef={themeInputRef}
                                />
                            </form>
                        </Grid>
                        <Grid item>
                            <Grid container>
                                <Grid item>
                                    <Button
                                        disabled={!isNewThemeTextValid}
                                        onClick={addTheme}
                                    >
                                        {BUTTON_THEME_INSTALL}
                                    </Button>
                                </Grid>
                                <Grid item>
                                    <Button onClick={cancelThemeInstallation}>
                                        {BUTTON_CANCEL_TEXT}
                                    </Button>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </Section>
            )}
            <Grid item sx={{ mb: 2 }}>
                {installedThemes.length === 0 && (
                    <Typography color="textSecondary">
                        {NO_THEMES_INSTALLED}
                    </Typography>
                )}
                {installedThemes.length > 0 && (
                    <TableContainer>
                        <Table aria-label="Themes">
                            <TableHead>
                                <TableRow>
                                    <TableCell>
                                        {THEMES_TABLE_HEADER_NAME}
                                    </TableCell>
                                    <TableCell align="right">
                                        {THEMES_TABLE_HEADER_NAME}
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {installedThemes.map((theme: Theme) => (
                                    <ThemeItem
                                        theme={theme}
                                        key={theme.name}
                                        onApply={onThemeApply}
                                        onRemix={onThemeRemix}
                                        onUninstall={onThemeUninstall}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Grid>
            <Grid item>
                <Link
                    href={THEMES_REPO}
                    target="_blank"
                    rel="noopener"
                    underline="hover"
                >
                    {BUTTON_GET_THEMES}
                </Link>
            </Grid>
        </Grid>
    );
};

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(ThemesManager);
