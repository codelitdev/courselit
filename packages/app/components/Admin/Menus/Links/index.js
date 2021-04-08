import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Grid, Button } from "@material-ui/core";
import { ADD_NEW_LINK_BUTTON } from "../../../../config/strings";
import FetchBuilder from "../../../../lib/fetch";
import { connect } from "react-redux";
import { authProps, addressProps } from "../../../../types";
import { networkAction } from "../../../../redux/actions";
import dynamic from "next/dynamic";
const NavigationLinkItem = dynamic(() => import("./NavigationLinkItem"));

const NavigationLinks = (props) => {
  const [links, setLinks] = useState([]);

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
      .setUrl(`${props.address.backend}/graph`)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(props.auth.token)
      .setPayload(query)
      .build();
    try {
      props.dispatch(networkAction(true));
      const response = await fetch.exec();
      if (response.links) {
        setLinks(response.links);
      }
    } finally {
      props.dispatch(networkAction(false));
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

  const removeItemAt = (index) => {
    const arrayToRemoveComponentFrom = Array.from(links);
    arrayToRemoveComponentFrom.splice(index, 1);

    setLinks(arrayToRemoveComponentFrom);
  };

  return (
    <Grid item container xs direction="column" spacing={1}>
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

NavigationLinks.propTypes = {
  auth: authProps,
  dispatch: PropTypes.func.isRequired,
  address: addressProps,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  address: state.address,
});

const mapDispatchToProps = (dispatch) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(NavigationLinks);
