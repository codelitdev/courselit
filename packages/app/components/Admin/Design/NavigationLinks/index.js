import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import NavigationLinkItem from "./NavigationLinkItem";
import { Button } from "@material-ui/core";
import { ADD_NEW_LINK_BUTTON } from "../../../../config/strings";
import FetchBuilder from "../../../../lib/fetch";
import { connect } from "react-redux";
import { authProps, addressProps } from "../../../../types";
import { networkAction } from "../../../../redux/actions";

const NavigationLinks = (props) => {
  const [links, setLinks] = useState([]);

  useEffect(() => {
    getNavigationLinks();
  }, []);

  const getNavigationLinks = async () => {
    const query = `
        query {
            links: getNavigation {
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
    <>
      {links.map((link, index) => (
        <NavigationLinkItem
          key={link.destination}
          index={index}
          link={link}
          removeItem={removeItemAt}
        />
      ))}
      <Button variant="contained" onClick={addEmptyLinkItem}>
        {ADD_NEW_LINK_BUTTON}
      </Button>
    </>
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
