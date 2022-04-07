import React, { useState, useEffect } from "react";
import { Grid, Button } from "@mui/material";
import { ADD_NEW_LINK_BUTTON } from "../../../../ui-config/strings";
import FetchBuilder from "../../../../ui-lib/fetch";
import { connect } from "react-redux";
import { networkAction } from "../../../../state/actions";
import dynamic from "next/dynamic";
import { RootState } from "../../../../state/store";
import type Auth from "../../../../ui-models/auth";
import type { ThunkDispatch } from "redux-thunk";
import type Address from "../../../../ui-models/address";
import type { AnyAction } from "redux";
import type UILink from "../../../../ui-models/link";

const NavigationLinkItem = dynamic(() => import("./NavigationLinkItem"));

interface NavigationLinksProps {
  auth: Auth;
  dispatch: ThunkDispatch<RootState, null, AnyAction>;
  address: Address;
}

const NavigationLinks = (props: NavigationLinksProps) => {
  const [links, setLinks] = useState<UILink[]>([]);
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

const mapStateToProps = (state: RootState) => ({
  auth: state.auth,
  address: state.address,
});

const mapDispatchToProps = (dispatch: any) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(NavigationLinks);
