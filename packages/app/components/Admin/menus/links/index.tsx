import React, { useState, useEffect } from "react";
import { Grid, Button } from "@mui/material";
import { ADD_NEW_LINK_BUTTON } from "../../../../ui-config/strings";
import { FetchBuilder } from "@courselit/utils";
import { connect } from "react-redux";
import { actionCreators } from "@courselit/state-management";
import dynamic from "next/dynamic";
import type { AppDispatch, AppState } from "@courselit/state-management";
import type { Auth, Address, Link } from "@courselit/common-models";

const { networkAction } = actionCreators;

const NavigationLinkItem = dynamic(() => import("./navigation-link-item"));

interface NavigationLinksProps {
  auth: Auth;
  dispatch: AppDispatch;
  address: Address;
}

const NavigationLinks = (props: NavigationLinksProps) => {
  const [links, setLinks] = useState<Link[]>([]);
  const { dispatch, address, auth } = props;

  useEffect(() => {
    getMenu();
  }, []);

  const getMenu = async () => {
    const query = `
        query {
            links: getMenuAsAdmin {
                id,
                text,
                destination,
                newTab,
                category
            }
        }
        `;
    const fetch = new FetchBuilder()
      .setUrl(`${address.backend}/api/graph`)
      .setIsGraphQLEndpoint(true)
      .setPayload(query)
      .build();

    try {
      dispatch(networkAction(true));
      const response = await fetch.exec();
      if (response.links) {
        setLinks(response.links);
      }
    } finally {
      dispatch(networkAction(false));
    }
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

  const removeItemAt = (index: number) => {
    const arrayToRemoveComponentFrom = Array.from(links);
    arrayToRemoveComponentFrom.splice(index, 1);

    setLinks(arrayToRemoveComponentFrom);
  };

  return (
    <Grid item container xs spacing={1}>
      {links.map((link, index) => (
        <NavigationLinkItem
          key={link.destination}
          index={index}
          link={link}
          removeItem={removeItemAt}
        />
      ))}
      <Grid item>
        <Button onClick={addEmptyLinkItem}>{ADD_NEW_LINK_BUTTON}</Button>
      </Grid>
    </Grid>
  );
};

const mapStateToProps = (state: AppState) => ({
  auth: state.auth,
  address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(NavigationLinks);
