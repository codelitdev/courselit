import React, { useState, useRef, useEffect } from "react";
import { styled } from "@mui/material/styles";
import {
    Grid,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormGroup,
    FormControlLabel,
    Checkbox,
    IconButton,
    capitalize,
} from "@mui/material";
import {
    LABEL_NAVIGATION_LINK_TEXT,
    LABEL_NAVIGATION_LINK_DESTINATION,
    LINK_DROPDOWN,
    LABEL_NAVIGATION_LINK_NEWTAB,
} from "../../../../../ui-config/strings";
import {
    NAVIGATION_CATEGORY_MAIN,
    NAVIGATION_CATEGORY_FOOTER,
} from "../../../../../ui-config/constants";
import { Done, Delete } from "@mui/icons-material";
import { connect } from "react-redux";
import { FetchBuilder } from "@courselit/utils";
import { AppMessage } from "@courselit/common-models";
import type { Address, Link } from "@courselit/common-models";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { actionCreators } from "@courselit/state-management";

const { networkAction, setAppMessage, navigationAvailable } = actionCreators;

const PREFIX = "NavigationLinkItem";

const classes = {
    formControl: `${PREFIX}-formControl`,
};

const StyledGrid = styled(Grid)(({ theme }: { theme: any }) => ({
    [`& .${classes.formControl}`]: {
        minWidth: "100%",
        marginTop: theme.spacing(1),
    },
}));

interface NavigationLinkItemProps {
    link: Link;
    dispatch: AppDispatch;
    index: number;
    address: Address;
}

const NavigationLinkItem = (props: NavigationLinkItemProps) => {
    const [link, setLink] = useState<Link>(props.link);
    const inputLabel = useRef(null);
    const [labelWidth, setLabelWidth] = React.useState<number>(0);

    const [dirty, setDirty] = useState(false);
    const [requestInProgress, setRequestInProgress] = useState(false);
    const fetcher = new FetchBuilder()
        .setUrl(`${props.address.backend}/api/graph`)
        .setIsGraphQLEndpoint(true);

    useEffect(() => {
        setLabelWidth(inputLabel.current ? inputLabel.current.offsetWidth : 0);
    }, [props.link]);

    const updateLinkData = (name: string, value: string | boolean) => {
        setLink(
            Object.assign({}, link, {
                [name]: value,
            })
        );
        setDirty(true);
    };

    const isLinkDataValid = () => {
        return link.text && link.destination && link.category;
    };

    const saveLink = async () => {
        const fetch = fetcher.setPayload(getGraphQLMutationString()).build();

        props.dispatch(networkAction(true));
        setRequestInProgress(true);

        try {
            const response = await fetch.exec();
            if (response.link.links) {
                setDirty(false);
                await props.dispatch(navigationAvailable(response.link.links));
            }
        } catch (e: any) {
            props.dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            props.dispatch(networkAction(false));
            setRequestInProgress(false);
        }
    };

    const getGraphQLMutationString = () => {
        if (props.link.id) {
            return `
                mutation {
                    link: saveLink(linkData: {
                        id: "${props.link.id}",
                        text: "${link.text}",
                        destination: "${link.destination}",
                        category: "${link.category}",
                        newTab: ${link.newTab}
                    }) {
                        links {
                            id,
                            text,
                            destination,
                            category,
                            newTab
                        }
                    }
                }
            `;
        } else {
            return `
                mutation a {
                    link: saveLink(linkData: {
                        text: "${link.text}",
                        destination: "${link.destination}",
                        category: "${link.category}",
                        newTab: ${link.newTab}
                    }) {
                        links {
                            id,
                            text,
                            destination,
                            category,
                            newTab
                        }
                    }
                }
            `;
        }
    };

    const deleteLink = async () => {
        if (link.id) {
            await deleteLinkFromServer();
        }
    };

    const deleteLinkFromServer = async () => {
        const mutation = `
            mutation d {
                link: deleteLink(id: "${link.id}") {
                    links {
                        id,
                        text,
                        destination,
                        category,
                        newTab
                    }
                }
            }
        `;
        const fetch = fetcher.setPayload(mutation).build();

        props.dispatch(networkAction(true));
        setRequestInProgress(true);

        try {
            const response = await fetch.exec();
            if (response.link.links) {
                props.dispatch(navigationAvailable(response.link.links));
            }
        } catch (e: any) {
            props.dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            props.dispatch(networkAction(false));
            setRequestInProgress(false);
        }
    };

    return (
        <StyledGrid
            item
            container
            direction="row"
            spacing={1}
            alignItems="center"
        >
            <Grid item xs={12} sm={12} md={3}>
                <TextField
                    variant="outlined"
                    label={LABEL_NAVIGATION_LINK_TEXT}
                    fullWidth
                    margin="normal"
                    type="text"
                    value={link.text}
                    onChange={(e) => updateLinkData("text", e.target.value)}
                />
            </Grid>
            <Grid item xs={12} sm={12} md={3}>
                <TextField
                    variant="outlined"
                    label={LABEL_NAVIGATION_LINK_DESTINATION}
                    fullWidth
                    margin="normal"
                    type="text"
                    value={link.destination}
                    onChange={(e) =>
                        updateLinkData("destination", e.target.value)
                    }
                />
            </Grid>

            <Grid item xs={12} sm={12} md={2}>
                <FormControl variant="outlined" className={classes.formControl}>
                    <InputLabel ref={inputLabel} id="select-type">
                        {LINK_DROPDOWN}
                    </InputLabel>
                    <Select
                        labelId="select-type"
                        value={link.category}
                        onChange={(e) =>
                            updateLinkData("category", e.target.value)
                        }
                        labelWidth={labelWidth}
                        inputProps={{
                            name: "category",
                        }}
                    >
                        <MenuItem value={NAVIGATION_CATEGORY_MAIN}>
                            {capitalize(NAVIGATION_CATEGORY_MAIN)}
                        </MenuItem>
                        <MenuItem value={NAVIGATION_CATEGORY_FOOTER}>
                            {capitalize(NAVIGATION_CATEGORY_FOOTER)}
                        </MenuItem>
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={12} sm={12} md={2}>
                <FormControl className={classes.formControl}>
                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={link.newTab}
                                    onChange={(e) =>
                                        updateLinkData(
                                            "newTab",
                                            e.target.checked
                                        )
                                    }
                                />
                            }
                            label={LABEL_NAVIGATION_LINK_NEWTAB}
                        />
                    </FormGroup>
                </FormControl>
            </Grid>
            <Grid item xs={12} sm={12} md={1}>
                {dirty && isLinkDataValid() && (
                    <IconButton
                        onClick={saveLink}
                        disabled={requestInProgress}
                        size="large"
                    >
                        <Done />
                    </IconButton>
                )}
            </Grid>
            <Grid item xs={12} sm={12} md={1}>
                <IconButton
                    onClick={deleteLink}
                    disabled={requestInProgress}
                    size="large"
                >
                    <Delete />
                </IconButton>
            </Grid>
        </StyledGrid>
    );
};

const mapStateToProps = (state: AppState) => ({
    networkAction: state.networkAction,
    address: state.address,
});

const mapDispatchToProps = (dispatch: any) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(NavigationLinkItem);
