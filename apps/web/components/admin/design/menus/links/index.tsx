import React, { useState, useEffect } from "react";
import { Grid, Button } from "@mui/material";
import { ADD_NEW_LINK_BUTTON } from "../../../../../ui-config/strings";
import { connect } from "react-redux";
import { actionCreators } from "@courselit/state-management";
import dynamic from "next/dynamic";
import type { AppDispatch, AppState } from "@courselit/state-management";
import type { Auth, Address, Link } from "@courselit/common-models";

const NavigationLinkItem = dynamic(() => import("./navigation-link-item"));

interface NavigationLinksProps {
    auth: Auth;
    dispatch: AppDispatch;
    address: Address;
    navigation: Link[];
}

const NavigationLinks = (props: NavigationLinksProps) => {
    const { dispatch, navigation } = props;
    const [links, setLinks] = useState<Link[]>(navigation);

    useEffect(() => {
        getMenu();
    }, []);

    useEffect(() => {
        setLinks(navigation);
    }, [navigation]);

    const getMenu = async () => {
        await props.dispatch(actionCreators.updateSiteInfo());
    };

    const addEmptyLinkItem = () =>
        setLinks([
            ...links,
            {
                text: "",
                destination: "",
                category: "",
                newTab: false,
            },
        ]);

    return (
        <Grid item container xs spacing={1}>
            {links.map((link, index) => (
                <NavigationLinkItem
                    key={link.destination}
                    index={index}
                    link={link}
                />
            ))}
            <Grid item>
                <Button onClick={addEmptyLinkItem}>
                    {ADD_NEW_LINK_BUTTON}
                </Button>
            </Grid>
        </Grid>
    );
};

const mapStateToProps = (state: AppState) => ({
    navigation: state.navigation,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(NavigationLinks);
