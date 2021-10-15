import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Button, GridListTileBar } from "@material-ui/core";
import {
  USERS_MANAGER_PAGE_HEADING,
  LOAD_MORE_TEXT,
  HEADER_EDITING_USER,
} from "../../../config/strings.js";
import FetchBuilder from "../../../lib/fetch.js";
import { connect } from "react-redux";
import { addressProps, authProps, profileProps } from "../../../types.js";
import { networkAction } from "../../../redux/actions.js";
import { OverviewAndDetail } from "@courselit/components-library";
import dynamic from "next/dynamic";
import { makeStyles } from "@material-ui/styles";
const Img = dynamic(() => import("../../Img"));
const Details = dynamic(() => import("./Details.js"));

const useStyles = makeStyles((theme) => ({
  btn: {
    width: "100%",
    height: "100%",
  },
}));

const UsersManager = ({ auth, address, dispatch, profile }) => {
  const [usersPaginationOffset, setUsersPaginationOffset] = useState(1);
  const [users, setUsers] = useState([]);
  const [componentsMap, setComponentsMap] = useState([]);
  const classes = useStyles();

  useEffect(() => {
    loadUsers();
  }, [usersPaginationOffset]);

  const loadUsers = async () => {
    const query = `
    query {
      users: getSiteUsers(searchData: {
        offset: ${usersPaginationOffset}
      }) {
        id,
        name,
        userId,
        email
      }
    }
    `;
    const fetch = new FetchBuilder()
      .setUrl(`${address.backend}/graph`)
      .setPayload(query)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(auth.token)
      .build();
    try {
      dispatch(networkAction(true));
      const response = await fetch.exec();
      if (response.users && response.users.length > 0) {
        setUsers([...users, ...response.users]);
        setUsersPaginationOffset(usersPaginationOffset + 1);
      }
    } catch (err) {
    } finally {
      dispatch(networkAction(false));
    }
  };

  useEffect(() => {
    const map = [];
    users.map((user) => {
      map.push(getComponent(user));
    });
    map.push({
      Overview: (
        <Button variant="outlined" className={classes.btn} onClick={loadUsers}>
          {LOAD_MORE_TEXT}
        </Button>
      ),
    });
    setComponentsMap(map);
  }, [usersPaginationOffset]);

  const getComponent = (user) => ({
    subtitle: HEADER_EDITING_USER,
    Overview: (
      <>
        <Img src={""} isThumbnail={true} />
        <GridListTileBar
          title={`${user.name ? user.name : user.email}${
            profile.email === user.email ? " (You)" : ""
          }`}
        />
      </>
    ),
    Detail: <Details userId={user.userId} />,
  });

  return (
    <OverviewAndDetail
      title={USERS_MANAGER_PAGE_HEADING}
      componentsMap={componentsMap}
    />
  );
};

UsersManager.propTypes = {
  auth: authProps,
  dispatch: PropTypes.func.isRequired,
  address: addressProps,
  profile: profileProps,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  address: state.address,
  profile: state.profile,
});

const mapDispatchToProps = (dispatch) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(UsersManager);
