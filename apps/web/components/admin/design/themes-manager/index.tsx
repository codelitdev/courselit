import React, { useRef, useState, useEffect } from "react";
import { styled } from "@mui/material/styles";
import { connect } from "react-redux";
import { Grid, Typography, Link, TextField, Button } from "@mui/material";
import { FetchBuilder } from "@courselit/utils";
import { actionCreators } from "@courselit/state-management";
import { AppMessage, Theme } from "@courselit/common-models";
import {
    APP_MESSAGE_THEME_APPLIED,
    APP_MESSAGE_THEME_COPIED,
    APP_MESSAGE_THEME_INSTALLED,
    APP_MESSAGE_THEME_UNINSTALLED,
    BUTTON_GET_THEMES,
    BUTTON_THEME_INSTALL,
    CARD_HEADER_THEME,
    ERROR_SNACKBAR_PREFIX,
    NO_THEMES_INSTALLED,
    REMIXED_THEME_PREFIX,
    SUBHEADER_THEME_ADD_THEME,
    SUBHEADER_THEME_ADD_THEME_INPUT_LABEL,
    SUBHEADER_THEME_ADD_THEME_INPUT_PLACEHOLDER,
    SUBHEADER_THEME_INSTALLED_THEMES,
} from "../../../../ui-config/strings";
import { THEMES_REPO } from "../../../../ui-config/constants";
import { Section } from "@courselit/components-library";
import ThemeItem from "./theme-item";
import type { Address } from "@courselit/common-models";
import type { AppDispatch, AppState } from "@courselit/state-management";

const { setAppMessage, networkAction, updateSiteInfo } = actionCreators;

const PREFIX = "index";

const classes = {
    section: `${PREFIX}-section`,
    sectionHeader: `${PREFIX}-sectionHeader`,
};

const StyledGrid = styled(Grid)(({ theme }: { theme: any }) => ({
    [`& .${classes.section}`]: {
        marginBottom: theme.spacing(2),
    },

    [`& .${classes.sectionHeader}`]: {
        marginBottom: theme.spacing(2),
    },
}));

interface ThemesManagerProps {
    address: Address;
    dispatch: AppDispatch;
}

const ThemesManager = ({ address, dispatch }: ThemesManagerProps) => {
    const [installedThemes, setInstalledThemes] = useState([]);
    const [newThemeText, setNewThemeText] = useState("");
    const [isNewThemeTextValid, setIsNewThemeTextValid] = useState(false);
    const themeInputRef = useRef();

    const fetch = new FetchBuilder()
        .setUrl(`${address.backend}/api/graph`)
        .setIsGraphQLEndpoint(true);

    useEffect(() => {
        loadInstalledThemes();
    }, []);

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

            themeInputRef.current.focus();
        }
    };

    return (
        <StyledGrid item xs={12}>
            <Section>
                <div className={classes.section}>
                    <Typography variant="h4" className={classes.sectionHeader}>
                        {CARD_HEADER_THEME}
                    </Typography>
                    <Grid container direction="column" spacing={4}>
                        <Grid item>
                            <Typography variant="h5">
                                {SUBHEADER_THEME_INSTALLED_THEMES}
                            </Typography>
                        </Grid>
                        {installedThemes.length !== 0 && (
                            <Grid item container direction="column">
                                {installedThemes.map((theme: Theme) => (
                                    <ThemeItem
                                        theme={theme}
                                        key={theme.name}
                                        onApply={onThemeApply}
                                        onRemix={onThemeRemix}
                                        onUninstall={onThemeUninstall}
                                    />
                                ))}
                            </Grid>
                        )}
                        {installedThemes.length === 0 && (
                            <Grid item>
                                <Typography
                                    variant="body1"
                                    color="textSecondary"
                                >
                                    {NO_THEMES_INSTALLED}
                                </Typography>
                            </Grid>
                        )}
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
                        <Grid item container direction="column" spacing={2}>
                            <Grid
                                item
                                container
                                justifyContent="space-between"
                                alignItems="center"
                            >
                                <Typography variant="h5">
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
                                <Button
                                    disabled={!isNewThemeTextValid}
                                    onClick={addTheme}
                                >
                                    {BUTTON_THEME_INSTALL}
                                </Button>
                            </Grid>
                        </Grid>
                    </Grid>
                </div>
            </Section>
        </StyledGrid>
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
